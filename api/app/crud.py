from .models import User, Event, Photo, EventPhotographerPrice # Added EventPhotographerPrice
from .schemas import UserCreate, EventCreate, PhotoCreate # Assuming schemas exist
from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext

# --- User CRUD ---
def get_user(db: Session, user_id: str):
    """Gets a user by their ID (assuming ID column stores Clerk user_id/sub)."""
    # Adjust filter if your primary key or Clerk ID column is different
    # IMPORTANT: Ensure User.id column type matches clerk_user_id type (string? int?)
    # Also ensure the import `from . import models` and `from sqlalchemy.orm import Session` are present
    return db.query(models.User).filter(models.User.id == user_id).first()

# --- Event CRUD ---
def get_event(db: Session, event_id: int):
    return db.query(models.Event).filter(models.Event.id == event_id).first()

def get_event_by_slug(db: Session, slug: str):
    return db.query(models.Event).filter(models.Event.slug == slug).first()

def get_events(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Event).offset(skip).limit(limit).all()

def create_event(db: Session, event: schemas.EventCreate):
    """Creates an Event record from the EventCreate schema."""
    # Exclude price_per_photo as it's not a direct column on Event model
    event_data = event.model_dump(exclude={"price_per_photo"})
    db_event = models.Event(**event_data)
    db.add(db_event)
    try:
        db.commit()
        db.refresh(db_event)
        return db_event
    except Exception as e:
        db.rollback()
        print(f"Error creating event in CRUD: {e}") # Add logging
        # Check for duplicate slug specifically if using PostgreSQL/MySQL
        # For SQLite, the commit might just fail generally
        if "UNIQUE constraint failed: events.slug" in str(e):
            return None # Signal duplicate slug
        raise # Re-raise other commit errors

# ... other existing event crud functions ...

# --- Photo CRUD ---
# ... existing photo crud functions ...

# --- EventPhotographerPrice CRUD ---

def get_event_photographer_price(db: Session, event_id: int, photographer_id: int):
    return db.query(EventPhotographerPrice).filter(
        EventPhotographerPrice.event_id == event_id,
        EventPhotographerPrice.photographer_id == photographer_id
    ).first()

def create_event_photographer_price(db: Session, event_id: int, photographer_id: int, price: int):
    db_price = EventPhotographerPrice(
        event_id=event_id,
        photographer_id=photographer_id,
        price_per_photo=price
    )
    db.add(db_price)
    db.commit()
    db.refresh(db_price)
    return db_price

def update_event_photographer_price(db: Session, event_id: int, photographer_id: int, price: int):
    db_price = get_event_photographer_price(db, event_id=event_id, photographer_id=photographer_id)
    if db_price:
        db_price.price_per_photo = price
        db.commit()
        db.refresh(db_price)
    return db_price

def create_or_update_event_photographer_price(db: Session, event_id: int, photographer_id: int, price: int):
    db_price = get_event_photographer_price(db, event_id=event_id, photographer_id=photographer_id)
    if db_price:
        return update_event_photographer_price(db, event_id=event_id, photographer_id=photographer_id, price=price)
    else:
        return create_event_photographer_price(db, event_id=event_id, photographer_id=photographer_id, price=price) 