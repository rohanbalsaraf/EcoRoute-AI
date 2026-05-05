import os
import requests
from jose import jwt
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, APIKey, Subscription
from pydantic import BaseModel
from typing import Optional

from fastapi.security import APIKeyHeader

security = HTTPBearer()
api_key_header = APIKeyHeader(name="X-API-Key")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
# Use the Frontend API URL from Clerk Dashboard (e.g., https://liked-manatee-55.clerk.accounts.dev)
CLERK_ISSUER_URL = os.getenv("CLERK_ISSUER_URL", "https://liked-manatee-55.clerk.accounts.dev").rstrip("/")
JWKS_URL = f"{CLERK_ISSUER_URL}/.well-known/jwks.json"

class UserSchema(BaseModel):
    id: str
    email: Optional[str] = None

# Cache for JWKS
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        try:
            response = requests.get(JWKS_URL)
            response.raise_for_status()
            _jwks_cache = response.json()
        except Exception as e:
            print(f"Error fetching JWKS: {e}")
            raise HTTPException(status_code=500, detail="Could not verify authentication")
    return _jwks_cache

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    try:
        jwks = get_jwks()
        # Decode and verify the JWT
        # In a real Clerk token, the 'azp' or 'iss' will match your app
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={
                "verify_aud": False,
                "verify_iss": False # Allow flexibility with Clerk subdomains
            }
        )
        
        user_id = payload.get("sub")
        email = payload.get("email") # Note: email might be in extra claims or needs a sync
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token claims")
            
        # Verify user exists in our DB (Priority 2 will handle automatic creation)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # If user sync hasn't happened yet, we might want to create a stub
            # but usually the webhook handles this. For now, let's just return the schema.
            return UserSchema(id=user_id, email=email)
            
        return UserSchema(id=user.id, email=user.email)
        
    except Exception as e:
        print(f"JWT Verification failed: {e}")
        # If JWKS failed once, clear cache to retry on next request
        global _jwks_cache
        _jwks_cache = None
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def verify_api_key(
    api_key: str = Security(api_key_header), 
    db: Session = Depends(get_db)
):
    """Verifies external developer API keys against the database."""
    token = api_key
    
    # We will search by the exact hashed key using a simple lookup since
    # hashing an API key directly (e.g. SHA256) is better for indexing.
    # However, since we installed bcrypt, if we use bcrypt we have to check all keys 
    # for a user, or we can hash the API key using SHA256 before storing to allow DB indexing.
    # For high-performance API key lookups, standard SHA256 hashing is typically used
    # over bcrypt because bcrypt is intentionally slow and prevents DB indexing.
    
    import hashlib
    hashed_token = hashlib.sha256(token.encode()).hexdigest()
    
    db_api_key = db.query(APIKey).filter(APIKey.hashed_key == hashed_token, APIKey.is_active).first()
    
    if not db_api_key:
        raise HTTPException(status_code=403, detail="Invalid or revoked API Key")
        
    # Get user's subscription tier
    sub = db.query(Subscription).filter(Subscription.user_id == db_api_key.user_id).first()
    tier = sub.tier if sub and sub.status == "active" else "free"
    
    return {"user_id": db_api_key.user_id, "tier": tier}
