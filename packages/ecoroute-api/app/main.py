import hmac
import hashlib
import os
import time
import redis
import json
import sentry_sdk
from fastapi import FastAPI, Depends, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Initialize Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

from .auth import get_current_user, verify_api_key, UserSchema
from .database import get_db
from .models import User, Subscription
from . import graph_store
from .webhooks import router as webhooks_router

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

app.include_router(webhooks_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    graph_store.init_graph()

@app.get("/")
def read_root():
    return {"message": "Welcome to the EcoRoute API", "version": "1.0.0"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """System health check for monitoring."""
    status = {
        "status": "operational",
        "timestamp": time.time(),
        "services": {
            "database": "connected",
            "redis": "connected" if redis_client else "offline",
            "routing_engine": "operational" if graph_store.graph else "initializing"
        }
    }
    
    # 1. Check DB
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception:
        status["services"]["database"] = "unreachable"
        status["status"] = "degraded"
        
    # 2. Check Redis
    if not redis_client:
        status["status"] = "degraded"
        
    # 3. Check Engine
    if not graph_store.graph:
        status["status"] = "degraded"
        
    return status

from pydantic import BaseModel

class RouteRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    vehicle: str = "petrol"

@app.post("/v1/routes", dependencies=[Depends(rate_limit)])
def calculate_route(request: RouteRequest, api_key_data: dict = Depends(verify_api_key)):
    if not graph_store.graph:
        raise HTTPException(status_code=503, detail="Routing engine not initialized")

    try:
        # 0. On-demand ingestion
        start_node_temp = graph_store.graph.nearest_node(request.origin_lat, request.origin_lon)
        lat_start, lon_start = graph_store.graph.get_node_coords(start_node_temp)
        end_node_temp = graph_store.graph.nearest_node(request.dest_lat, request.dest_lon)
        lat_end, lon_end = graph_store.graph.get_node_coords(end_node_temp)
        
        dist_sq_origin = (lat_start - request.origin_lat)**2 + (lon_start - request.origin_lon)**2
        dist_sq_dest = (lat_end - request.dest_lat)**2 + (lon_end - request.dest_lon)**2
        
        if dist_sq_origin > 0.02 or dist_sq_dest > 0.02:
            print(f"🌍 Long route or new area detected! Ingesting OSM data...")
            graph_store.update_graph_for_area(
                request.origin_lat, request.origin_lon,
                request.dest_lat, request.dest_lon
            )

        # 1. Final Snap
        start_node = graph_store.graph.nearest_node(request.origin_lat, request.origin_lon)
        end_node = graph_store.graph.nearest_node(request.dest_lat, request.dest_lon)

        # 2. Call the Rust engine
        import ecoroute_core
        try:
            routes_json = ecoroute_core.calculate_routes(graph_store.graph, start_node, end_node, request.vehicle)
        except Exception as e:
            if "No path found" in str(e):
                raise HTTPException(status_code=404, detail="No road path found between these locations in the current OSM data.")
            raise e
        routes_data = json.loads(routes_json)

        # 3. Hydrate path nodes with coordinates for mapping
        def hydrate_path(node_ids):
            coords = []
            for nid in node_ids:
                lat, lon = graph_store.graph.get_node_coords(nid)
                coords.append({"lat": lat, "lon": lon})
            return coords

        for r_type in ["greenest", "fastest", "shortest"]:
            if r_type in routes_data:
                routes_data[r_type]["path_coords"] = hydrate_path(routes_data[r_type]["path"])

        # 4. Save to database if user is authenticated
        try:
            db: Session = next(get_db())
            from .models import SavedRoute
            
            new_saved = SavedRoute(
                user_id=api_key_data["user_id"],
                origin_lat=request.origin_lat,
                origin_lon=request.origin_lon,
                dest_lat=request.dest_lat,
                dest_lon=request.dest_lon,
                vehicle=request.vehicle,
                green_co2=str(routes_data["greenest"]["co2_kg"]),
                green_dist=str(routes_data["greenest"]["distance_km"]),
                green_time=str(routes_data["greenest"]["time_min"])
            )
            db.add(new_saved)
            db.commit()
        except Exception as db_err:
            print(f"⚠️ Failed to save route to history: {db_err}")

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
    
    # Get user's tier
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    tier = sub.tier if sub and sub.status == "active" else "free"
    
    # Get usage for the last 7 days
    daily_usage = []
    for i in range(7):
        day = current_day - i
        day_key = f"rate_limit:{user.id}:{day}"
        count = 0
        if redis_client:
            val = redis_client.get(day_key)
            count = int(val) if val else 0
        else:
            count = in_memory_rate_limit.get(day_key, 0)
        
        # Format date as 'May 01'
        date_str = time.strftime("%b %d", time.localtime(day * 86400))
        daily_usage.append({"date": date_str, "calls": count})
    
    daily_usage.reverse() # Show oldest to newest
    usage_count = sum(d["calls"] for d in daily_usage)
    
    return {
        "user_id": user.id,
        "api_calls_this_month": usage_count,
        "tier": tier.capitalize(),
        "limit": RATE_LIMITS.get(tier, RATE_LIMITS["free"])["requests"],
        "daily_usage": daily_usage
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

@app.get("/internal/dashboard/history", dependencies=[Depends(get_current_user)])
def list_history(user: UserSchema = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lists the user's saved routing history."""
    from .models import SavedRoute
    history = db.query(SavedRoute).filter(SavedRoute.user_id == user.id).order_by(SavedRoute.created_at.desc()).limit(50).all()
    return history
