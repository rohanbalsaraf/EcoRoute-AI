import json
import ecoroute_core

# Dummy data based on the Pune city graph from Rust tests
NODES = [
    {"id": 0, "lat": 18.5285, "lon": 73.8740}, # Pune Station
    {"id": 1, "lat": 18.5308, "lon": 73.8474}, # Shivajinagar
    {"id": 2, "lat": 18.5590, "lon": 73.7868}, # Baner
    {"id": 3, "lat": 18.5589, "lon": 73.8087}, # Aundh
    {"id": 4, "lat": 18.5935, "lon": 73.7627}, # Wakad
    {"id": 5, "lat": 18.5912, "lon": 73.7380}, # Hinjewadi
]

ADJACENCY = [
    [
        {"to": 1, "distance_km": 3.2, "speed_limit_kmh": 40.0, "current_speed_kmh": 15.0, "gradient_pct": 0.5, "num_signals": 4},
        {"to": 3, "distance_km": 5.1, "speed_limit_kmh": 50.0, "current_speed_kmh": 35.0, "gradient_pct": 0.2, "num_signals": 2},
    ],
    [
        {"to": 2, "distance_km": 6.8, "speed_limit_kmh": 60.0, "current_speed_kmh": 12.0, "gradient_pct": 1.2, "num_signals": 6},
        {"to": 3, "distance_km": 4.2, "speed_limit_kmh": 50.0, "current_speed_kmh": 28.0, "gradient_pct": 0.3, "num_signals": 2},
    ],
    [
        {"to": 5, "distance_km": 5.5, "speed_limit_kmh": 60.0, "current_speed_kmh": 10.0, "gradient_pct": 0.8, "num_signals": 5},
    ],
    [
        {"to": 4, "distance_km": 4.8, "speed_limit_kmh": 60.0, "current_speed_kmh": 42.0, "gradient_pct": 0.1, "num_signals": 1},
    ],
    [
        {"to": 5, "distance_km": 3.9, "speed_limit_kmh": 60.0, "current_speed_kmh": 50.0, "gradient_pct": 0.0, "num_signals": 1},
    ],
    [],
]

def get_graph():
    """Initializes and returns the singleton road graph."""
    return ecoroute_core.PyRoadGraph(
        json.dumps(NODES),
        json.dumps(ADJACENCY)
    )

# Pre-load graph
graph = None

def init_graph():
    global graph
    try:
        graph = get_graph()
        print("✅ RoadGraph initialized with Pune City data.")
    except Exception as e:
        print(f"❌ Failed to initialize RoadGraph: {e}")
