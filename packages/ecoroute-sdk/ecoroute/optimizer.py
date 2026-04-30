# ================================================================
# ecoroute-sdk/ecoroute/optimizer.py
# Bridge between Python SDK and Rust core algorithm
#
# When Rust core is compiled via PyO3/maturin:
#     from ecoroute._core import run_green_dijkstra
#
# Until then (pure Python fallback):
#     Implements the same algorithm in Python
#     so the SDK works immediately without Rust compilation
# ================================================================

from __future__ import annotations
import math
from typing import Optional
from .models import (
    Route, RouteResponse, OptimizeFor,
    VehicleType, Waypoint, Coordinate,
)


# ----------------------------------------------------------------
# Pure Python fallback graph structures
# ----------------------------------------------------------------
class PyEdge:
    __slots__ = [
        "to", "distance_km", "speed_limit_kmh",
        "current_speed_kmh", "gradient_pct", "num_signals",
    ]

    def __init__(
        self,
        to: int,
        distance_km: float,
        speed_limit_kmh: float,
        current_speed_kmh: float,
        gradient_pct: float,
        num_signals: int,
    ) -> None:
        self.to                = to
        self.distance_km       = distance_km
        self.speed_limit_kmh   = speed_limit_kmh
        self.current_speed_kmh = current_speed_kmh
        self.gradient_pct      = gradient_pct
        self.num_signals       = num_signals


class PyNode:
    __slots__ = ["id", "lat", "lon", "name"]

    def __init__(self, id: int, lat: float, lon: float, name: str = "") -> None:
        self.id   = id
        self.lat  = lat
        self.lon  = lon
        self.name = name


# ----------------------------------------------------------------
# Carbon cost function — mirrors carbon.rs exactly
# ----------------------------------------------------------------
def _carbon_cost(edge: PyEdge, vehicle: VehicleType) -> float:
    # gradient penalty
    if edge.gradient_pct > 0:
        gradient_penalty = 1.0 + (edge.gradient_pct * 0.03)
    elif edge.gradient_pct < 0:
        gradient_penalty = 1.0 + (edge.gradient_pct * 0.01)
    else:
        gradient_penalty = 1.0

    # acceleration penalty
    speed_ratio = (
        edge.current_speed_kmh / edge.speed_limit_kmh
        if edge.speed_limit_kmh > 0 else 1.0
    )
    speed_ratio = max(0.0, min(1.0, speed_ratio))

    if speed_ratio < 0.3:
        accel_penalty = 1.50
    elif speed_ratio < 0.5:
        accel_penalty = 1.25
    elif speed_ratio < 0.7:
        accel_penalty = 1.10
    else:
        accel_penalty = 1.00

    # moving fuel
    moving_fuel = (
        edge.distance_km
        * vehicle.consumption_per_km()
        * gradient_penalty
        * accel_penalty
    )

    # idle fuel at signals
    idle_hours = (edge.num_signals * 45.0) / 3600.0
    idle_fuel  = idle_hours * _idle_consumption(vehicle)

    total_fuel = moving_fuel + idle_fuel
    return max(0.0, total_fuel * vehicle.emission_factor())


def _idle_consumption(vehicle: VehicleType) -> float:
    return {
        VehicleType.PETROL: 0.50,
        VehicleType.DIESEL: 0.55,
        VehicleType.CNG:    0.45,
        VehicleType.HYBRID: 0.10,
        VehicleType.EV:     0.00,
    }[vehicle]


def _travel_time_minutes(edge: PyEdge) -> float:
    speed = edge.current_speed_kmh if edge.current_speed_kmh > 0 else 5.0
    return (edge.distance_km / speed) * 60.0 + (edge.num_signals * 45.0 / 60.0)


# ----------------------------------------------------------------
# Haversine — mirrors heuristic.rs
# ----------------------------------------------------------------
def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r    = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ----------------------------------------------------------------
# Green Dijkstra — pure Python fallback
# Mirrors algorithm.rs green_dijkstra exactly
# ----------------------------------------------------------------
def _green_dijkstra(
    nodes:      list[PyNode],
    adjacency:  list[list[PyEdge]],
    start:      int,
    end:        int,
    vehicle:    VehicleType,
    weight:     str = "carbon",  # "carbon" | "time" | "distance"
) -> Optional[tuple[float, list[int]]]:
    import heapq

    n       = len(adjacency)
    cost    = [math.inf] * n
    prev    = [-1] * n
    visited = [False] * n

    cost[start] = 0.0
    heap        = [(0.0, start)]

    while heap:
        c, u = heapq.heappop(heap)
        if u == end:
            break
        if visited[u]:
            continue
        visited[u] = True

        for edge in adjacency[u]:
            if edge.to >= n:
                continue

            if weight == "carbon":
                w = _carbon_cost(edge, vehicle)
            elif weight == "time":
                w = _travel_time_minutes(edge)
            else:
                w = edge.distance_km

            new_cost = c + w
            if new_cost < cost[edge.to]:
                cost[edge.to] = new_cost
                prev[edge.to] = u
                heapq.heappush(heap, (new_cost, edge.to))

    if math.isinf(cost[end]):
        return None

    # reconstruct path
    path    = []
    current = end
    while current != -1:
        path.append(current)
        current = prev[current]
    path.reverse()

    return cost[end], path


