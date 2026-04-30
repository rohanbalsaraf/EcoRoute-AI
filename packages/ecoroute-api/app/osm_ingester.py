import requests
import json
import math

def fetch_osm_data(bbox):
    """
    Fetches road data from Overpass API for a given bounding box.
    bbox: (min_lat, min_lon, max_lat, max_lon)
    """
    overpass_url = "https://overpass-api.de/api/interpreter"
    overpass_query = f"""
    [out:json][timeout:25];
    (
      way["highway"~"primary|secondary|tertiary|residential|motorway"]({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]});
    );
    out body;
    >;
    out skel qt;
    """
    response = requests.post(overpass_url, data={'data': overpass_query})
    return response.json()

def process_osm_to_graph(osm_data):
    """
    Converts OSM JSON into the EcoRoute graph format.
    """
    nodes_map = {}
    nodes_list = []
    node_id_to_idx = {}
    
    # 1. Extract all nodes
    for element in osm_data['elements']:
        if element['type'] == 'node':
            nodes_map[element['id']] = (element['lat'], element['lon'])

    # 2. Extract ways and build adjacency
    # We only keep nodes that are part of a way to save memory
    used_nodes = set()
    adjacency_raw = [] # list of (from_idx, to_idx, data)
    
    for element in osm_data['elements']:
        if element['type'] == 'way':
            nodes_in_way = element.get('nodes', [])
            highway_type = element.get('tags', {}).get('highway', 'residential')
            
            # Basic speed limits
            speed_limits = {
                'motorway': 100,
                'primary': 60,
                'secondary': 50,
                'tertiary': 40,
                'residential': 30
            }
            speed = speed_limits.get(highway_type, 30)

            for i in range(len(nodes_in_way) - 1):
                u, v = nodes_in_way[i], nodes_in_way[i+1]
                if u in nodes_map and v in nodes_map:
                    used_nodes.add(u)
                    used_nodes.add(v)
                    
                    # Calculate distance
                    lat1, lon1 = nodes_map[u]
                    lat2, lon2 = nodes_map[v]
                    
                    # Haversine distance
                    R = 6371.0
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    dist = R * c
                    
                    adjacency_raw.append((u, v, dist, speed))
                    # Bi-directional for most roads
                    adjacency_raw.append((v, u, dist, speed))

    # 3. Finalize Nodes and Mapping
    sorted_used_nodes = sorted(list(used_nodes))
    for i, node_id in enumerate(sorted_used_nodes):
        lat, lon = nodes_map[node_id]
        nodes_list.append({"id": i, "lat": lat, "lon": lon})
        node_id_to_idx[node_id] = i

    # 4. Finalize Adjacency
    adjacency_list = [[] for _ in range(len(nodes_list))]
    for u_id, v_id, dist, speed in adjacency_raw:
        u_idx = node_id_to_idx[u_id]
        v_idx = node_id_to_idx[v_id]
        adjacency_list[u_idx].append({
            "to": v_idx,
            "distance_km": dist,
            "speed_limit_kmh": float(speed),
            "current_speed_kmh": float(speed * 0.8), # Mock traffic
            "gradient_pct": 0.0,
            "num_signals": 0
        })

    return nodes_list, adjacency_list

def ingest_area(bbox, output_file):
    print(f"📡 Fetching OSM data for bbox {bbox}...")
    data = fetch_osm_data(bbox)
    print("⚙️ Processing graph...")
    nodes, adjacency = process_osm_to_graph(data)
    
    graph_data = {
        "nodes": nodes,
        "adjacency": adjacency
    }
    
    with open(output_file, 'w') as f:
        json.dump(graph_data, f)
    
    print(f"✅ Ingested {len(nodes)} nodes. Saved to {output_file}")
    return graph_data

if __name__ == "__main__":
    # Example: Central Pune
    # bbox = (18.50, 73.80, 18.55, 73.90)
    # ingest_area(bbox, "graph_pune_large.json")
    pass
