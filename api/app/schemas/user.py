from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    username: str
    is_active: bool = True


# Properties to receive via API when creating a user
class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


# Properties to receive via API when updating a user
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


# Properties shared by models stored in DB
class UserInDBBase(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Properties to return via API
class User(UserInDBBase):
    pass


# Properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str


# Token schema
class Token(BaseModel):
    access_token: str
    token_type: str


# Token payload
class TokenPayload(BaseModel):
    sub: Optional[str] = None
