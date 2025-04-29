from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.database import engine, Base
from app.routers import auth, users, events, photos, bib_detection, admin

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RacePhotoRunner API",
    description="API for race photo management platform",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(photos.router, prefix="/api")
app.include_router(bib_detection.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# Ensure upload directories exist
os.makedirs("uploads/photos", exist_ok=True)
os.makedirs("uploads/thumbnails", exist_ok=True)

# Mount uploads directory for static file serving
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to RacePhotoRunner API"}
