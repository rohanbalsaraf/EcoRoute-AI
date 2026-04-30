# Initial sample data for Pune
NODES = [
    {"id": 0, "lat": 18.5285, "lon": 73.8740}, # Pune Station
    {"id": 1, "lat": 18.5300, "lon": 73.8600}, # Sangamwadi Bridge
    {"id": 2, "lat": 18.5308, "lon": 73.8474}, # Shivajinagar
    {"id": 3, "lat": 18.5250, "lon": 73.8300}, # Agriculture College
    {"id": 4, "lat": 18.5400, "lon": 73.8200}, # Range Hills
    {"id": 5, "lat": 18.5589, "lon": 73.8087}, # Aundh
    {"id": 6, "lat": 18.5650, "lon": 73.7950}, # ITI Road
    {"id": 7, "lat": 18.5590, "lon": 73.7868}, # Baner
    {"id": 8, "lat": 18.5750, "lon": 73.7800}, # Balewadi Phata
    {"id": 9, "lat": 18.5935, "lon": 73.7627}, # Wakad
    {"id": 10, "lat": 18.6000, "lon": 73.7500}, # Bhumkar Chowk
    {"id": 11, "lat": 18.5912, "lon": 73.7380}, # Hinjewadi Phase 1
    {"id": 12, "lat": 18.5780, "lon": 73.7400}, # Hinjewadi Bridge
    {"id": 13, "lat": 18.5450, "lon": 73.7700}, # Pashan
]

ADJACENCY = [
    [{"to": 1, "distance_km": 1.5, "speed_limit_kmh": 40.0, "current_speed_kmh": 20.0, "gradient_pct": 0.0, "num_signals": 1}], # 0 -> 1
    [{"to": 2, "distance_km": 1.3, "speed_limit_kmh": 40.0, "current_speed_kmh": 15.0, "gradient_pct": 0.0, "num_signals": 2}], # 1 -> 2
    [{"to": 3, "distance_km": 1.8, "speed_limit_kmh": 50.0, "current_speed_kmh": 25.0, "gradient_pct": 0.5, "num_signals": 3}, 
     {"to": 5, "distance_km": 4.5, "speed_limit_kmh": 60.0, "current_speed_kmh": 30.0, "gradient_pct": 0.2, "num_signals": 4}], # 2 -> 3,5
    [{"to": 4, "distance_km": 1.7, "speed_limit_kmh": 50.0, "current_speed_kmh": 40.0, "gradient_pct": 0.8, "num_signals": 1}], # 3 -> 4
    [{"to": 5, "distance_km": 2.2, "speed_limit_kmh": 50.0, "current_speed_kmh": 35.0, "gradient_pct": 0.3, "num_signals": 2}], # 4 -> 5
    [{"to": 6, "distance_km": 1.5, "speed_limit_kmh": 40.0, "current_speed_kmh": 20.0, "gradient_pct": 0.0, "num_signals": 2}], # 5 -> 6
    [{"to": 7, "distance_km": 1.2, "speed_limit_kmh": 40.0, "current_speed_kmh": 15.0, "gradient_pct": 0.0, "num_signals": 1}], # 6 -> 7
    [{"to": 8, "distance_km": 1.8, "speed_limit_kmh": 60.0, "current_speed_kmh": 45.0, "gradient_pct": 0.1, "num_signals": 1}], # 7 -> 8
    [{"to": 9, "distance_km": 2.5, "speed_limit_kmh": 80.0, "current_speed_kmh": 60.0, "gradient_pct": 0.0, "num_signals": 0}], # 8 -> 9
    [{"to": 10, "distance_km": 1.5, "speed_limit_kmh": 60.0, "current_speed_kmh": 30.0, "gradient_pct": 0.0, "num_signals": 2}], # 9 -> 10
    [{"to": 11, "distance_km": 2.1, "speed_limit_kmh": 50.0, "current_speed_kmh": 15.0, "gradient_pct": 0.0, "num_signals": 3}], # 10 -> 11
    [], # 11 (End)
    [{"to": 11, "distance_km": 1.8, "speed_limit_kmh": 60.0, "current_speed_kmh": 40.0, "gradient_pct": 0.0, "num_signals": 1}], # 12 -> 11
    [{"to": 7, "distance_km": 2.5, "speed_limit_kmh": 50.0, "current_speed_kmh": 35.0, "gradient_pct": 1.5, "num_signals": 2}], # 13 -> 7
]
