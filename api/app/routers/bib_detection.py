import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Query
from typing import List
import tempfile
from pathlib import Path

from app.utils.bib_detection import bib_detector

router = APIRouter(
    prefix="/bib-detection",
    tags=["bib-detection"],
    responses={404: {"description": "Not found"}},
)

@router.post("/detect/")
async def detect_bibs(
    file: UploadFile = File(...),
    debug: bool = Query(False, description="Enable debug mode for saving intermediate images"),
    # Temporarily comment out auth for testing
    # current_user = Depends(get_current_user)
):
    """
    Detect bib numbers in an uploaded image using Gemini Vision.
    """
    # Check file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        # Save uploaded file to temp location
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name
    
    try:
        # Process the image with Gemini
        detected_bibs = await bib_detector.detect_bib_numbers(temp_path)
        
        response = {
            "filename": file.filename,
            "detected_bibs": detected_bibs
        }
            
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
    finally:
        # Remove temporary file
        if os.path.exists(temp_path):
            os.unlink(temp_path)

@router.post("/batch-detect/")
async def batch_detect_bibs(
    files: List[UploadFile] = File(...),
    debug: bool = Query(False, description="Enable debug mode for saving intermediate images"),
    # Temporarily comment out auth for testing
    # current_user = Depends(get_current_user)
):
    """
    Detect bib numbers in multiple uploaded images using Gemini Vision.
    """
    results = []
    temp_files = []
    
    try:
        # Save all files to temp location
        for file in files:
            if not file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail=f"File {file.filename} must be an image")
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                content = await file.read()
                temp_file.write(content)
                temp_files.append((file.filename, temp_file.name))
        
        # Process each file
        for filename, temp_path in temp_files:
            try:
                detected_bibs = await bib_detector.detect_bib_numbers(temp_path)
                results.append({
                    "filename": filename,
                    "detected_bibs": detected_bibs
                })
            except Exception as e:
                results.append({
                    "filename": filename,
                    "error": str(e)
                })
        
        return {"results": results}
    finally:
        # Clean up temp files
        for _, temp_path in temp_files:
            if os.path.exists(temp_path):
                os.unlink(temp_path) 