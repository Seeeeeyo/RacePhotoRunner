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
from app import models, schemas
from app.crud import (
    get_user,
    create_event as create_event_crud,
    get_event,
    create_event_photographer_price
)
from app.models.user import User

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


@router.post("/", response_model=Event)
def create_event(
    *, # Force keyword arguments
    db: Session = Depends(get_db),
    event_in: EventCreate, # Use the updated schema
    claims: Dict[str, Any] = Depends(get_current_active_user) # Get claims from verified token
):
    """
    Create new event. The creator is assigned as the initial photographer and their price is set.
    """
    # Get user ID from claims
    clerk_user_id = claims.get('sub')
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID missing from token claims")

    # Fetch the user from your database based on Clerk ID
    # --- Assumption: You have a crud function like get_user_by_clerk_id --- 
    # --- OR you sync Clerk users to your DB and use the claims['sub'] as a key ---
    # current_user = crud.get_user_by_clerk_id(db, clerk_id=clerk_user_id) 
    # If not syncing users, you might get role from claims or need another way to link
    # For now, let's assume we fetch the user model:
    current_user = db.query(User).filter(User.clerk_id == clerk_user_id).first()

    if not current_user:
        # --- Simplified User Creation Logic ---
        try:
            # Extract user info directly from the JWT claims
            # JWT already verified through get_current_active_user
            
            # Get email from claims if available (depends on your JWT structure)
            email = claims.get('email', f"{clerk_user_id}@example.com")  # Fallback email
            
            # Get name from claims
            first_name = claims.get('first_name', '')
            last_name = claims.get('last_name', '')
            # Construct username from name or use user_id
            username = f"{first_name} {last_name}".strip() or clerk_user_id
            
            # Create new user in local DB
            new_user = User(
                clerk_id=clerk_user_id,
                email=email,
                username=username,  
                is_active=True,
                # Default to photographer since they're creating an event
                role="photographer" 
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            current_user = new_user  # Assign the newly created user
            print(f"Created new user with clerk_id {clerk_user_id}: {current_user.email}")

        except Exception as e:
            db.rollback()
            print(f"Error during user creation for Clerk ID {clerk_user_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create user record: {str(e)}")
        # --- End Simplified User Creation Logic ---


    # Ensure the user is a photographer (or admin?)
    if current_user.role not in ['photographer', 'admin']: # Adjust roles as needed
         raise HTTPException(status_code=403, detail="User does not have permission to create events")

    # Create the event using your existing CRUD function
    # Assuming crud.create_event handles the basic event creation
    db_event = create_event_crud(db=db, event=event_in)
    if not db_event:
         # Handle potential event creation failure (e.g., duplicate slug)
         raise HTTPException(status_code=400, detail="Event creation failed. Maybe the slug is already in use?")

    # Create the price entry for this photographer and event
    try:
        # Use the price from the input schema (includes default)
        price_to_set = event_in.price_per_photo
        create_event_photographer_price(
            db=db,
            event_id=db_event.id,
            photographer_id=current_user.id,
            price=price_to_set
        )
    except Exception as e:
        # If price creation fails, should we roll back event creation?
        # For now, log error and maybe raise? Or return event without price?
        print(f"Error creating price entry for event {db_event.id}, photographer {current_user.id}: {e}")
        # Optionally delete the created event if price is mandatory
        # db.delete(db_event)
        # db.commit()
        # raise HTTPException(status_code=500, detail="Failed to set initial price for the event.")
        pass # Or decide on error handling

    # Reload the event to potentially include relationships if needed by response model
    db.refresh(db_event) 
    return db_event


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
    try:
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
            # Log file information for debugging
            print(f"Cover image upload: name={cover_image.filename}, content_type={cover_image.content_type}, size={len(await cover_image.read())}")
            # Reset file position after reading for size
            await cover_image.seek(0)
            
            # Delete old cover image if it exists
            if event.cover_image_path and os.path.exists(event.cover_image_path.lstrip("/")):
                try:
                    os.remove(event.cover_image_path.lstrip("/"))
                except OSError as e:
                    print(f"Warning: Could not remove old cover image: {e}")
                    # Non-fatal, continue with upload

            # Check if the file is a valid image
            if not is_valid_image(cover_image.filename):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cover image is not a valid image. Filename: {cover_image.filename}. Supported formats: .jpg, .jpeg, .png"
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
            try:
                with open(file_path, "wb") as f:
                    content = await cover_image.read()
                    f.write(content)
                
                event.cover_image_path = cover_image_path
            except Exception as e:
                print(f"Error saving cover image: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to save cover image: {str(e)}")

        try:
            db.commit()
            db.refresh(event)
        except Exception as e:
            db.rollback()
            print(f"Database error during event update: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

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
    except HTTPException:
        # Re-raise HTTP exceptions as is
        raise
    except Exception as e:
        # Catch any other exceptions and return a 500
        print(f"Unexpected error in update_event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_user = Depends(get_current_admin_user), # Ensure only admins can delete
    db: Session = Depends(get_db)
):
    """
    Delete an event (admin only)
    """
    from app.models.event import Event as EventModel

    # Find the event
    db_event = db.query(EventModel).filter(EventModel.id == event_id).first()
    if db_event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    # TODO: Consider deleting associated photos or handling constraints
    # For now, just delete the event record
    db.delete(db_event)
    db.commit()

    return # Return None for 204 No Content


@router.post("/{event_id}/cover-image", response_model=schemas.Event)
async def upload_event_cover_image(
    event_id: int,
    cover_image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user) # Or admin
):
    """Upload or replace the cover image for an event."""
    db_event = get_event(db, event_id=event_id)
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    # TODO: Add authorization check: Does current_user own this event or is admin?
    # Example check (assuming Event model has a list of photographers or creator field):
    # if not current_user.is_admin and db_event.creator_id != current_user.id: # Adjust logic
    #    raise HTTPException(status_code=403, detail="Not authorized to update this event's cover image")

    # Delete old cover image if it exists
    if db_event.cover_image_path and os.path.exists(db_event.cover_image_path.lstrip("/")):
        try:
            os.remove(db_event.cover_image_path.lstrip("/"))
        except OSError as e:
            print(f"Error removing old cover image {db_event.cover_image_path}: {e}")
            # Non-fatal, continue with upload

    # Check if the file is a valid image
    if not is_valid_image(cover_image.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cover image is not a valid image. Supported formats: .jpg, .jpeg, .png"
        )

    # Define directory and ensure it exists
    upload_dir = "uploads/events/covers"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    unique_id = str(uuid.uuid4())
    file_extension = os.path.splitext(cover_image.filename)[1]
    image_filename = f"{unique_id}{file_extension}"

    # Define save path and URL path (relative to /uploads)
    save_path = os.path.join(upload_dir, image_filename)
    url_path = f"/events/covers/{image_filename}" # URL path starts with /

    # Save file to disk
    try:
        with open(save_path, "wb") as f:
            content = await cover_image.read()
            f.write(content)
    except Exception as e:
        print(f"Error saving cover image {save_path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save cover image.")

    # Update event record
    db_event.cover_image_path = url_path
    try:
        db.commit()
        db.refresh(db_event)
    except Exception as e:
        db.rollback()
        print(f"Error updating event cover image path in DB: {e}")
        # Attempt to delete the orphaned uploaded file
        try:
            os.remove(save_path)
        except OSError:
            pass
        raise HTTPException(status_code=500, detail="Failed to update event cover image path.")

    return db_event
