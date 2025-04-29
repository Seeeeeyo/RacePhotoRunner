import sys
import os
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the path so we can import the app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.photo import Photo
from app.models.event import Event
from app.database import engine

def verify_photos():
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Query all events
        events = db.query(Event).all()
        
        for event in events:
            # Query photos for this event
            photos = db.query(Photo).filter(Photo.event_id == event.id).all()
            
            print(f"Event: {event.name}")
            print(f"Photos: {len(photos)}")
            
            for i, photo in enumerate(photos):
                if i < 3:  # Show details for first 3 photos only to avoid too much output
                    print(f"  Photo {i+1}:")
                    print(f"    ID: {photo.id}")
                    print(f"    Filename: {photo.filename}")
                    print(f"    Path: {photo.path}")
                    print(f"    Thumbnail: {photo.thumbnail_path}")
                    print(f"    Bib numbers: {photo.bib_numbers}")
                    print(f"    Has face: {photo.has_face}")
                    print(f"    Timestamp: {photo.timestamp}")
            
            print("-" * 50)
    
    except Exception as e:
        print(f"Error querying the database: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    verify_photos() 