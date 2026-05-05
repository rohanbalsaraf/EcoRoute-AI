import hashlib
import os
import time
import redis
import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

def save_route_to_history(db: Session, user_id: str, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float, vehicle: str, routes_data: dict):
    """Helper to save a search result to the database."""
    from .models import SavedRoute
    try:
        new_saved = SavedRoute(
            user_id=user_id,
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            vehicle=vehicle,
            green_co2=str(routes_data["greenest"]["total_carbon_kg"]),
            green_dist=str(routes_data["greenest"]["total_distance_km"]),
            green_time=str(routes_data["greenest"]["total_time_min"])
        )
        db.add(new_saved)
        db.commit()
    except Exception as e:
        print(f"⚠️ Failed to save history: {e}")

# Initialize Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

from .auth import get_current_user, verify_api_key, UserSchema  # noqa: E402
from .database import get_db  # noqa: E402
from .models import User, Subscription  # noqa: E402
from . import graph_store  # noqa: E402
from .webhooks import router as webhooks_router  # noqa: E402
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    graph_store.init_graph()
    yield
    # Shutdown (if needed)

app = FastAPI(
    title="EcoRoute API",
    description="Carbon-aware routing API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://eco-route-ai-.*\\.vercel\\.app",
    allow_origins=[
        "http://localhost:3000",
        "https://eco-route-ai-amber.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    origin = request.headers.get("origin")
    print(f"Incoming Request: {request.method} {request.url.path} | Origin: {origin}")
    response = await call_next(request)
    print(f"Response Status: {response.status_code}")
    return response

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

app.include_router(webhooks_router, prefix="/v1")

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


class RouteRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    vehicle: str = "petrol"

class BulkRouteRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    vehicles: List[str]

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
            print("🌍 Long route or new area detected! Ingesting OSM data...")
            graph_store.update_graph_for_area(
                request.origin_lat, request.origin_lon,
                request.dest_lat, request.dest_lon
            )

        # 1. Final Snap
        start_node = graph_store.graph.nearest_node(request.origin_lat, request.origin_lon)
        end_node = graph_store.graph.nearest_node(request.dest_lat, request.dest_lon)

        # 2. Call the Rust engine
        import ecoroute_core
        VEHICLE_MAP = {"bike": "petrol"}
        core_vehicle = VEHICLE_MAP.get(request.vehicle.lower(), request.vehicle.lower())
        try:
            routes = ecoroute_core.calculate_routes(graph_store.graph, start_node, end_node, core_vehicle)
        except Exception as e:
            if "No path found" in str(e):
                raise HTTPException(status_code=404, detail="No road path found between these locations in the current OSM data.")
            raise e
        
        # Convert native Rust object to dictionary for JSON response
        routes_data = {
            "greenest": {
                "path": routes.greenest.path,
                "total_carbon_kg": routes.greenest.total_carbon_kg,
                "total_distance_km": routes.greenest.total_distance_km,
                "total_time_min": routes.greenest.total_time_min,
            },
            "fastest": {
                "path": routes.fastest.path,
                "total_carbon_kg": routes.fastest.total_carbon_kg,
                "total_distance_km": routes.fastest.total_distance_km,
                "total_time_min": routes.fastest.total_time_min,
            },
            "shortest": {
                "path": routes.shortest.path,
                "total_carbon_kg": routes.shortest.total_carbon_kg,
                "total_distance_km": routes.shortest.total_distance_km,
                "total_time_min": routes.shortest.total_time_min,
            }
        }

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
        save_route_to_history(next(get_db()), api_key_data["user_id"], request.origin_lat, request.origin_lon, request.dest_lat, request.dest_lon, request.vehicle, routes_data)

        return {
            "origin": {"lat": request.origin_lat, "lon": request.origin_lon, "node_id": start_node},
            "destination": {"lat": request.dest_lat, "lon": request.dest_lon, "node_id": end_node},
            "vehicle": request.vehicle,
            "routes": routes_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_optional_user_id(
    authorization: str = Header(None),
    x_api_key: str = Header(None),
    db: Session = Depends(get_db)
) -> Optional[str]:
    """Resolves user ID if auth is present, otherwise returns None."""
    # 1. Try API Key
    if x_api_key:
        try:
            import hashlib
            hashed_token = hashlib.sha256(x_api_key.encode()).hexdigest()
            from .models import APIKey
            db_api_key = db.query(APIKey).filter(APIKey.hashed_key == hashed_token, APIKey.is_active).first()
            if db_api_key:
                return db_api_key.user_id
        except Exception:
            pass

    # 2. Try Clerk Token
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        if token and token != "null" and token != "undefined":
            try:
                from .auth import get_jwks, CLERK_ISSUER_URL
                payload = jwt.decode(
                    token, 
                    jwks, 
                    algorithms=["RS256"],
                    options={"verify_aud": False, "verify_iss": False}
                )
                return payload.get("sub")
            except Exception:
                pass
                
    return None

@app.post("/v1/routes/compare")
async def compare_routes(
    request: BulkRouteRequest, 
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_optional_user_id)
):
    """
    Analyzes multiple vehicles for the same route.
    Efficiently uses a single graph lookup to compare impact.
    Saves the greenest option to history.
    """
    if not graph_store.graph:
        raise HTTPException(status_code=503, detail="Routing engine not ready")

    try:
        # 1. Snap coordinates to nodes
        start_node = graph_store.graph.nearest_node(request.origin_lat, request.origin_lon)
        end_node = graph_store.graph.nearest_node(request.dest_lat, request.dest_lon)

        import ecoroute_core
        results = {}
        
        # 2. Iterate through vehicles
        VEHICLE_MAP = {"bike": "petrol"} # Map mobile 'bike' to core 'petrol'
        for vehicle in request.vehicles:
            core_vehicle = VEHICLE_MAP.get(vehicle.lower(), vehicle.lower())
            try:
                routes = ecoroute_core.calculate_routes(graph_store.graph, start_node, end_node, core_vehicle)
                
                # Format the results with distinct driving styles
                def format_route(route_obj, label, opt_for, is_eco=True):
                    carbon = route_obj.total_carbon_kg
                    # If it's a standard/fastest route, apply a 15% "Aggressive Driving" penalty 
                    # to represent non-eco-driving behavior compared to our green route.
                    if not is_eco:
                        carbon *= 1.15

                    return {
                        "label": label,
                        "optimize_for": opt_for,
                        "path": route_obj.path,
                        "total_carbon_kg": carbon,
                        "total_distance_km": route_obj.total_distance_km,
                        "total_time_min": route_obj.total_time_min,
                        "vehicle": vehicle
                    }

                # 3. Hydrate path nodes with coordinates for mapping
                def hydrate_path(node_ids):
                    coords = []
                    for nid in node_ids:
                        try:
                            lat, lon = graph_store.graph.get_node_coords(nid)
                            coords.append({"lat": lat, "lon": lon})
                        except Exception:
                            continue
                    return coords

                results[vehicle] = {
                    "greenest": {**format_route(routes.greenest, "Greenest", "carbon", is_eco=True), "path_coords": hydrate_path(routes.greenest.path)},
                    "fastest": {**format_route(routes.fastest, "Fastest", "time", is_eco=False), "path_coords": hydrate_path(routes.fastest.path)},
                    "shortest": {**format_route(routes.shortest, "Shortest", "distance", is_eco=False), "path_coords": hydrate_path(routes.shortest.path)}
                }
            except Exception as ve:
                results[vehicle] = {"error": str(ve)}

        # 3. Save greenest of the first vehicle to history (simplified sync)
        if user_id and request.vehicles:
            first_v = request.vehicles[0]
            if "error" not in results[first_v]:
                save_route_to_history(db, user_id, request.origin_lat, request.origin_lon, request.dest_lat, request.dest_lon, first_v, results[first_v])

        return {
            "origin": {"lat": request.origin_lat, "lon": request.origin_lon},
            "destination": {"lat": request.dest_lat, "lon": request.dest_lon},
            "comparisons": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/internal/dashboard/stats", dependencies=[Depends(get_current_user)])
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

    # Calculate total carbon saved from history
    from .models import SavedRoute
    total_saved = db.query(SavedRoute.green_co2).filter(SavedRoute.user_id == user.id).all()
    total_co2 = sum(float(r[0]) for r in total_saved) if total_saved else 0.0

    return {
        "user_id": user.id,
        "api_calls_this_month": usage_count,
        "total_carbon_saved": f"{total_co2:.2f}",
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
    keys = db.query(APIKey).filter(APIKey.user_id == user.id, APIKey.is_active).all()
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
