import torch
from PIL import Image
import numpy as np
from ultralytics import YOLO
import clip # from openai-clip
import os
import logging
from typing import Optional, List, Dict # Added List, Dict

from sqlalchemy.orm import Session # Added
from app.models.embedding import PersonEmbedding # Added
from app.models.photo import Photo as PhotoModel # Added, aliased to avoid clash if Photo type hint used elsewhere
from app.utils import faiss_utils # Added

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Model Loading (Global or Lazy Loaded) ---
# These can be initialized once and reused.
# Consider lazy loading if memory is a concern at startup and these are not always needed.

YOLO_MODEL_NAME = "yolov8n.pt" # Nano model for speed, can be changed
CLIP_MODEL_NAME = "ViT-B/32"
CLIP_EMBEDDING_DIM = 512 # Explicitly define dim based on CLIP_MODEL_NAME
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

try:
    yolo_model = YOLO(YOLO_MODEL_NAME)
    logger.info(f"YOLO model '{YOLO_MODEL_NAME}' loaded successfully on {getattr(yolo_model, 'device', 'cpu')}.")
except Exception as e:
    logger.error(f"Failed to load YOLO model '{YOLO_MODEL_NAME}': {e}")
    yolo_model = None

try:
    clip_model, clip_preprocess = clip.load(CLIP_MODEL_NAME, device=DEVICE)
    logger.info(f"CLIP model '{CLIP_MODEL_NAME}' loaded successfully on {DEVICE}.")
except Exception as e:
    logger.error(f"Failed to load CLIP model '{CLIP_MODEL_NAME}': {e}")
    clip_model = None
    clip_preprocess = None

# --- Person Detection ---
def detect_persons(image_path: str) -> List[Dict]: # Return type more specific
    """
    Detects persons in an image using YOLO.
    Returns: List of dicts, each with 'bbox_xywhn' (normalized) & 'confidence'.
    """
    if not yolo_model:
        logger.error("YOLO model is not loaded. Cannot detect persons.")
        return []
    if not os.path.exists(image_path):
        logger.error(f"Image path does not exist: {image_path}")
        return []
    try:
        results = yolo_model(image_path, verbose=False)
        detected_persons = []
        person_class_index = 0 # COCO class index for 'person'
        for result in results:
            for i, cls_index in enumerate(result.boxes.cls):
                if int(cls_index) == person_class_index:
                    bbox_xywhn = result.boxes.xywhn[i].cpu().numpy()
                    confidence = float(result.boxes.conf[i].cpu().numpy())
                    detected_persons.append({
                        "bbox_xywhn": bbox_xywhn.tolist(),
                        "confidence": confidence
                    })
        return detected_persons
    except Exception as e:
        logger.error(f"Error during person detection for {image_path}: {e}")
        return []

# --- Image Cropping & Embedding Generation ---
def get_clip_embedding_for_crop(image_crop: Image.Image) -> Optional[np.ndarray]:
    """
    Generates CLIP embedding for a given PIL Image crop.
    Returns: Normalized CLIP embedding vector (e.g., 512-dim) or None.
    """
    if not clip_model or not clip_preprocess:
        logger.error("CLIP model/preprocessor not loaded.")
        return None
    try:
        image_input = clip_preprocess(image_crop).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            embedding = clip_model.encode_image(image_input)
        embedding /= embedding.norm(dim=-1, keepdim=True)
        return embedding.cpu().numpy().squeeze()
    except Exception as e:
        logger.error(f"Error generating CLIP embedding for crop: {e}")
        return None

