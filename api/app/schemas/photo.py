from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Shared properties
class PhotoBase(BaseModel):
    event_id: int
    filename: str
    path: str
    thumbnail_path: str
    bib_numbers: Optional[str] = None
    has_face: bool = False
    face_embedding_path: Optional[str] = None
    body_embedding_path: Optional[str] = None
    photo_metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    is_public: bool = True


# Properties to receive via API when creating a photo
class PhotoCreate(BaseModel):
    event_id: int
    filename: str
    path: str
    thumbnail_path: str
    bib_numbers: Optional[str] = None
    has_face: bool = False
    photo_metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None


# Properties to receive via API when updating a photo
class PhotoUpdate(BaseModel):
    event_id: Optional[int] = None
    bib_numbers: Optional[str] = None
    has_face: Optional[bool] = None
    face_embedding_path: Optional[str] = None
    body_embedding_path: Optional[str] = None
    photo_metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    is_public: Optional[bool] = None


# Properties shared by models stored in DB
class PhotoInDBBase(PhotoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Properties to return via API
class Photo(PhotoInDBBase):
    pass


# Properties stored in DB
class PhotoInDB(PhotoInDBBase):
    pass


# For listing photos with minimal info
class PhotoSummary(BaseModel):
    id: int
    event_id: int
    thumbnail_path: str
    bib_numbers: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


# For search results
class PhotoSearchResult(BaseModel):
    id: int
    event_id: int
    thumbnail_path: str
    path: str
    bib_numbers: Optional[str] = None
    score: Optional[float] = None  # Similarity score for vector searches

    class Config:
        from_attributes = True
