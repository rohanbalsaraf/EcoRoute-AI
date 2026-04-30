import json
import ecoroute_core

import os
from .osm_ingester import ingest_area

GRAPH_FILE = "/tmp/graph_cache.json"

def get_graph_from_data(nodes, adjacency):
    return ecoroute_core.PyRoadGraph(
        json.dumps(nodes),
        json.dumps(adjacency)
    )

def init_graph():
    global graph
    try:
        if os.path.exists(GRAPH_FILE):
            print("📁 Loading graph from cache...")
            with open(GRAPH_FILE, 'r') as f:
                data = json.load(f)
                graph = get_graph_from_data(data['nodes'], data['adjacency'])
        else:
            # Fallback to initial Pune data
            from .graph_store_data import NODES, ADJACENCY
            graph = get_graph_from_data(NODES, ADJACENCY)
        print("✅ RoadGraph initialized.")
    except Exception as e:
        print(f"❌ Failed to initialize RoadGraph: {e}")

def update_graph_for_area(lat1, lon1, lat2=None, lon2=None):
    """Downloads OSM data for an area covering the trip and updates the engine."""
    global graph
    
    if lat2 is not None and lon2 is not None:
        # Create a bbox that covers BOTH points with 10% padding
        min_lat = min(lat1, lat2) - 0.05
        max_lat = max(lat1, lat2) + 0.05
        min_lon = min(lon1, lon2) - 0.05
        max_lon = max(lon1, lon2) + 0.05
        bbox = (min_lat, min_lon, max_lat, max_lon)
    else:
        # Default 10km box around one point
        bbox = (lat1 - 0.05, lon1 - 0.05, lat1 + 0.05, lon1 + 0.05)
        
    try:
        data = ingest_area(bbox, GRAPH_FILE)
        graph = get_graph_from_data(data['nodes'], data['adjacency'])
        return True
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
        return False

# Initial empty state
graph = None
