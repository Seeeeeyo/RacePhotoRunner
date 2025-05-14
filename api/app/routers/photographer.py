from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime # Added for mock data

from app.database import get_db
from app.schemas.event import EventSummary
from app.utils.auth import get_current_active_user
from app.models.user import User as UserModel
from app.models.event import Event as EventModel
from app.models.event_photographer_price import EventPhotographerPrice as EventPhotographerPriceModel
from app.models.photo import Photo as PhotoModel
from sqlalchemy import func

router = APIRouter(
    prefix="/photographer",
    tags=["photographer"],
    responses={404: {"description": "Not found"}},
)

@router.get("/ping")
async def ping_photographer_router():
    print("DEBUG: /api/photographer/ping called")
    return {"message": "Photographer router is active!"}

@router.get("/events", response_model=List[EventSummary])
def get_photographer_events(
    db: Session = Depends(get_db),
    claims: Dict[str, Any] = Depends(get_current_active_user)
):
    """
    Get all events associated with the currently authenticated photographer.
    (Temporarily returning mock data for debugging)
    """
    clerk_user_id = claims.get('sub')
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID missing from token claims")

    # --- START MOCK DATA --- 
    print(f"DEBUG: /api/photographer/events called by clerk_user_id: {clerk_user_id}")
    mock_events_summary: List[EventSummary] = [
        EventSummary(
            id=1,
            name="Mock Event Alpha",
            date=datetime.utcnow(), # Or a fixed string like "2023-01-01T00:00:00Z"
            location="Mockville",
            slug="mock-event-alpha",
            photo_count=10,
            cover_image_url="/uploads/events/covers/mock_alpha.jpg"
        ),
        EventSummary(
            id=2,
            name="Mock Event Beta",
            date=datetime.utcnow(), # Or a fixed string like "2023-02-01T00:00:00Z"
            location="Testburg",
            slug="mock-event-beta",
            photo_count=25,
            cover_image_url="/uploads/events/covers/mock_beta.jpg"
        )
    ]
    return mock_events_summary
    # --- END MOCK DATA ---

    # current_user = db.query(UserModel).filter(UserModel.clerk_id == clerk_user_id).first()
    # if not current_user:
    #     raise HTTPException(status_code=404, detail="Photographer user not found in local DB")

    # if current_user.role != 'photographer':
    #     raise HTTPException(status_code=403, detail="User is not a photographer")

    # results = (
    #     db.query(
    #         EventModel,
    #         func.count(PhotoModel.id).label("photo_count")
    #     )
    #     .join(EventPhotographerPriceModel, EventModel.id == EventPhotographerPriceModel.event_id)
    #     .outerjoin(PhotoModel, EventModel.id == PhotoModel.event_id)
    #     .filter(EventPhotographerPriceModel.photographer_id == current_user.id)
    #     .group_by(EventModel.id)
    #     .all()
    # )
    
    # events_summary: List[EventSummary] = []
    # for event, photo_count in results:
    #     events_summary.append(
    #         EventSummary(
    #             id=event.id,
    #             name=event.name,
    #             date=event.date,
    #             location=event.location,
    #             slug=event.slug,
    #             photo_count=photo_count,
    #             cover_image_url=event.cover_image_path
    #         )
    #     )
    
    # return events_summary 