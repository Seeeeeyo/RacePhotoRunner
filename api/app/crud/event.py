from sqlalchemy.orm import Session
from app.models.event import Event as EventModel
from app.schemas.event import EventCreate

def create_event(db: Session, event: EventCreate):
    """Create a new event"""
    # Create a dict of values excluding price_per_photo (which belongs in a relationship table)
    event_data = event.model_dump()
    
    # Remove non-model fields
    if 'price_per_photo' in event_data:
        event_data.pop('price_per_photo')
    
    # Create the event with filtered data
    db_event = EventModel(**event_data)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def get_event(db: Session, event_id: int):
    """Get a single event by ID"""
    return db.query(EventModel).filter(EventModel.id == event_id).first()

def create_event_photographer_price(db: Session, event_id: int, photographer_id: int, price: float):
    """Create price entry for photographer-event relationship"""
    # Add your price model implementation here
    # Example:
    from app.models.event_photographer_price import EventPhotographerPrice
    price_entry = EventPhotographerPrice(
        event_id=event_id,
        photographer_id=photographer_id,
        price=price
    )
    db.add(price_entry)
    db.commit()
    db.refresh(price_entry)
    return price_entry