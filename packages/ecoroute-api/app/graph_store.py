import json
import ecoroute_core

import os
from .osm_ingester import ingest_area

GRAPH_FILE = "graph_cache.json"

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

def update_graph_for_area(lat, lon):
    """Downloads OSM data for a 10x10km area and updates the engine."""
    global graph
    # 0.05 deg is approx 5km
    bbox = (lat - 0.05, lon - 0.05, lat + 0.05, lon + 0.05)
    try:
        data = ingest_area(bbox, GRAPH_FILE)
        graph = get_graph_from_data(data['nodes'], data['adjacency'])
        return True
    except Exception as e:
        print(f"❌ Ingestion failed: {e}")
        return False

# Initial empty state
graph = None
