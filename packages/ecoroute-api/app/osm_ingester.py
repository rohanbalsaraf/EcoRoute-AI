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
    print(f"🔍 Querying Overpass with bbox: {bbox}")
    response = requests.post(overpass_url, data={'data': overpass_query}, timeout=30)
    if response.status_code != 200:
        print(f"❌ Overpass API error {response.status_code}: {response.text}")
        raise Exception(f"Overpass API returned status {response.status_code}")
    
    data = response.json()
    if not data.get('elements'):
        print("⚠️ No road data found in this area.")
        raise Exception("No road data found in this area. Try a more populated location.")
    
    return data

def fetch_elevations(nodes_map, used_nodes):
    """Fetches elevations for all unique nodes in bulk."""
    if not used_nodes:
        return {}
    
    node_ids = sorted(list(used_nodes))
    coords = [{"latitude": nodes_map[nid][0], "longitude": nodes_map[nid][1]} for nid in node_ids]
    
    print(f"🏔️ Fetching elevations for {len(coords)} nodes...")
    try:
        # Using Open-Elevation public API (can be slow for large sets, so we chunk it)
        elevations = {}
        chunk_size = 100
        for i in range(0, len(coords), chunk_size):
            chunk = coords[i:i+chunk_size]
            response = requests.post(
                "https://api.open-elevation.com/api/v1/lookup",
                json={"locations": chunk},
                timeout=15
            )
            if response.status_code == 200:
                results = response.json().get("results", [])
                for j, res in enumerate(results):
                    elevations[node_ids[i+j]] = res.get("elevation", 0)
            else:
                print(f"⚠️ Elevation API error: {response.status_code}")
                # Fallback to 0
                for nid in node_ids[i:i+chunk_size]:
                    elevations[nid] = 0
        return elevations
    except Exception as e:
        print(f"⚠️ Elevation fetch failed: {e}")
        return {nid: 0 for nid in node_ids}

def process_osm_to_graph(osm_data):
    """
    Converts OSM JSON into the EcoRoute graph format.
    """
    nodes_map = {}
    
    # 1. Extract all nodes
    for element in osm_data['elements']:
        if element['type'] == 'node':
            nodes_map[element['id']] = (element['lat'], element['lon'])

    # 2. Identify used nodes
    used_nodes = set()
    for element in osm_data['elements']:
        if element['type'] == 'way':
            for nid in element.get('nodes', []):
                if nid in nodes_map:
                    used_nodes.add(nid)
    
    # 3. Fetch elevations
    elevations = fetch_elevations(nodes_map, used_nodes)

    # 4. Extract ways and build adjacency
    adjacency_raw = []
    for element in osm_data['elements']:
        if element['type'] == 'way':
            nodes_in_way = element.get('nodes', [])
            highway_type = element.get('tags', {}).get('highway', 'residential')
            
            speed_limits = {
                'motorway': 100, 'primary': 60, 'secondary': 50, 'tertiary': 40, 'residential': 30
            }
            speed = speed_limits.get(highway_type, 30)

            for i in range(len(nodes_in_way) - 1):
                u, v = nodes_in_way[i], nodes_in_way[i+1]
                if u in nodes_map and v in nodes_map:
                    lat1, lon1 = nodes_map[u]
                    lat2, lon2 = nodes_map[v]
                    
                    # Haversine distance
                    R = 6371.0
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                    dist = R * c
                    
                    # Calculate Gradient
                    alt1 = elevations.get(u, 0)
                    alt2 = elevations.get(v, 0)
                    rise = alt2 - alt1
                    run = dist * 1000.0
                    gradient = (rise / run * 100.0) if run > 0.1 else 0.0
                    
                    adjacency_raw.append((u, v, dist, speed, gradient))
                    adjacency_raw.append((v, u, dist, speed, -gradient))

    # 5. Finalize Nodes and Mapping
    nodes_list = []
    node_id_to_idx = {}
    sorted_used_nodes = sorted(list(used_nodes))
    for i, node_id in enumerate(sorted_used_nodes):
        lat, lon = nodes_map[node_id]
        nodes_list.append({"id": i, "lat": lat, "lon": lon})
        node_id_to_idx[node_id] = i

    # 6. Finalize Adjacency
    adjacency_list = [[] for _ in range(len(nodes_list))]
    for u_id, v_id, dist, speed, grad in adjacency_raw:
        u_idx = node_id_to_idx[u_id]
        v_idx = node_id_to_idx[v_id]
        import random
        traffic_factor = random.uniform(0.5, 0.95)
        adjacency_list[u_idx].append({
            "to": v_idx,
            "distance_km": dist,
            "speed_limit_kmh": float(speed),
            "current_speed_kmh": float(speed * traffic_factor),
            "gradient_pct": float(grad),
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
