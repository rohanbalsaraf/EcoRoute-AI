import hmac
import hashlib
import os
import time
import redis
import json
from fastapi import FastAPI, Depends, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .auth import get_current_user, verify_api_key, UserSchema
from .database import get_db
from .models import User, Subscription
from .graph_store import graph, init_graph

app = FastAPI(
    title="EcoRoute API",
    description="Carbon-aware routing API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://eco-route-ai-amber.vercel.app",
        "https://ecoroute.example.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LEMON_SQUEEZY_WEBHOOK_SECRET = os.getenv("LEMON_SQUEEZY_WEBHOOK_SECRET", "your_secret_here")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Attempt to initialize Redis client, fallback to in-memory dict if unavailable
redis_client = None
in_memory_rate_limit = {}

try:
    _redis = redis.from_url(REDIS_URL, decode_responses=True)
    _redis.ping()
    redis_client = _redis
    print("Connected to Redis for rate limiting.")
except redis.exceptions.ConnectionError:
    print("Redis not available. Falling back to in-memory rate limiting for development.")

# Rate Limiting configuration
RATE_LIMITS = {
    "free": {"requests": 100, "window": 86400}, # 100 per day
    "pro": {"requests": 10000, "window": 86400} # 10000 per day
}

async def rate_limit(request: Request, api_key_data: dict = Depends(verify_api_key)):
    user_id = api_key_data["user_id"]
    tier = api_key_data["tier"]
    
    limits = RATE_LIMITS.get(tier, RATE_LIMITS["free"])
    limit = limits["requests"]
    window = limits["window"]
    
    current_day = int(time.time() // window)
    redis_key = f"rate_limit:{user_id}:{current_day}"
    
    current_usage = 0
    if redis_client:
        current_usage = redis_client.incr(redis_key)
        if current_usage == 1:
            redis_client.expire(redis_key, window)
    else:
        # Fallback to in-memory dictionary
        if redis_key not in in_memory_rate_limit:
            in_memory_rate_limit[redis_key] = 0
        in_memory_rate_limit[redis_key] += 1
        current_usage = in_memory_rate_limit[redis_key]
        
    if current_usage > limit:
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded for tier '{tier}'. Maximum {limit} requests per day."
        )
        
    return api_key_data

@app.post("/v1/webhooks/lemonsqueezy")
async def lemonsqueezy_webhook(
    request: Request, 
    x_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """Handles incoming webhooks from Lemon Squeezy."""
    if not x_signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    raw_body = await request.body()
    
    # Verify the signature
    secret = LEMON_SQUEEZY_WEBHOOK_SECRET.encode('utf-8')
    digest = hmac.new(secret, raw_body, hashlib.sha256).hexdigest()
    
    if not hmac.compare_digest(digest, x_signature):
        print(f"Signature Mismatch - Expected: {digest}, Received: {x_signature}")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = await request.json()
    event_name = data.get("meta", {}).get("event_name")
    
    print(f"Received Lemon Squeezy Event: {event_name}")
    
    # Extract data from the webhook payload
    obj_data = data.get("data", {})
    attrs = obj_data.get("attributes", {})
    customer_id = str(attrs.get("customer_id"))
    
    # Custom data you pass during checkout creation in Next.js
    custom_data = data.get("meta", {}).get("custom_data", {})
    user_id = custom_data.get("user_id") 

    if not user_id:
        print("Warning: Webhook received but no user_id found in custom_data")
        return {"status": "ignored"}

    # Find or create the user in our DB (in case they haven't logged in yet but checked out)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id, email=attrs.get("user_email", f"unknown_{user_id}@example.com"))
        db.add(user)
        db.commit()

    # Find or create subscription
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        sub = Subscription(user_id=user_id, lemon_squeezy_customer_id=customer_id)
        db.add(sub)
    
    sub.lemon_squeezy_customer_id = customer_id

    # Handle specific events to update tier
    if event_name in ["subscription_created", "subscription_updated"]:
        status = attrs.get("status")
        if status in ["active", "on_trial"]:
            sub.tier = "pro"
            sub.status = "active"
            
    elif event_name in ["subscription_cancelled", "subscription_expired", "subscription_payment_failed"]:
        sub.tier = "free"
        sub.status = "canceled" if event_name == "subscription_cancelled" else "past_due"
        
    db.commit()

    return {"status": "success"}

@app.on_event("startup")
async def startup_event():
    init_graph()

@app.get("/")
def read_root():
    return {"message": "Welcome to the EcoRoute API", "version": "1.0.0"}

from pydantic import BaseModel

class RouteRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    vehicle: str = "petrol"

@app.post("/v1/routes", dependencies=[Depends(rate_limit)])
def calculate_route(request: RouteRequest):
    if not graph:
        raise HTTPException(status_code=503, detail="Routing engine not initialized")

    try:
        # 1. Map GPS coordinates to nearest graph nodes
        start_node = graph.nearest_node(request.origin_lat, request.origin_lon)
        end_node = graph.nearest_node(request.dest_lat, request.dest_lon)

        # 2. Call the Rust engine
        import ecoroute_core
        routes_json = ecoroute_core.calculate_routes(graph, start_node, end_node, request.vehicle)
        routes_data = json.loads(routes_json)

        return {
            "origin": {"lat": request.origin_lat, "lon": request.origin_lon, "node_id": start_node},
            "destination": {"lat": request.dest_lat, "lon": request.dest_lon, "node_id": end_node},
            "vehicle": request.vehicle,
            "routes": routes_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/internal/dashboard/stats", dependencies=[Depends(get_current_user)])
def get_dashboard_stats(user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    """Internal endpoint used by the Next.js frontend to show user's API usage."""
    
    # For a real implementation, you might sum the usage directly from Redis
    current_day = int(time.time() // 86400)
    redis_key = f"rate_limit:{user.id}:{current_day}"
    
    usage_count = 0
    if redis_client:
        usage = redis_client.get(redis_key)
        usage_count = int(usage) if usage else 0
    else:
        usage_count = in_memory_rate_limit.get(redis_key, 0)
    
    # Get user's tier
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    tier = sub.tier if sub and sub.status == "active" else "free"
    
    return {
        "user_id": user.id,
        "api_calls_this_month": usage_count, # Simplified for demo, normally tracked per month
        "tier": tier.capitalize(),
        "limit": RATE_LIMITS.get(tier, RATE_LIMITS["free"])["requests"]
    }

@app.post("/internal/dashboard/api-keys", dependencies=[Depends(get_current_user)])
def create_api_key(name: str = "Default Key", user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generates a new API key for the user."""
    import secrets
    from .models import APIKey
    
    # Check if user exists in DB, create if not
    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        db_user = User(id=user.id, email=user.email)
        db.add(db_user)
        db.commit()

    # Generate a cryptographically secure token
    raw_token = f"ecoroute_live_{secrets.token_urlsafe(32)}"
    
    # Hash for storage
    hashed_token = hashlib.sha256(raw_token.encode()).hexdigest()
    
    # Prefix for display
    display_key = f"{raw_token[:18]}...{raw_token[-4:]}"
    
    new_key = APIKey(
        user_id=user.id,
        name=name,
        hashed_key=hashed_token,
        display_key=display_key
    )
    
    db.add(new_key)
    db.commit()
    
    return {
        "message": "API key generated successfully. This is the only time you will see the full key.",
        "api_key": raw_token,
        "display_key": display_key
    }

@app.get("/internal/dashboard/api-keys", dependencies=[Depends(get_current_user)])
def list_api_keys(user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lists the user's API keys (display versions only)."""
    from .models import APIKey
    keys = db.query(APIKey).filter(APIKey.user_id == user.id, APIKey.is_active == True).all()
    return [{"id": k.id, "name": k.name, "display_key": k.display_key, "is_active": k.is_active, "created_at": k.created_at} for k in keys]

@app.delete("/internal/dashboard/api-keys/{key_id}", dependencies=[Depends(get_current_user)])
def revoke_api_key(key_id: str, user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revokes a specific API key for the user."""
    from .models import APIKey
    db_key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.user_id == user.id).first()
    
    if not db_key:
        raise HTTPException(status_code=404, detail="API key not found")
        
    db_key.is_active = False
    db.commit()
    
    return {"message": "API key revoked successfully"}
