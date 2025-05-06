from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    filename = Column(String)
    path = Column(String)  # Local file path
    thumbnail_path = Column(String)  # Path to thumbnail
    photographer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bib_numbers = Column(String)  # Comma-separated list of detected bib numbers
    has_face = Column(Boolean, default=False)
    face_embedding_path = Column(String, nullable=True)  # Path to face embedding file
    body_embedding_path = Column(String, nullable=True)  # Path to full body CLIP embedding file
    photo_metadata = Column(Text, nullable=True)  # JSON metadata
    timestamp = Column(DateTime, nullable=True)  # When the photo was taken
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    event = relationship("Event", back_populates="photos")
    photographer = relationship("User")


# Add the reverse relationship to Event
from app.models.event import Event
Event.photos = relationship("Photo", back_populates="event", cascade="all, delete-orphan")

# Add the reverse relationship to User (optional)
from app.models.user import User
User.photos = relationship("Photo", back_populates="photographer")
