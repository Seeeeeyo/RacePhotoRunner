from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from sqlalchemy import func
import json

from app.database import get_db
from app.schemas.event import Event, EventCreate, EventUpdate, EventSummary
from app.utils.auth import get_current_active_user, get_current_admin_user

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
        event_dict = {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "location": event.location,
            "slug": event.slug,
            "photo_count": photo_count
        }
        events.append(event_dict)
    
    return events


@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED)
async def create_event(
    request: Request,
    # Temporarily comment out for debugging
    # event: EventCreate,
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
    
    # Log request headers
    logger.info("Request headers:")
    for header, value in request.headers.items():
        logger.info(f"{header}: {value}")
    
    # Log request body
    body_bytes = await request.body()
    logger.info(f"Raw request body: {body_bytes}")
    
    # Try to parse if it's JSON
    try:
        content_type = request.headers.get("content-type", "")
        logger.info(f"Content-Type: {content_type}")
        
        if "application/json" in content_type:
            event_data = await request.json()
            logger.info(f"Parsed JSON data: {event_data}")
        elif "multipart/form-data" in content_type:
            form = await request.form()
            event_data = {}
            for key, value in form.items():
                event_data[key] = value
            logger.info(f"Parsed form data: {event_data}")
        else:
            logger.info("Unknown content type, trying to parse body as text")
            body_text = body_bytes.decode('utf-8')
            logger.info(f"Body as text: {body_text}")
            return {"error": "Invalid content type", "received": content_type}
    except Exception as e:
        logger.error(f"Error parsing request body: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid request format: {str(e)}")
    
    try:
        # Extract the data from the form
        name = event_data.get("name")
        date_str = event_data.get("date")
        location = event_data.get("location")
        description = event_data.get("description")
        is_active_str = event_data.get("is_active", "true")
        slug = event_data.get("slug")
        
        logger.info(f"Extracted data: name={name}, date={date_str}, location={location}, "
                   f"description={description}, is_active={is_active_str}, slug={slug}")
        
        # Validate required fields
        if not name or not date_str or not location or not slug:
            missing = []
            if not name: missing.append("name")
            if not date_str: missing.append("date")
            if not location: missing.append("location")
            if not slug: missing.append("slug")
            error_detail = f"Missing required fields: {', '.join(missing)}"
            logger.error(error_detail)
            raise HTTPException(status_code=422, detail=error_detail)
        
        # Convert date string to datetime
        from datetime import datetime
        try:
            date = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError:
            logger.error(f"Invalid date format: {date_str}")
            raise HTTPException(status_code=422, detail=f"Invalid date format: {date_str}")
        
        # Convert is_active to boolean
        is_active = is_active_str.lower() == "true"
        
        # Create the event in the database
        from app.models.event import Event as EventModel
        
        new_event = EventModel(
            name=name,
            date=date,
            location=location,
            description=description,
            is_active=is_active,
            slug=slug
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
    
    return {
        "id": event.id,
        "name": event.name,
        "date": event.date,
        "location": event.location,
        "description": event.description,
        "is_active": event.is_active,
        "slug": event.slug,
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
