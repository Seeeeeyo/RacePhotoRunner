import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends, Query
from typing import List
import tempfile
from pathlib import Path

from ..dependencies import get_current_user
from ...read_bib import BibReader

router = APIRouter(
    prefix="/bib-detection",
    tags=["bib-detection"],
    responses={404: {"description": "Not found"}},
)

# Initialize BibReader (adjust path to your YOLO model)
bib_reader = None

# Lazy initialization of BibReader to ensure model is loaded only when needed
def get_bib_reader(model_path='best.pt', confidence=0.1, debug=False):
    global bib_reader
    if bib_reader is None:
        bib_reader = BibReader(model_path=model_path, confidence_threshold=confidence, debug=debug)
    return bib_reader

@router.post("/detect/")
async def detect_bibs(
    file: UploadFile = File(...),
    confidence: float = Query(0.1, description="Confidence threshold for detection (0-1)"),
    debug: bool = Query(False, description="Enable debug mode for saving intermediate images"),
    current_user = Depends(get_current_user)
):
    """
    Detect bib numbers in an uploaded image.
    """
    # Check file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Get BibReader instance
    reader = get_bib_reader(confidence=confidence, debug=debug)
    
    # Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
        # Save uploaded file to temp location
        shutil.copyfileobj(file.file, temp_file)
        temp_path = temp_file.name
    
    try:
        # Process the image
        bib_results = reader.read_bib(temp_path)
        
        response = {
            "filename": file.filename,
            "detected_bibs": bib_results
        }
        
        # Add debug information if enabled
        if debug:
            response["debug_info"] = {
                "debug_enabled": True,
                "debug_images_path": "debug_images/",
                "confidence_threshold": confidence
            }
            
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
    finally:
        # Remove temporary file
        os.unlink(temp_path)

@router.post("/batch-detect/")
async def batch_detect_bibs(
    files: List[UploadFile] = File(...),
    confidence: float = Query(0.1, description="Confidence threshold for detection (0-1)"),
    debug: bool = Query(False, description="Enable debug mode for saving intermediate images"),
    current_user = Depends(get_current_user)
):
    """
    Detect bib numbers in multiple uploaded images.
    """
    # Get BibReader instance
    reader = get_bib_reader(confidence=confidence, debug=debug)
    
    results = []
    temp_files = []
    
    try:
        # Save all files to temp location
        for file in files:
            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail=f"File {file.filename} must be an image")
            
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                shutil.copyfileobj(file.file, temp_file)
                temp_files.append((file.filename, temp_file.name))
        
        # Process each file
        for filename, temp_path in temp_files:
            try:
                bib_results = reader.read_bib(temp_path)
                results.append({
                    "filename": filename,
                    "detected_bibs": bib_results
                })
            except Exception as e:
                results.append({
                    "filename": filename,
                    "error": str(e)
                })
        
        response = {"results": results}
        
        # Add debug information if enabled
        if debug:
            response["debug_info"] = {
                "debug_enabled": True,
                "debug_images_path": "debug_images/",
                "confidence_threshold": confidence
            }
            
        return response
    finally:
        # Clean up temp files
        for _, temp_path in temp_files:
            if os.path.exists(temp_path):
                os.unlink(temp_path) 