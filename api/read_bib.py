import os
import cv2
import numpy as np
from ultralytics import YOLO
import pytesseract
from PIL import Image
import re
import time
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BibReader:
    def __init__(self, model_path='best.pt', confidence_threshold=0.25, debug=False):
        """
        Initialize the BibReader with a YOLO model for bib detection.
        
        Args:
            model_path: Path to the YOLO model weights
            confidence_threshold: Minimum confidence score for bib detection
            debug: Whether to save debug images and log extra information
        """
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.debug = debug
        
        # Create debug directory if needed
        if self.debug:
            os.makedirs("debug_images", exist_ok=True)
            logger.info(f"Debug mode enabled. Images will be saved to debug_images/")
        
        # Configure Tesseract (adjust path if necessary)
        # For Windows, you might need: pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        
    def preprocess_for_ocr(self, img):
        """
        Preprocess the image to improve OCR accuracy.
        
        Args:
            img: Image to preprocess (numpy array)
            
        Returns:
            Preprocessed image
        """
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding to get black text on white background
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Invert the image (white text on black background)
        thresh = cv2.bitwise_not(thresh)
        
        return thresh
    
    def clean_bib_number(self, text):
        """
        Clean the OCR result to extract valid bib numbers.
        
        Args:
            text: OCR text result
            
        Returns:
            Cleaned bib number
        """
        # Remove non-numeric characters
        digits_only = re.sub(r'\D', '', text)
        
        # If we have digits, return them
        if digits_only:
            return digits_only
        
        return None
        
    def read_bib(self, image_path):
        """
        Detect and read bib numbers from an image.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            List of detected bib numbers
        """
        # Ensure the image exists
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        # Load the image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to load image: {image_path}")
        
        # Debug: Save a copy of the input image
        if self.debug:
            timestamp = int(time.time())
            filename = os.path.basename(image_path)
            debug_img_path = f"debug_images/pre_inference_{timestamp}_{filename}"
            cv2.imwrite(debug_img_path, img)
            logger.info(f"Saved pre-inference image to {debug_img_path}")
            logger.info(f"Image shape: {img.shape}, dtype: {img.dtype}")
            
            # Log model information
            logger.info(f"Model path: {self.model.model.pt_path}")
            logger.info(f"Confidence threshold: {self.confidence_threshold}")
        
        # Run YOLO detection using the same parameters as the command line
        # task=detect mode=predict conf=0.25 save=True
        results = self.model.predict(
            source=img,
            conf=self.confidence_threshold,
            save=self.debug,  # Save results if in debug mode
            save_txt=self.debug,  # Save result labels if in debug mode
            project="debug_images" if self.debug else None,
            name=f"detect_{timestamp}" if self.debug else None,
        )
        
        # Debug: Log detection results
        if self.debug:
            boxes_detected = len(results[0].boxes)
            logger.info(f"YOLO detection found {boxes_detected} boxes with confidence >= {self.confidence_threshold}")
            
            # No need to save annotated image as it's done by YOLO predict with save=True
            logger.info(f"Saved detection results to debug_images/detect_{timestamp}/")
        
        bib_numbers = []
        
        # Process each detection
        for result in results:
            boxes = result.boxes
            for i, box in enumerate(boxes):
                # Get coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # Debug: log each box
                if self.debug:
                    logger.info(f"Box {i+1}: coordinates=({x1},{y1},{x2},{y2}), confidence={float(box.conf):.2f}")
                
                # Crop the bib region
                bib_region = img[y1:y2, x1:x2]
                
                # Skip if the cropped region is empty
                if bib_region.size == 0:
                    if self.debug:
                        logger.warning(f"Box {i+1}: Empty region, skipping")
                    continue
                
                # Debug: Save cropped region
                if self.debug:
                    crop_path = f"debug_images/crop_{timestamp}_{i}_{filename}"
                    cv2.imwrite(crop_path, bib_region)
                    logger.info(f"Saved cropped region to {crop_path}")
                
                # Preprocess for OCR
                processed_bib = self.preprocess_for_ocr(bib_region)
                
                # Debug: Save processed region
                if self.debug:
                    proc_path = f"debug_images/processed_{timestamp}_{i}_{filename}"
                    cv2.imwrite(proc_path, processed_bib)
                    logger.info(f"Saved processed region to {proc_path}")
                
                # Perform OCR
                text = pytesseract.image_to_string(
                    Image.fromarray(processed_bib), 
                    config='--psm 7 --oem 3 -c tessedit_char_whitelist=0123456789'
                )
                
                # Debug: Log OCR result
                if self.debug:
                    logger.info(f"Box {i+1}: OCR raw result: '{text.strip()}'")
                
                # Clean the result
                bib_number = self.clean_bib_number(text)
                if bib_number:
                    if self.debug:
                        logger.info(f"Box {i+1}: Detected bib number: {bib_number}")
                    
                    bib_numbers.append({
                        'bib_number': bib_number,
                        'confidence': float(box.conf),
                        'box': [int(x1), int(y1), int(x2), int(y2)]
                    })
                elif self.debug:
                    logger.warning(f"Box {i+1}: No valid bib number detected in OCR result")
        
        if self.debug:
            logger.info(f"Total bib numbers detected: {len(bib_numbers)}")
        
        return bib_numbers

    def read_bibs_from_directory(self, directory_path):
        """
        Process all images in a directory.
        
        Args:
            directory_path: Path to directory containing images
            
        Returns:
            Dictionary mapping image filenames to detected bib numbers
        """
        results = {}
        
        for filename in os.listdir(directory_path):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                image_path = os.path.join(directory_path, filename)
                try:
                    bib_numbers = self.read_bib(image_path)
                    results[filename] = bib_numbers
                except Exception as e:
                    results[filename] = {'error': str(e)}
        
        return results

# Example usage
if __name__ == "__main__":
    # Initialize the bib reader
    bib_reader = BibReader(model_path='best.pt', confidence_threshold=0.25, debug=True)
    
    # Test on a single image
    result = bib_reader.read_bib("test.jpg")
    print(f"Detected bib numbers: {result}")
    
    # Or process a directory of images
    # results = bib_reader.read_bibs_from_directory("path/to/images")
    # print(results)
