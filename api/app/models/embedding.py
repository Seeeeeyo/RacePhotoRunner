from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import json # For storing bbox as JSON string initially, or use separate Float columns

from app.database import Base

class PersonEmbedding(Base):
    __tablename__ = "person_embeddings"

    id = Column(Integer, primary_key=True, index=True) # Unique ID for this embedding record
    
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True, index=True) # Denormalized for easier querying
    photographer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True) # Denormalized

    # Bounding box coordinates from YOLO
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)

    # Link to the FAISS index
    # This ID corresponds to the 0-based index of the vector in the FAISS index file.
    faiss_id = Column(Integer, nullable=False, index=True, unique=True)

    # The actual CLIP embedding will be stored in FAISS.
    # We might store a reference or an ID here if needed, or rely on row order.
    # For now, we'll assume metadata is linked to FAISS by order or a separate mapping.
    # faiss_index_id = Column(Integer, nullable=True, unique=True) # Optional: if we assign specific IDs in FAISS

    clip_embedding_model_version = Column(String, nullable=True) # e.g., "ViT-B/32"
    detection_model_version = Column(String, nullable=True) # e.g., "yolov8n"
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now()) # When the embedding was created/updated
    processing_time_ms = Column(Float, nullable=True) # Time taken to generate this specific embedding

    # Relationships
    photo = relationship("Photo") # Avoids back_populates if Photo doesn't need a direct list of embeddings
    event = relationship("Event")
    photographer = relationship("User")

# If Photo model needs a direct link back:
# from app.models.photo import Photo
# Photo.person_embeddings = relationship("PersonEmbedding", back_populates="photo")

# If Event model needs a direct link back:
# from app.models.event import Event
# Event.person_embeddings = relationship("PersonEmbedding", back_populates="event")

# If User model needs a direct link back:
# from app.models.user import User
# User.person_embeddings = relationship("PersonEmbedding", back_populates="photographer") 