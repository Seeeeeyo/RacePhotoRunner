from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base

class EventPhotographerPrice(Base):
    __tablename__ = "event_photographer_prices"

    event_id = Column(Integer, ForeignKey("events.id"), primary_key=True)
    photographer_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    price_per_photo = Column(Integer, nullable=False) # Price in cents

    # Relationships (optional but can be useful)
    event = relationship("Event")
    photographer = relationship("User")

    # Ensure a photographer can only set one price per event
    __table_args__ = (UniqueConstraint('event_id', 'photographer_id', name='uq_event_photographer_price'),)

# Add relationships back to User and Event if needed (optional)
# from app.models.user import User
# from app.models.event import Event
# User.event_prices = relationship("EventPhotographerPrice", back_populates="photographer")
# Event.photographer_prices = relationship("EventPhotographerPrice", back_populates="event") 