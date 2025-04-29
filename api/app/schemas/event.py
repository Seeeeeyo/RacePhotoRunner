from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Shared properties
class EventBase(BaseModel):
    name: str
    date: datetime
    location: str
    description: Optional[str] = None
    is_active: bool = True
    slug: str


# Properties to receive via API when creating an event
class EventCreate(EventBase):
    pass


# Properties to receive via API when updating an event
class EventUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    slug: Optional[str] = None


# Properties shared by models stored in DB
class EventInDBBase(EventBase):
    id: int
    cover_image_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Properties to return via API
class Event(EventInDBBase):
    photo_count: Optional[int] = 0
    cover_image_url: Optional[str] = None


# Properties stored in DB
class EventInDB(EventInDBBase):
    pass


# For listing events with minimal info
class EventSummary(BaseModel):
    id: int
    name: str
    date: datetime
    location: str
    slug: str
    photo_count: int
    cover_image_url: Optional[str] = None

    class Config:
        from_attributes = True