# --- Orchestrator: Process image, generate embeddings, prepare for DB --- 
# Renamed and signature changed
def generate_and_prepare_person_embeddings(
    image_path: str, 
    photo: PhotoModel, # Use the Photo SQLAlchemy model 
    db: Session
) -> int:
    """
    Orchestrates person detection, cropping, CLIP embedding generation, 
    adds embeddings to FAISS, and prepares PersonEmbedding objects for DB commit.

    Args:
        image_path (str): Path to the full image.
        photo (PhotoModel): The SQLAlchemy Photo object associated with this image.
        db (Session): The SQLAlchemy DB session.

    Returns:
        int: Count of person embeddings successfully processed and added to the DB session.
    """
    if not os.path.exists(image_path):
        logger.error(f"Image not found for processing: {image_path}")
        return 0

    # This list will temporarily hold data before creating DB objects
    # Each item: {'bbox_xywhn': [...], 'clip_embedding': np.array([...])}
    processed_persons_data = [] 

    try:
        original_image = Image.open(image_path).convert("RGB")
    except Exception as e:
        logger.error(f"Could not open or convert image {image_path}: {e}")
        return 0

    detected_persons_yolo = detect_persons(image_path)
    if not detected_persons_yolo:
        logger.info(f"No persons detected in {image_path}")
        return 0

    img_w, img_h = original_image.size

    for person_info in detected_persons_yolo:
        cx_n, cy_n, w_n, h_n = person_info['bbox_xywhn']
        abs_cx, abs_cy, abs_w, abs_h = cx_n * img_w, cy_n * img_h, w_n * img_w, h_n * img_h
        x1, y1, x2, y2 = abs_cx - abs_w / 2, abs_cy - abs_h / 2, abs_cx + abs_w / 2, abs_cy + abs_h / 2
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(img_w, x2), min(img_h, y2)

        if x2 <= x1 or y2 <= y1:
            logger.warning(f"Skipping invalid/tiny bbox after boundary clamp: {[x1,y1,x2,y2]} for {image_path}")
            continue
        try:
            person_crop = original_image.crop((x1, y1, x2, y2))
        except Exception as e:
            logger.error(f"Failed to crop image {image_path} with bbox {[x1,y1,x2,y2]}: {e}")
            continue
        if person_crop.width == 0 or person_crop.height == 0:
            logger.warning(f"Skipping zero-size crop for {image_path} with bbox {[x1,y1,x2,y2]}")
            continue
            
        embedding_vector = get_clip_embedding_for_crop(person_crop)
        if embedding_vector is not None:
            processed_persons_data.append({
                "bbox_xywhn": person_info['bbox_xywhn'], # Store the normalized bbox
                "clip_embedding": embedding_vector
            })
        else:
            logger.warning(f"Failed to generate embedding for a person in {image_path}")

    if not processed_persons_data:
        logger.info(f"No person embeddings could be generated for {image_path}")
        return 0

    # Batch add embeddings to FAISS
    all_embeddings_np = np.vstack([p_data["clip_embedding"] for p_data in processed_persons_data])
    
    # Ensure embeddings are C-contiguous and float32, as required by FAISS
    if not all_embeddings_np.flags['C_CONTIGUOUS']:
        all_embeddings_np = np.ascontiguousarray(all_embeddings_np, dtype=np.float32)
    elif all_embeddings_np.dtype != np.float32:
        all_embeddings_np = all_embeddings_np.astype(np.float32)
        
    # Normalize L2 for IndexFlatIP (cosine similarity)
    # faiss_utils.add_embeddings_to_index expects pre-normalized vectors if using IndexFlatIP for cosine.
    # CLIP embeddings from get_clip_embedding_for_crop are already normalized.
    # If they weren't, we would normalize here: faiss.normalize_L2(all_embeddings_np)

    success_faiss, faiss_ids = faiss_utils.add_embeddings_to_index(all_embeddings_np)

    if not success_faiss or faiss_ids is None or len(faiss_ids) != len(processed_persons_data):
        logger.error(f"Failed to add embeddings to FAISS or FAISS ID count mismatch for {image_path}. FAISS success: {success_faiss}, Expected: {len(processed_persons_data)}, Got: {len(faiss_ids) if faiss_ids else 'None'}")
        # Note: If FAISS add fails partially or gives inconsistent IDs, we might have an issue.
        # For now, we abort adding these embeddings to DB to prevent inconsistency.
        # A more robust solution might involve a transaction or cleanup for FAISS.
        return 0

    # Prepare PersonEmbedding DB objects
    db_embedding_objects = []
    for i, p_data in enumerate(processed_persons_data):
        bbox_x, bbox_y, bbox_w, bbox_h = p_data["bbox_xywhn"]
        db_obj = PersonEmbedding(
            photo_id=photo.id,
            event_id=photo.event_id,
            photographer_id=photo.photographer_id,
            bbox_x=float(bbox_x),
            bbox_y=float(bbox_y),
            bbox_w=float(bbox_w),
            bbox_h=float(bbox_h),
            faiss_id=faiss_ids[i], # Assign the FAISS ID
            clip_embedding_model_version=CLIP_MODEL_NAME,
            detection_model_version=YOLO_MODEL_NAME
            # processing_time_ms can be added here if timed
        )
        db_embedding_objects.append(db_obj)

    try:
        db.add_all(db_embedding_objects)
        logger.info(f"Successfully prepared {len(db_embedding_objects)} PersonEmbedding objects for DB commit for photo {photo.id}.")
        return len(db_embedding_objects)
    except Exception as e:
        logger.error(f"Error adding PersonEmbedding objects to DB session for photo {photo.id}: {e}")
        # db.rollback() might be needed here if we want to ensure this operation is atomic with others in the router
        return 0

