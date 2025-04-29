import sys
import os
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the path so we can import the app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.event import Event
from app.database import engine

def verify_events():
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Query all events
        events = db.query(Event).all()
        
        print(f"Found {len(events)} events in the database:")
        for event in events:
            print(f"ID: {event.id}")
            print(f"Name: {event.name}")
            print(f"Date: {event.date}")
            print(f"Location: {event.location}")
            print(f"Description: {event.description}")
            print(f"Slug: {event.slug}")
            print(f"Is Active: {event.is_active}")
            print(f"Created At: {event.created_at}")
            print(f"Updated At: {event.updated_at}")
            print("-" * 50)
    
    except Exception as e:
        print(f"Error querying the database: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    verify_events() 