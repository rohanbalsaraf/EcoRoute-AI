import json
import ecoroute_core

import os
from .osm_ingester import ingest_area

GRAPH_FILE = "/tmp/graph_cache.json"

class Node:
    def __init__(self, id, lat, lon):
        self.id = id
        self.lat = lat
        self.lon = lon

class Edge:
    def __init__(self, to, distance_km, speed_limit_kmh, current_speed_kmh, gradient_pct, num_signals):
        self.to = to
        self.distance_km = distance_km
        self.speed_limit_kmh = speed_limit_kmh
        self.current_speed_kmh = current_speed_kmh
        self.gradient_pct = gradient_pct
        self.num_signals = num_signals

def get_graph_from_data(nodes, adjacency):
    py_nodes = [Node(n['id'], n['lat'], n['lon']) for n in nodes]
    py_adjacency = []
    for adj in adjacency:
        py_adj = [Edge(e['to'], e['distance_km'], e['speed_limit_kmh'], e['current_speed_kmh'], e['gradient_pct'], e['num_signals']) for e in adj]
        py_adjacency.append(py_adj)
    
    return ecoroute_core.PyRoadGraph(py_nodes, py_adjacency)

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
