from ecoroute.optimizer import PyEdge, _carbon_cost, _calculate_metrics
from ecoroute.models import VehicleType

def test_carbon_cost_alignment():
    # Test that carbon cost matches the Rust logic
    # petrol consumption 0.06, emission factor 2.31
    # distance 1km, speed_ratio 1.0 (no penalty)
    # moving fuel = 1 * 0.06 * 1 * 1 = 0.06
    # carbon = 0.06 * 2.31 = 0.1386
    edge = PyEdge(to=1, distance_km=1.0, speed_limit_kmh=60.0, current_speed_kmh=60.0, gradient_pct=0.0, num_signals=0)
    cost = _carbon_cost(edge, VehicleType.PETROL)
    assert abs(cost - 0.1386) < 0.0001

def test_accel_penalty_physics():
    # Test the squared continuous penalty
    # speed_ratio = 0.5 -> penalty = 1 + 0.5 * (1-0.5)^2 = 1.125
    edge = PyEdge(to=1, distance_km=1.0, speed_limit_kmh=60.0, current_speed_kmh=30.0, gradient_pct=0.0, num_signals=0)
    cost_free = _carbon_cost(PyEdge(to=1, distance_km=1.0, speed_limit_kmh=60.0, current_speed_kmh=60.0, gradient_pct=0.0, num_signals=0), VehicleType.PETROL)
    cost_half = _carbon_cost(edge, VehicleType.PETROL)
    
    # ratio of costs should be 1.125
    assert abs((cost_half / cost_free) - 1.125) < 0.0001

def test_calculate_metrics_one_pass():
    edges = [
        PyEdge(to=1, distance_km=1.0, speed_limit_kmh=60.0, current_speed_kmh=60.0, gradient_pct=0.0, num_signals=0),
        PyEdge(to=2, distance_km=2.0, speed_limit_kmh=60.0, current_speed_kmh=60.0, gradient_pct=0.0, num_signals=0)
    ]
    carbon, dist, time = _calculate_metrics(edges, VehicleType.PETROL)
    assert dist == 3.0
    assert carbon > 0
    assert time > 0
