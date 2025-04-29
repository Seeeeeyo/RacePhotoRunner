import os
import sys

# Add the parent directory to the path so we can import the app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine
# Import models to ensure they're registered with the Base
from app.models.event import Event
from app.models.photo import Photo
from app.models.user import User

def reset_database():
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    
    # Recreate all tables
    Base.metadata.create_all(bind=engine)
    
    print("Database has been reset. Tables dropped and recreated.")

if __name__ == "__main__":
    confirmation = input("This will delete all data in the database. Continue? (y/n): ")
    if confirmation.lower() == 'y':
        reset_database()
    else:
        print("Operation cancelled.") 