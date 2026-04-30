import os
from fastapi import Depends, HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, APIKey, Subscription
import bcrypt
from pydantic import BaseModel

security = HTTPBearer()
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

class UserSchema(BaseModel):
    id: str
    email: str

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    # In a real app, verify the JWT locally using Clerk's JWKS
    if not token or token == "invalid":
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    return UserSchema(id="user_123", email="dev@example.com")

async def verify_api_key(
    api_key: str = Security(HTTPBearer()), 
    db: Session = Depends(get_db)
):
    """Verifies external developer API keys against the database."""
    token = api_key.credentials
    
    # We will search by the exact hashed key using a simple lookup since
    # hashing an API key directly (e.g. SHA256) is better for indexing.
    # However, since we installed bcrypt, if we use bcrypt we have to check all keys 
    # for a user, or we can hash the API key using SHA256 before storing to allow DB indexing.
    # For high-performance API key lookups, standard SHA256 hashing is typically used
    # over bcrypt because bcrypt is intentionally slow and prevents DB indexing.
    
    import hashlib
    hashed_token = hashlib.sha256(token.encode()).hexdigest()
    
    db_api_key = db.query(APIKey).filter(APIKey.hashed_key == hashed_token, APIKey.is_active == True).first()
    
    if not db_api_key:
        raise HTTPException(status_code=403, detail="Invalid or revoked API Key")
        
    # Get user's subscription tier
    sub = db.query(Subscription).filter(Subscription.user_id == db_api_key.user_id).first()
    tier = sub.tier if sub and sub.status == "active" else "free"
    
    return {"user_id": db_api_key.user_id, "tier": tier}
