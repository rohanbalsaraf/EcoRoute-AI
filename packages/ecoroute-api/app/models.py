from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Clerk User ID
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    api_keys = relationship("APIKey", back_populates="user")
    saved_routes = relationship("SavedRoute", back_populates="user")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    lemon_squeezy_customer_id = Column(String, nullable=True)
    tier = Column(String, default="free") # 'free', 'pro'
    status = Column(String, default="active") # 'active', 'past_due', 'canceled'
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="subscription")

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, default="Default Key")
    # We only store the hashed key in the database for security
    hashed_key = Column(String, unique=True, index=True)
    # Store the prefix or last 4 chars for display in the dashboard
    display_key = Column(String) 
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="api_keys")

class SavedRoute(Base):
    __tablename__ = "saved_routes"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    origin_lat = Column(Float)
    origin_lon = Column(Float)
    dest_lat = Column(Float)
    dest_lon = Column(Float)
    vehicle = Column(String)
    green_co2 = Column(String) # Store as string for simplicity or float
    green_dist = Column(String)
    green_time = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="saved_routes")
