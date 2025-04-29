import sys
import os
from datetime import datetime
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the path so we can import the app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.event import Event
from app.database import Base, engine

def create_db_and_tables():
    Base.metadata.create_all(bind=engine)

def seed_events():
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Check if events already exist
        existing_events = db.query(Event).count()
        if existing_events > 0:
            print(f"Database already contains {existing_events} events. Skipping seeding.")
            return
            
        # Create sample events
        events = [
            Event(
                name="Boston Marathon 2024",
                date=datetime.strptime("2024-04-15", "%Y-%m-%d"),
                location="Boston, MA",
                description="The world's oldest annual marathon, a prestigious race attracting top athletes from around the globe.",
                is_active=True,
                slug="boston-marathon-2024",
                created_at=func.now()
            ),
            Event(
                name="NYC Half Marathon",
                date=datetime.strptime("2024-03-17", "%Y-%m-%d"),
                location="New York, NY",
                description="A 13.1-mile journey through the streets of Manhattan, showcasing the city's diverse neighborhoods and iconic landmarks.",
                is_active=True,
                slug="nyc-half-marathon-2024",
                created_at=func.now()
            )
        ]
        
        # Add events to the database
        for event in events:
            db.add(event)
        
        # Commit the changes
        db.commit()
        
        print(f"Successfully added {len(events)} events to the database.")
    
    except Exception as e:
        db.rollback()
        print(f"Error seeding the database: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    create_db_and_tables()
    seed_events() 