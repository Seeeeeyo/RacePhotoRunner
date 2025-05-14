from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
import logging # Added

# --- Early Logging Configuration (adjust as needed) ---
# This ensures loggers in other modules will output if not configured elsewhere.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__) # Logger for this main module

# Load environment variables from .env file
load_dotenv()

from app.database import engine, Base
from app.routers import auth, users, events, photos, bib_detection, admin, payments, photographer
from app.utils.faiss_utils import get_faiss_index # Added for FAISS index loading

# Create tables if they don't exist
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RacePhotoRunner API",
    description="API for race photo management platform",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"], # Include multiple origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]  # Add this to expose headers for file downloads
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(photos.router, prefix="/api")
app.include_router(bib_detection.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(photographer.router, prefix="/api")

# Ensure upload directories exist
os.makedirs("uploads/photos", exist_ok=True)
os.makedirs("uploads/thumbnails", exist_ok=True)
# Ensure FAISS data directory exists (though faiss_utils also does this)
os.makedirs("data/embeddings", exist_ok=True) 

# Mount uploads directory for static file serving
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to RacePhotoRunner API"}

# --- Startup Event Handler ---
@app.on_event("startup")
async def startup_event():
    logger.info("Application startup: Initializing resources...")
    # Load or initialize the FAISS index
    faiss_index = get_faiss_index()
    if faiss_index is not None:
        logger.info(f"FAISS index loaded/initialized successfully. Index contains {faiss_index.ntotal} vectors.")
    else:
        logger.error("FAISS index could not be loaded or initialized. Search functionality might be affected.")
    
    # You can add other startup tasks here, e.g., DB connection checks (though Depends handles this per request)
    logger.info("Application startup complete.")
