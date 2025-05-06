from sqlalchemy import Column, Integer, Float, ForeignKey
from app.database import Base

class EventPhotographerPrice(Base):
    __tablename__ = "event_photographer_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    photographer_id = Column(Integer, ForeignKey("users.id"))
    price = Column(Float)