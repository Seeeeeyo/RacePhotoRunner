from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta

from app.database import get_db
from app.models.event import Event
from app.models.photo import Photo
from app.models.user import User
from app.utils.auth import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_admin_stats(
    # Temporarily disable auth for development
    # current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get admin dashboard statistics (admin only) - Auth temporarily disabled for development
    """
    # Count total events
    total_events = db.query(func.count(Event.id)).scalar() or 0
    
    # Count total photos
    total_photos = db.query(func.count(Photo.id)).scalar() or 0
    
    # Get searches today
    # Note: This assumes you have a searches table. If not, you'll need to adapt this.
    # For now, we'll just return a placeholder value
    # In a real app, you would query something like:
    # today = datetime.utcnow().date()
    # searches_today = db.query(func.count(SearchLog.id)).filter(
    #     func.date(SearchLog.created_at) == today
    # ).scalar() or 0
    
    # For now, let's create a placeholder value based on current date
    # This is just for demonstration - replace with actual DB query in production
    today = datetime.utcnow().date()
    day_of_year = today.timetuple().tm_yday
    searches_today = (day_of_year % 50) + 10  # Random-ish number between 10-59
    
    return {
        "total_events": total_events,
        "total_photos": total_photos,
        "searches_today": searches_today,
        # You can add more stats as needed
        "users_count": db.query(func.count(User.id)).scalar() or 0,
        "admins_count": db.query(func.count(User.id)).filter(User.is_admin == True).scalar() or 0,
    }


@router.get("/recent-activity")
def get_recent_activity(
    # Temporarily disable auth for development
    # current_user = Depends(get_current_admin_user),
    days: int = 7,
    db: Session = Depends(get_db)
):
    """
    Get recent activity for admin dashboard (admin only) - Auth temporarily disabled for development
    """
    # Get activity from the last X days
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get recent uploads
    recent_uploads = db.query(
        Photo, Event.name.label("event_name")
    ).join(
        Event, Photo.event_id == Event.id
    ).filter(
        Photo.created_at >= start_date
    ).order_by(
        Photo.created_at.desc()
    ).limit(5).all()
    
    # Get recent events
    recent_events = db.query(Event).filter(
        Event.created_at >= start_date
    ).order_by(
        Event.created_at.desc()
    ).limit(5).all()
    
    # Format the activity data
    activity = []
    
    # Add uploads to activity feed
    for photo, event_name in recent_uploads:
        activity.append({
            "type": "photo_upload",
            "description": f"New photo uploaded to {event_name}",
            "timestamp": photo.created_at.isoformat(),
            "event_id": photo.event_id,
            "photo_id": photo.id
        })
    
    # Add events to activity feed
    for event in recent_events:
        activity.append({
            "type": "event_created",
            "description": f"New event created: {event.name}",
            "timestamp": event.created_at.isoformat(),
            "event_id": event.id
        })
    
    # Sort by timestamp (newest first)
    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return activity[:10]  # Return top 10 activities 