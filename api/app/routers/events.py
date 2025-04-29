from fastapi import APIRouter, Depends, HTTPException, status, Request, Body, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from sqlalchemy import func
import json
import os
import uuid
from datetime import datetime

from app.database import get_db
from app.schemas.event import Event, EventCreate, EventUpdate, EventSummary
from app.utils.auth import get_current_active_user, get_current_admin_user
from app.utils.file import is_valid_image, save_upload_file

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/", response_model=List[EventSummary])
def read_events(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """
    Get all active events (public endpoint)
    """
    from app.models.event import Event as EventModel
    from app.models.photo import Photo
    
    # Query events and photo counts
    query = db.query(
        EventModel, 
        func.count(Photo.id).label("photo_count")
    ).outerjoin(
        Photo, EventModel.id == Photo.event_id
    ).filter(
        EventModel.is_active == True
    ).group_by(
        EventModel.id
    ).offset(skip).limit(limit)
    
    results = query.all()
    
    # Format the results as EventSummary objects
    events = []
    for event, photo_count in results:
        cover_image_url = event.cover_image_path if event.cover_image_path else None
        
        event_dict = {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "location": event.location,
            "slug": event.slug,
            "photo_count": photo_count,
            "cover_image_url": cover_image_url
        }
        events.append(event_dict)
    
    return events


@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(
    name: str = Form(...),
    date: str = Form(...),
    location: str = Form(...),
    description: Optional[str] = Form(None),
    is_active: bool = Form(True),
    slug: str = Form(...),
    cover_image: Optional[UploadFile] = File(None),
    # Temporarily comment out for debugging
    # current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new event (admin only) - Auth temporarily disabled for development
    """
    # Debug logging
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    try:
        # Validate required fields
        if not name or not date or not location or not slug:
            missing = []
            if not name: missing.append("name")
            if not date: missing.append("date")
            if not location: missing.append("location")
            if not slug: missing.append("slug")
            error_detail = f"Missing required fields: {', '.join(missing)}"
            logger.error(error_detail)
            raise HTTPException(status_code=422, detail=error_detail)
        
        # Convert date string to datetime
        try:
            date_obj = datetime.fromisoformat(date.replace("Z", "+00:00"))
        except ValueError:
            logger.error(f"Invalid date format: {date}")
            raise HTTPException(status_code=422, detail=f"Invalid date format: {date}")
        
        # Process cover image if provided
        cover_image_path = None
        if cover_image:
            # Check if the file is a valid image
            if not is_valid_image(cover_image.filename):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cover image is not a valid image. Supported formats: .jpg, .jpeg, .png"
                )
            
            # Create events/covers directory if it doesn't exist
            os.makedirs("uploads/events/covers", exist_ok=True)
            
            # Generate unique filename
            unique_id = str(uuid.uuid4())
            file_extension = os.path.splitext(cover_image.filename)[1]
            image_filename = f"{unique_id}{file_extension}"
            
            # Define path
            cover_image_path = f"/uploads/events/covers/{image_filename}"
            
            # Save file to disk
            file_path = f"uploads/events/covers/{image_filename}"
            with open(file_path, "wb") as f:
                content = await cover_image.read()
                f.write(content)
            
            logger.info(f"Cover image saved to {file_path}")
        
        # Create the event in the database
        from app.models.event import Event as EventModel
        
        new_event = EventModel(
            name=name,
            date=date_obj,
            location=location,
            description=description,
            is_active=is_active,
            slug=slug,
            cover_image_path=cover_image_path
        )
        
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        
        logger.info(f"Event created successfully: {new_event.id}")
        
        return {
            "id": new_event.id,
            "name": new_event.name,
            "date": new_event.date,
            "location": new_event.location,
            "description": new_event.description,
            "is_active": new_event.is_active,
            "slug": new_event.slug,
            "cover_image_path": new_event.cover_image_path,
            "cover_image_url": new_event.cover_image_path,
            "created_at": new_event.created_at.isoformat() if new_event.created_at else None,
            "updated_at": new_event.updated_at.isoformat() if new_event.updated_at else None,
            "photo_count": 0
        }
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error creating event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating event: {str(e)}")


@router.get("/{event_id}", response_model=Event)
def read_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific event by ID (public endpoint)
    """
    from app.models.event import Event as EventModel
    from app.models.photo import Photo
    
    # Get event and photo count
    query = db.query(
        EventModel, 
        func.count(Photo.id).label("photo_count")
    ).outerjoin(
        Photo, EventModel.id == Photo.event_id
    ).filter(
        EventModel.id == event_id,
        EventModel.is_active == True
    ).group_by(
        EventModel.id
    )
    
    result = query.first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event, photo_count = result
    
    # Return event with photo count and cover image URL
    return {
        "id": event.id,
        "name": event.name,
        "date": event.date,
        "location": event.location,
        "description": event.description,
        "is_active": event.is_active,
        "slug": event.slug,
        "cover_image_path": event.cover_image_path,
        "cover_image_url": event.cover_image_path,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "updated_at": event.updated_at.isoformat() if event.updated_at else None,
        "photo_count": photo_count
    }


@router.get("/{event_id}/photos", response_model=List[Dict])
def read_event_photos(
    event_id: int,
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    """
    Get photos for a specific event (public endpoint)
    """
    from app.models.event import Event as EventModel
    from app.models.photo import Photo
    
    # Check if event exists
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Query photos for this event
    photos = db.query(Photo).filter(
        Photo.event_id == event_id,
        Photo.is_public == True
    ).offset(skip).limit(limit).all()
    
    # Format the results
    result = []
    for photo in photos:
        result.append({
            "id": photo.id,
            "thumbnail_path": photo.thumbnail_path,
            "path": photo.path,
            "bib_numbers": photo.bib_numbers.split(",") if photo.bib_numbers else [],
            "timestamp": photo.timestamp
        })
    
    return result


@router.put("/{event_id}", response_model=Event)
async def update_event(
    event_id: int,
    name: Optional[str] = Form(None),
    date: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    slug: Optional[str] = Form(None),
    cover_image: Optional[UploadFile] = File(None),
    # Temporarily comment out for debugging
    # current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing event (admin only)
    """
    # Get existing event
    from app.models.event import Event as EventModel
    from app.models.photo import Photo
    
    event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Update fields if provided
    if name is not None:
        event.name = name
    if date is not None:
        try:
            event.date = datetime.fromisoformat(date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid date format: {date}")
    if location is not None:
        event.location = location
    if description is not None:
        event.description = description
    if is_active is not None:
        event.is_active = is_active
    if slug is not None:
        event.slug = slug

    # Handle cover image update
    if cover_image:
        # Delete old cover image if it exists
        if event.cover_image_path and os.path.exists(event.cover_image_path.lstrip("/")):
            try:
                os.remove(event.cover_image_path.lstrip("/"))
            except OSError:
                pass  # Ignore if file doesn't exist

        # Check if the file is a valid image
        if not is_valid_image(cover_image.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cover image is not a valid image. Supported formats: .jpg, .jpeg, .png"
            )
        
        # Create events/covers directory if it doesn't exist
        os.makedirs("uploads/events/covers", exist_ok=True)
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(cover_image.filename)[1]
        image_filename = f"{unique_id}{file_extension}"
        
        # Define path
        cover_image_path = f"/uploads/events/covers/{image_filename}"
        
        # Save file to disk
        file_path = f"uploads/events/covers/{image_filename}"
        with open(file_path, "wb") as f:
            content = await cover_image.read()
            f.write(content)
        
        event.cover_image_path = cover_image_path

    try:
        db.commit()
        db.refresh(event)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    # Get photo count
    photo_count = db.query(func.count(Photo.id)).filter(Photo.event_id == event.id).scalar()

    return {
        "id": event.id,
        "name": event.name,
        "date": event.date,
        "location": event.location,
        "description": event.description,
        "is_active": event.is_active,
        "slug": event.slug,
        "cover_image_path": event.cover_image_path,
        "cover_image_url": event.cover_image_path,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "updated_at": event.updated_at.isoformat() if event.updated_at else None,
        "photo_count": photo_count
    }
