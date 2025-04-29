import sys
import os
import shutil
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import sessionmaker
from PIL import Image
import json

# Add the parent directory to the path so we can import the app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.photo import Photo
from app.models.event import Event
from app.database import Base, engine

def create_thumbnail(source_path, target_path, size=(300, 300)):
    """Create a thumbnail of the image"""
    with Image.open(source_path) as img:
        img.thumbnail(size)
        img.save(target_path)

def seed_photos():
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get the events from the database
        events = db.query(Event).all()
        if not events:
            print("No events found in the database. Please seed events first.")
            return
            
        # Get Boston Marathon and NYC Half Marathon events
        boston_marathon = next((e for e in events if e.name == "Boston Marathon 2024"), None)
        nyc_half_marathon = next((e for e in events if e.name == "NYC Half Marathon"), None)
        
        if not boston_marathon or not nyc_half_marathon:
            print("Required events not found. Please seed events first.")
            return
            
        # Check if upload directories exist, create if they don't
        photos_dir = "uploads/photos"
        thumbnails_dir = "uploads/thumbnails"
        os.makedirs(photos_dir, exist_ok=True)
        os.makedirs(thumbnails_dir, exist_ok=True)
        
        # Get the list of sample photos from the pics directory
        pics_dir = "../pics"
        pic_files = [f for f in os.listdir(pics_dir) if f.endswith('.jpg')]
        
        # Check if photos already exist in database
        existing_photos = db.query(Photo).count()
        if existing_photos > 0:
            print(f"Database already contains {existing_photos} photos. Skipping seeding.")
            return
            
        print(f"Found {len(pic_files)} sample photos. Adding to database...")
        
        # Assign first half to Boston Marathon, second half to NYC Half Marathon
        boston_pics = pic_files[:len(pic_files)//2]
        nyc_pics = pic_files[len(pic_files)//2:]
        
        # Add Boston Marathon photos
        boston_photos = []
        boston_date = boston_marathon.date
        for i, pic in enumerate(boston_pics):
            # Generate a random timestamp during the event day
            random_hours = random.randint(6, 12)  # Between 6am and noon
            random_minutes = random.randint(0, 59)
            random_seconds = random.randint(0, 59)
            timestamp = datetime.combine(
                boston_date.date(),
                datetime.min.time()
            ) + timedelta(hours=random_hours, minutes=random_minutes, seconds=random_seconds)
            
            # Copy the file to uploads directory
            source_path = os.path.join(pics_dir, pic)
            dest_filename = f"boston_marathon_{i+1}_{pic}"
            dest_path = os.path.join(photos_dir, dest_filename)
            shutil.copy2(source_path, dest_path)
            
            # Create thumbnail
            thumb_filename = f"thumb_{dest_filename}"
            thumb_path = os.path.join(thumbnails_dir, thumb_filename)
            create_thumbnail(source_path, thumb_path)
            
            # Create a sample metadata
            metadata = {
                "camera": "Canon EOS 5D Mark IV",
                "lens": "70-200mm f/2.8",
                "settings": {
                    "iso": random.choice([100, 200, 400, 800]),
                    "aperture": random.choice(["f/2.8", "f/4.0", "f/5.6"]),
                    "shutter_speed": random.choice(["1/500", "1/1000", "1/2000"])
                },
                "location": "Boston Marathon Course"
            }
            
            # Create photo record
            bib_numbers = ",".join([str(random.randint(1000, 9999)) for _ in range(random.randint(1, 3))])
            
            photo = Photo(
                event_id=boston_marathon.id,
                filename=dest_filename,
                path=dest_path,
                thumbnail_path=thumb_path,
                bib_numbers=bib_numbers,
                has_face=True,
                photo_metadata=json.dumps(metadata),
                timestamp=timestamp,
                is_public=True
            )
            boston_photos.append(photo)
        
        # Add NYC Half Marathon photos
        nyc_photos = []
        nyc_date = nyc_half_marathon.date
        for i, pic in enumerate(nyc_pics):
            # Generate a random timestamp during the event day
            random_hours = random.randint(7, 11)  # Between 7am and 11am
            random_minutes = random.randint(0, 59)
            random_seconds = random.randint(0, 59)
            timestamp = datetime.combine(
                nyc_date.date(),
                datetime.min.time()
            ) + timedelta(hours=random_hours, minutes=random_minutes, seconds=random_seconds)
            
            # Copy the file to uploads directory
            source_path = os.path.join(pics_dir, pic)
            dest_filename = f"nyc_half_{i+1}_{pic}"
            dest_path = os.path.join(photos_dir, dest_filename)
            shutil.copy2(source_path, dest_path)
            
            # Create thumbnail
            thumb_filename = f"thumb_{dest_filename}"
            thumb_path = os.path.join(thumbnails_dir, thumb_filename)
            create_thumbnail(source_path, thumb_path)
            
            # Create a sample metadata
            metadata = {
                "camera": "Nikon D850",
                "lens": "24-70mm f/2.8",
                "settings": {
                    "iso": random.choice([100, 200, 400, 800]),
                    "aperture": random.choice(["f/2.8", "f/4.0", "f/5.6"]),
                    "shutter_speed": random.choice(["1/500", "1/1000", "1/2000"])
                },
                "location": "NYC Half Marathon Course"
            }
            
            # Create photo record
            bib_numbers = ",".join([str(random.randint(1000, 9999)) for _ in range(random.randint(1, 3))])
            
            photo = Photo(
                event_id=nyc_half_marathon.id,
                filename=dest_filename,
                path=dest_path,
                thumbnail_path=thumb_path,
                bib_numbers=bib_numbers,
                has_face=True,
                photo_metadata=json.dumps(metadata),
                timestamp=timestamp,
                is_public=True
            )
            nyc_photos.append(photo)
        
        # Add all photos to the database
        for photo in boston_photos + nyc_photos:
            db.add(photo)
        
        # Commit the changes
        db.commit()
        
        print(f"Successfully added {len(boston_photos)} photos to Boston Marathon.")
        print(f"Successfully added {len(nyc_photos)} photos to NYC Half Marathon.")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding the database: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    seed_photos() 