# (Example __main__ block removed for brevity in this update, it would need adjustments for new signature)
# if __name__ == '__main__':
# Test this with a Photo object and a DB session mock or actual connection.

if __name__ == '__main__':
    # --- Example Usage (for testing this module directly) ---
    # Create a dummy image for testing if you don't have one readily available
    # Ensure you have 'ultralytics', 'torch', 'torchvision', 'openai-clip', 'Pillow', 'numpy' installed
    
    logger.info(f"Running person_clip_utils.py example using device: {DEVICE}")

    # Create a dummy uploads directory and a test image if it doesn't exist
    if not os.path.exists("uploads/photos"):
        os.makedirs("uploads/photos", exist_ok=True)
    
    test_image_path = "uploads/photos/test_image.jpg"
    
    try:
        # Try to create a simple test image if none exists
        if not os.path.exists(test_image_path):
            from PIL import Image, ImageDraw
            img = Image.new('RGB', (640, 480), color = 'red')
            # To make YOLO detect something, we'd need a more realistic image.
            # For a unit test, you'd mock YOLO responses.
            # This basic image won't have persons unless YOLO is very confused.
            # For actual testing, use a real image with people.
            # For now, just save it.
            # img.save(test_image_path)
            # logger.info(f"Created dummy test image at {test_image_path}")
            # For this example, let's assume you have an image with people at this path
            # Or point to an existing image with people:
            # test_image_path = "path/to/your/image_with_people.jpg"
            # For the script to run without a real image with persons, comment out the processing line or use an actual image.
            
            # To actually test, ensure test_image_path points to an image with people
            example_real_image = "sample_people.jpg" # Replace with a real image path
            if os.path.exists(example_real_image):
                 test_image_path = example_real_image
                 logger.info(f"Using example image: {test_image_path}")

                 # Simulate a photo upload scenario
                 processed_data = process_image_for_clip_embeddings(
                     image_path=test_image_path,
                     photo_id=123, # Example photo ID
                     event_id=1,   # Example event ID
                     photographer_id=10 # Example photographer ID
                 )

                 if processed_data:
                     logger.info(f"Successfully processed image. Found {len(processed_data)} person(s).")
                     for i, data in enumerate(processed_data):
                         logger.info(f"  Person {i+1}:")
                         logger.info(f"    Photo ID: {data['photo_id']}")
                         logger.info(f"    Event ID: {data['event_id']}")
                         logger.info(f"    BBox (xywh_norm): {[data['bbox_x'], data['bbox_y'], data['bbox_w'], data['bbox_h']]}")
                         logger.info(f"    CLIP Embedding shape: {data['clip_embedding'].shape}")
                         logger.info(f"    CLIP Model: {data['clip_embedding_model_version']}")
                         logger.info(f"    Detection Model: {data['detection_model_version']}")
                 else:
                     logger.info(f"No persons processed or an error occurred for {test_image_path}.")
            else:
                logger.warning(f"Test image '{example_real_image}' not found. Skipping processing example.")
                logger.warning("Please create an image with people and name it 'sample_people.jpg' in the API root, or update path.")

    except ImportError as ie:
        logger.error(f"Import error, make sure all dependencies are installed: {ie}")
    except Exception as e:
        logger.error(f"An error occurred in the example usage: {e}") 