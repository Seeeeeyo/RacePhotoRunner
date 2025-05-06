from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.responses import FileResponse
import os
from PIL import Image, ImageDraw, ImageFont
import io
import json

from app.database import get_db
from app.schemas.photo import Photo, PhotoCreate, PhotoUpdate, PhotoSummary, PhotoSearchResult
from app.utils.auth import get_current_active_user, get_current_admin_user
from app.utils.file import save_upload_file, is_valid_image
from app.utils.bib_detection import bib_detector

router = APIRouter(prefix="/photos", tags=["photos"])


@router.get("/", response_model=List[PhotoSummary])
def read_photos(
    event_id: Optional[int] = None,
    bib_number: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get photos with optional filtering by event or bib number
    """
    # Placeholder - This would query photos from the database
    return []


@router.post("/upload", response_model=Photo, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    event_id: int = Form(...),
    photo: UploadFile = File(...),
    # Current approach: Use clerk auth headers
    clerk_user_id: str = Form(None),  # Allow for passing clerk_user_id
    db: Session = Depends(get_db)
):
    """
    Upload a new photo - Auth temporarily handled manually to support both admin and user uploads
    """
    # Check if the file is a valid image
    if not is_valid_image(photo.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a valid image. Supported formats: .jpg, .jpeg, .png"
        )
    
    # Save the uploaded file
    from app.models.photo import Photo as PhotoModel
    from app.models.user import User as UserModel
    import os
    from datetime import datetime
    import uuid
    
    # Find a photographer_id - first look for an existing user with the clerk_id
    photographer_id = None
    if clerk_user_id:
        user = db.query(UserModel).filter(UserModel.clerk_id == clerk_user_id).first()
        if user:
            photographer_id = user.id
    
    # If no user is found, use a default admin user
    if not photographer_id:
        # Fetch the first admin or first user in the database
        admin = db.query(UserModel).filter(UserModel.role == "admin").first()
        if admin:
            photographer_id = admin.id
        else:
            # Last resort - get any user
            first_user = db.query(UserModel).first()
            if first_user:
                photographer_id = first_user.id
            else:
                # If no users exist, create a system user
                system_user = UserModel(
                    username="system",
                    email="system@example.com",
                    is_active=True,
                    role="admin"
                )
                db.add(system_user)
                db.commit()
                db.refresh(system_user)
                photographer_id = system_user.id
    
    # Create directories if they don't exist
    os.makedirs("uploads/photos", exist_ok=True)
    os.makedirs("uploads/thumbnails", exist_ok=True)
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())
    file_extension = os.path.splitext(photo.filename)[1]
    photo_filename = f"{unique_id}{file_extension}"
    
    # Define paths
    photo_path = f"/uploads/photos/{photo_filename}"
    thumbnail_path = f"/uploads/thumbnails/{photo_filename}"
    
    # Save file to disk
    file_path = f"uploads/photos/{photo_filename}"
    with open(file_path, "wb") as f:
        content = await photo.read()
        f.write(content)
    
    # Create a copy for thumbnail (in a real app, you'd resize it)
    import shutil
    shutil.copy(file_path, f"uploads/thumbnails/{photo_filename}")
    
    # Detect bib numbers using Gemini
    detected_bibs = await bib_detector.detect_bib_numbers(file_path)
    bib_numbers = ','.join(map(str, detected_bibs)) if detected_bibs else None
    
    # Create database record
    new_photo = PhotoModel(
        event_id=event_id,
        filename=photo.filename,
        path=photo_path,
        thumbnail_path=thumbnail_path,
        photographer_id=photographer_id,  # Add photographer_id
        bib_numbers=bib_numbers,
        is_public=True
    )
    
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)
    
    return {
        "id": new_photo.id,
        "event_id": new_photo.event_id,
        "filename": new_photo.filename,
        "path": new_photo.path,
        "thumbnail_path": new_photo.thumbnail_path,
        "bib_numbers": new_photo.bib_numbers,
        "has_face": new_photo.has_face,
        "face_embedding_path": new_photo.face_embedding_path,
        "body_embedding_path": new_photo.body_embedding_path,
        "metadata": new_photo.metadata,
        "timestamp": new_photo.timestamp.isoformat() if new_photo.timestamp else None,
        "is_public": new_photo.is_public,
        "created_at": new_photo.created_at.isoformat() if new_photo.created_at else None,
        "updated_at": new_photo.updated_at.isoformat() if new_photo.updated_at else None
    }


@router.get("/search", response_model=List[PhotoSearchResult])
def search_photos(
    bib_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Search photos by bib number
    """
    # Return empty array if no bib number is provided
    if not bib_number:
        return []
    
    from app.models.photo import Photo as PhotoModel
    from app.models.event import Event as EventModel
    from sqlalchemy import or_
    
    # Look for photos with this bib number
    query = db.query(PhotoModel).join(
        EventModel, PhotoModel.event_id == EventModel.id
    ).filter(
        PhotoModel.is_public == True,
        EventModel.is_active == True,
        or_(
            PhotoModel.bib_numbers.ilike(f"%{bib_number}%"),
            PhotoModel.bib_numbers == bib_number,
            PhotoModel.bib_numbers.ilike(f"{bib_number},%"),
            PhotoModel.bib_numbers.ilike(f"%,{bib_number},%"),
            PhotoModel.bib_numbers.ilike(f"%,{bib_number}")
        )
    )
    
    photos = query.all()
    
    # Format results
    results = []
    for photo in photos:
        results.append({
            "id": photo.id,
            "event_id": photo.event_id,
            "thumbnail_path": photo.thumbnail_path,
            "path": photo.path,
            "bib_numbers": photo.bib_numbers,
            "score": 1.0  # For exact matches assign score 1.0
        })
    
    # If no results, return empty list
    if not results:
        return []
        
    return results


@router.get("/watermarked/{photo_id}")
async def get_watermarked_photo(
    photo_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a photo with a watermark applied (used for previews and downloads)
    """
    from app.models.photo import Photo as PhotoModel
    
    # Get the photo from database
    photo = db.query(PhotoModel).filter(PhotoModel.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Construct the full file path
    file_path = os.path.join(os.getcwd(), photo.path.lstrip('/'))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Photo file not found")
    
    try:
        # Open the original image
        img = Image.open(file_path)
        
        # Try to load a font, fall back to default if not available
        try:
            font_size = max(img.width, img.height) // 20  # Scale font size to image
            font = ImageFont.truetype("Arial", font_size)
        except IOError:
            # Use default font if Arial is not available
            font = ImageFont.load_default()
        
        # Add watermark text
        watermark_text = "RacePhotoRunner"
        
        # Calculate text size based on font size (Pillow removed textsize in newer versions)
        text_width = int(font_size * len(watermark_text) * 0.6)
        text_height = int(font_size * 1.2)
        
        # Calculate positions for watermark (center and diagonally)
        x = (img.width - text_width) // 2
        y = (img.height - text_height) // 2
        
        # Calculate angle for diagonal watermark (rotate -30 degrees like in frontend)
        angle = -30
        
        # Convert image to RGBA if it isn't already
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Create a transparent overlay for watermark
        overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        
        # Define watermark color and transparency
        watermark_color = (255, 255, 255, 128)  # Semi-transparent white
        
        # Add shadow for better visibility
        shadow_color = (0, 0, 0, 128)  # Semi-transparent black
        
        # Draw watermark on overlay (center of image)
        overlay_draw.text((x+2, y+2), watermark_text, font=font, fill=shadow_color)
        overlay_draw.text((x, y), watermark_text, font=font, fill=watermark_color)
        
        # Rotate overlay with watermark
        rotated_overlay = overlay.rotate(angle, expand=0, center=(img.width/2, img.height/2))
        
        # Composite the overlay with the original image
        watermarked_img = Image.alpha_composite(img, rotated_overlay)
        
        # Convert back to original format if needed
        if img.format and img.format != 'PNG':
            watermarked_img = watermarked_img.convert('RGB')
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        save_format = img.format or "JPEG"
        
        # Ensure proper format conversion
        if save_format == "JPEG":
            # JPEG doesn't support alpha channel, convert to RGB
            watermarked_img = watermarked_img.convert('RGB')
            
        watermarked_img.save(buffer, format=save_format)
        buffer.seek(0)
        
        # Determine content type based on file extension
        content_type = "image/jpeg"
        if photo.path.lower().endswith(".png"):
            content_type = "image/png"
        elif photo.path.lower().endswith(".gif"):
            content_type = "image/gif"
        
        # Return the watermarked image
        return Response(
            content=buffer.read(),
            media_type=content_type,
            headers={
                "Content-Disposition": f"inline; filename={os.path.basename(photo.path)}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error applying watermark: {str(e)}")


@router.patch("/{photo_id}", response_model=Photo)
async def update_photo(
    photo_id: int,
    photo_update: PhotoUpdate,
    # Temporarily comment out auth for development
    # current_user = Depends(get_current_admin_user),  # Require admin permissions
    db: Session = Depends(get_db)
):
    """
    Update a photo's metadata (admin only) - Auth temporarily disabled for development
    """
    from app.models.photo import Photo as PhotoModel
    
    # Get the photo from database
    photo = db.query(PhotoModel).filter(PhotoModel.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Update fields if provided in the request
    if photo_update.bib_numbers is not None:
        photo.bib_numbers = photo_update.bib_numbers
    
    if photo_update.event_id is not None:
        photo.event_id = photo_update.event_id
    
    if photo_update.has_face is not None:
        photo.has_face = photo_update.has_face
    
    if photo_update.face_embedding_path is not None:
        photo.face_embedding_path = photo_update.face_embedding_path
    
    if photo_update.body_embedding_path is not None:
        photo.body_embedding_path = photo_update.body_embedding_path
    
    if photo_update.photo_metadata is not None:
        photo.photo_metadata = json.dumps(photo_update.photo_metadata)
    
    if photo_update.timestamp is not None:
        photo.timestamp = photo_update.timestamp
    
    if photo_update.is_public is not None:
        photo.is_public = photo_update.is_public
    
    # Save changes to database
    try:
        db.commit()
        db.refresh(photo)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating photo: {str(e)}")
    
    # Return updated photo
    return {
        "id": photo.id,
        "event_id": photo.event_id,
        "filename": photo.filename,
        "path": photo.path,
        "thumbnail_path": photo.thumbnail_path,
        "bib_numbers": photo.bib_numbers,
        "has_face": photo.has_face,
        "face_embedding_path": photo.face_embedding_path,
        "body_embedding_path": photo.body_embedding_path,
        "metadata": photo.photo_metadata,
        "timestamp": photo.timestamp.isoformat() if photo.timestamp else None,
        "is_public": photo.is_public,
        "created_at": photo.created_at.isoformat() if photo.created_at else None,
        "updated_at": photo.updated_at.isoformat() if photo.updated_at else None
    }


@router.post("/{photo_id}/untag", status_code=200)
async def untag_photo(
    photo_id: int,
    bib_data: dict = Body(...),
    # Temporarily comment out auth for development
    # current_user = Depends(get_current_admin_user),  # Require admin permissions
    db: Session = Depends(get_db)
):
    """
    Remove a specific bib number from a photo (admin only) - Auth temporarily disabled for development
    """
    from app.models.photo import Photo as PhotoModel
    
    # Get the photo from database
    photo = db.query(PhotoModel).filter(PhotoModel.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Get the bib number to remove
    bib_number = bib_data.get("bib_number")
    if not bib_number:
        raise HTTPException(status_code=400, detail="Bib number is required")
    
    # If photo has no bib numbers, nothing to remove
    if not photo.bib_numbers:
        return {"message": "Photo has no bib numbers"}
    
    # Convert comma-separated string to list
    bib_list = photo.bib_numbers.split(",")
    
    # Remove the specified bib number if it exists
    if bib_number in bib_list:
        bib_list.remove(bib_number)
        # Convert back to comma-separated string or None if empty
        photo.bib_numbers = ",".join(bib_list) if bib_list else None
        
        # Save changes to database
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error updating photo: {str(e)}")
        
        return {"message": f"Bib number {bib_number} removed from photo {photo_id}"}
    else:
        return {"message": f"Bib number {bib_number} not found in photo {photo_id}"}


@router.post("/reports/untag", status_code=201)
async def report_untag(
    report_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Report an incorrect bib tag for admin review (public endpoint)
    """
    # Extract report data
    photo_id = report_data.get("photo_id")
    bib_number = report_data.get("bib_number")
    reason = report_data.get("reason", "Not provided")
    
    if not photo_id or not bib_number:
        raise HTTPException(status_code=400, detail="Photo ID and bib number are required")
    
    # Log the report (in a production app, you would save to database)
    import logging
    logger = logging.getLogger("api")
    logger.info(f"Untag report received - Photo ID: {photo_id}, Bib: {bib_number}, Reason: {reason}")
    
    # Return confirmation
    return {"message": "Report received and will be reviewed by an admin"}


@router.delete("/{photo_id}", status_code=200)
async def delete_photo(
    photo_id: int,
    # Temporarily comment out auth for development
    # current_user = Depends(get_current_admin_user),  # Require admin permissions
    db: Session = Depends(get_db)
):
    """
    Delete a photo (admin only) - Auth temporarily disabled for development
    """
    from app.models.photo import Photo as PhotoModel
    
    # Get the photo from database
    photo = db.query(PhotoModel).filter(PhotoModel.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Get file paths to delete from disk
    file_paths = []
    if photo.path:
        file_paths.append(os.path.join(os.getcwd(), photo.path.lstrip('/')))
    if photo.thumbnail_path:
        file_paths.append(os.path.join(os.getcwd(), photo.thumbnail_path.lstrip('/')))
    
    # Delete from database first
    try:
        db.delete(photo)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting photo from database: {str(e)}")
    
    # Then attempt to delete files from disk
    for path in file_paths:
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                # Log error but continue (don't fail if files can't be deleted)
                print(f"Warning: Could not delete file {path}: {str(e)}")
    
    return {"message": f"Photo {photo_id} successfully deleted"}