def _total_carbon(
    adjacency: list[list[PyEdge]],
    path:      list[int],
    vehicle:   VehicleType,
) -> float:
    total = 0.0
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        for edge in adjacency[u]:
            if edge.to == v:
                total += _carbon_cost(edge, vehicle)
                break
    return total


def _total_distance(adjacency: list[list[PyEdge]], path: list[int]) -> float:
    total = 0.0
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        for edge in adjacency[u]:
            if edge.to == v:
                total += edge.distance_km
                break
    return total


def _total_time(adjacency: list[list[PyEdge]], path: list[int]) -> float:
    total = 0.0
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        for edge in adjacency[u]:
            if edge.to == v:
                total += _travel_time_minutes(edge)
                break
    return total


# ----------------------------------------------------------------
# Optimizer — main class called by EcoRouteClient
# ----------------------------------------------------------------
class Optimizer:
    """
    Runs the routing algorithm.
    Tries to import compiled Rust core first.
    Falls back to pure Python implementation.
    """

    def __init__(self) -> None:
        self._use_rust = False
        try:
            from ecoroute import _core  # noqa: F401
            self._use_rust = True
            print("[ecoroute] Using compiled Rust core ⚡")
        except ImportError:
            print("[ecoroute] Using Python fallback (run `maturin develop` for Rust speed)")

    def find_routes(
        self,
        nodes:      list[PyNode],
        adjacency:  list[list[PyEdge]],
        start:      int,
        end:        int,
        vehicle:    VehicleType,
        origin_wp:  Waypoint,
        dest_wp:    Waypoint,
    ) -> Optional[RouteResponse]:

        if self._use_rust:
            return self._find_routes_rust(
                nodes, adjacency, start, end, vehicle, origin_wp, dest_wp
            )
        return self._find_routes_python(
            nodes, adjacency, start, end, vehicle, origin_wp, dest_wp
        )

    def _find_routes_python(
        self,
        nodes:      list[PyNode],
        adjacency:  list[list[PyEdge]],
        start:      int,
        end:        int,
        vehicle:    VehicleType,
        origin_wp:  Waypoint,
        dest_wp:    Waypoint,
    ) -> Optional[RouteResponse]:

        # Run three variants
        green_raw = _green_dijkstra(nodes, adjacency, start, end, vehicle, "carbon")
        time_raw  = _green_dijkstra(nodes, adjacency, start, end, vehicle, "time")
        dist_raw  = _green_dijkstra(nodes, adjacency, start, end, vehicle, "distance")

        if not green_raw or not time_raw or not dist_raw:
            return None

        green_cost, green_path = green_raw
        time_cost,  time_path  = time_raw
        dist_cost,  dist_path  = dist_raw

        def make_route(
            label:        str,
            optimize_for: OptimizeFor,
            path:         list[int],
            carbon_kg:    float,
            distance_km:  float,
            time_min:     float,
        ) -> Route:
            waypoints = [
                Waypoint(
                    name       = nodes[i].name or f"Node {i}",
                    coordinate = Coordinate(lat=nodes[i].lat, lon=nodes[i].lon),
                    node_id    = i,
                )
                for i in path
            ]
            return Route(
                label             = label,
                optimize_for      = optimize_for,
                path_node_ids     = path,
                waypoints         = waypoints,
                total_distance_km = round(distance_km, 2),
                total_time_min    = round(time_min, 1),
                total_carbon_kg   = round(carbon_kg, 4),
                vehicle           = vehicle,
            )

        greenest = make_route(
            "Greenest", OptimizeFor.CARBON,
            green_path,
            green_cost,
            _total_distance(adjacency, green_path),
            _total_time(adjacency, green_path),
        )
        fastest = make_route(
            "Fastest", OptimizeFor.TIME,
            time_path,
            _total_carbon(adjacency, time_path, vehicle),
            _total_distance(adjacency, time_path),
            time_cost,
        )
        shortest = make_route(
            "Shortest", OptimizeFor.DISTANCE,
            dist_path,
            _total_carbon(adjacency, dist_path, vehicle),
            dist_cost,
            _total_time(adjacency, dist_path),
        )

        return RouteResponse(
            origin      = origin_wp,
            destination = dest_wp,
            vehicle     = vehicle,
            greenest    = greenest,
            fastest     = fastest,
            shortest    = shortest,
        )

    def _find_routes_rust(self, *args, **kwargs) -> Optional[RouteResponse]:
        # TODO: call compiled _core module via PyO3
        # For now fall back to Python
        return self._find_routes_python(*args, **kwargs)