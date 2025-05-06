import os
import shutil
from typing import List
from fastapi import UploadFile
from PIL import Image
import uuid
import json

# Constants
UPLOAD_DIR = "uploads/photos"
THUMBNAIL_DIR = "uploads/thumbnails"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg"}
THUMBNAIL_SIZE = (300, 300)


def get_file_extension(filename: str) -> str:
    """Get the file extension from a filename."""
    return os.path.splitext(filename)[1].lower()


def is_valid_image(filename: str) -> bool:
    """Check if the file has a valid image extension."""
    extension = get_file_extension(filename)
    return extension in ALLOWED_EXTENSIONS


async def save_upload_file(upload_file: UploadFile, event_id: int) -> str:
    """Save an uploaded file to the upload directory."""
    # Create a unique filename
    extension = get_file_extension(upload_file.filename)
    unique_filename = f"{uuid.uuid4()}{extension}"
    
    # Create event directory if it doesn't exist
    event_dir = os.path.join(UPLOAD_DIR, str(event_id))
    os.makedirs(event_dir, exist_ok=True)
    
    # Define file path
    file_path = os.path.join(event_dir, unique_filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    # Create thumbnail
    thumbnail_path = create_thumbnail(file_path, event_id)
    
    return file_path, thumbnail_path


def create_thumbnail(file_path: str, event_id: int) -> str:
    """Create a thumbnail for an image file."""
    # Get the filename from the path
    filename = os.path.basename(file_path)
    
    # Create event thumbnail directory if it doesn't exist
    thumbnail_event_dir = os.path.join(THUMBNAIL_DIR, str(event_id))
    os.makedirs(thumbnail_event_dir, exist_ok=True)
    
    # Define thumbnail path
    thumbnail_path = os.path.join(thumbnail_event_dir, filename)
    
    # Open the image and create thumbnail
    with Image.open(file_path) as img:
        img.thumbnail(THUMBNAIL_SIZE)
        img.save(thumbnail_path)
    
    return thumbnail_path


def delete_file(file_path: str) -> bool:
    """Delete a file from the filesystem."""
    if os.path.exists(file_path):
        os.remove(file_path)
        return True
    return False


def save_json_metadata(data: dict, directory: str, filename: str) -> str:
    """Save JSON metadata to a file."""
    os.makedirs(directory, exist_ok=True)
    file_path = os.path.join(directory, filename)
    
    with open(file_path, 'w') as f:
        json.dump(data, f)
    
    return file_path


def load_json_metadata(file_path: str) -> dict:
    """Load JSON metadata from a file."""
    if not os.path.exists(file_path):
        return {}
        
    with open(file_path, 'r') as f:
        return json.load(f)
