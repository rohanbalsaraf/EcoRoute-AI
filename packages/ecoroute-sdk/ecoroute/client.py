# ================================================================
# ecoroute-sdk/ecoroute/client.py
# Main EcoRouteClient — the entry point for all SDK users
#
# Usage:
#   from ecoroute import EcoRouteClient
#   client = EcoRouteClient()
#   routes = await client.find_routes("Pune Station", "Hinjewadi", "petrol")
#   print(routes.savings_message)
# ================================================================

from __future__ import annotations
import asyncio
import math
from typing import Optional
from .models import Coordinate, RouteResponse, VehicleType, Waypoint
from .data_sources import AQIClient, GeocodingClient, OSRMClient, WeatherClient
from .optimizer import Optimizer, PyEdge, PyNode


# ----------------------------------------------------------------
# EcoRouteClient — main public API
# ----------------------------------------------------------------
class EcoRouteClient:
    """
    Carbon-aware route optimizer for any city.

    Example:
        client = EcoRouteClient()

        # Async usage
        routes = await client.find_routes(
            origin      = "Pune Railway Station",
            destination = "Hinjewadi IT Park",
            vehicle     = "petrol",
        )
        routes.print_comparison()
        print(routes.savings_message)

        # Sync usage (convenience wrapper)
        routes = client.find_routes_sync(
            origin      = "Pune Railway Station",
            destination = "Hinjewadi IT Park",
            vehicle     = "petrol",
        )
    """

    def __init__(
        self,
        api_url:           Optional[str] = None,
        openaq_api_key:    Optional[str] = None,
        openweather_api_key: Optional[str] = None,
    ) -> None:
        self.api_url    = api_url or os.getenv("ECOROUTE_API_URL")
        self._geocoder  = GeocodingClient()
        self._aqi       = AQIClient(api_key=openaq_api_key)
        self._weather   = WeatherClient()
        self._osrm      = OSRMClient()
        self._optimizer = Optimizer()

    # ----------------------------------------------------------------
    # find_routes — main method
    # ----------------------------------------------------------------
    async def find_routes(
        self,
        origin:      str | Coordinate,
        destination: str | Coordinate,
        vehicle:     str | VehicleType = "petrol",
    ) -> Optional[RouteResponse]:
        """
        Find greenest, fastest, and shortest routes between two points.
        """
        # Resolve vehicle type
        if isinstance(vehicle, str):
            vehicle = VehicleType(vehicle.lower())

        # Resolve coordinates
        origin_wp = await self._resolve_location(origin)
        dest_wp   = await self._resolve_location(destination)

        if origin_wp is None or dest_wp is None:
            return None

        # OPTION A: Call Remote EcoRoute API (Production Mode)
        if self.api_url:
            return await self._fetch_remote_routes(origin_wp, dest_wp, vehicle)

        # OPTION B: Build Local Graph from OSRM (SDK Mode)
        nodes, adjacency = await self._build_real_graph(
            origin_wp.coordinate,
            dest_wp.coordinate,
            vehicle,
        )

        if not nodes:
            return None

        return self._optimizer.find_routes(
            nodes      = nodes,
            adjacency  = adjacency,
            start      = 0,
            end        = len(nodes) - 1,
            vehicle    = vehicle,
            origin_wp  = origin_wp,
            dest_wp    = dest_wp,
        )

    async def _fetch_remote_routes(
        self, origin: Waypoint, dest: Waypoint, vehicle: VehicleType
    ) -> Optional[RouteResponse]:
        """Call the production EcoRoute API."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_url}/routes",
                    params={
                        "origin":      f"{origin.coordinate.lat},{origin.coordinate.lon}",
                        "destination": f"{dest.coordinate.lat},{dest.coordinate.lon}",
                        "vehicle":     vehicle.value,
                    },
                    timeout=30.0
                )
                if response.status_code != 200:
                    return None
                
                # The API returns a similar structure to RouteResponse
                # In a real implementation we would parse the JSON into Pydantic models
                data = response.json()
                return RouteResponse.model_validate(data)
            except Exception:
                return None

    # ----------------------------------------------------------------
    # find_routes_sync — convenience wrapper for non-async code
    # ----------------------------------------------------------------
    def find_routes_sync(
        self,
        origin:      str | Coordinate,
        destination: str | Coordinate,
        vehicle:     str | VehicleType = "petrol",
    ) -> Optional[RouteResponse]:
        """Synchronous wrapper around find_routes."""
        return asyncio.run(self.find_routes(origin, destination, vehicle))

    # ----------------------------------------------------------------
    # carbon_for_path — calculate carbon for an already-known path
    # ----------------------------------------------------------------
    async def carbon_for_path(
        self,
        waypoints: list[str | Coordinate],
        vehicle:   str | VehicleType = "petrol",
    ) -> float:
        """
        Calculate total carbon for a multi-stop journey.
        Useful for delivery route optimization.
        """
        if isinstance(vehicle, str):
            vehicle = VehicleType(vehicle.lower())

        total_carbon = 0.0
        for i in range(len(waypoints) - 1):
            result = await self.find_routes(
                waypoints[i], waypoints[i + 1], vehicle
            )
            if result:
                total_carbon += result.greenest.total_carbon_kg

        return round(total_carbon, 4)

    # ----------------------------------------------------------------
    # Internal helpers
    # ----------------------------------------------------------------
    async def _resolve_location(
        self, location: str | Coordinate
    ) -> Optional[Waypoint]:
        if isinstance(location, Coordinate):
            name = await self._geocoder.reverse_geocode(location.lat, location.lon)
            return Waypoint(name=name or "Unknown", coordinate=location)
        return await self._geocoder.geocode(location)

    async def _build_real_graph(
        self,
        origin:      Coordinate,
        destination: Coordinate,
        vehicle:     VehicleType,
    ) -> tuple[list[PyNode], list[list[PyEdge]]]:
        """
        Build a real routing graph by fetching a base route from OSRM
        and then augmenting the edges with live environmental data.
        """
        # Fetch base route with steps
        raw_osrm = await self._osrm.get_route(origin, destination)
        if not raw_osrm:
            return [], []

        steps = raw_osrm.get("steps", [])
        if not steps:
            return [], []

        # Concurrent data fetching for midpoint
        mid_lat = (origin.lat + destination.lat) / 2
        mid_lon = (origin.lon + destination.lon) / 2
        
        weather, aqi = await asyncio.gather(
            self._weather.get_weather(mid_lat, mid_lon),
            self._aqi.get_aqi(mid_lat, mid_lon),
            return_exceptions=True
        )

        weather_penalty = 1.0
        if isinstance(weather, WeatherData):
            weather_penalty = weather.fuel_penalty()

        aqi_factor = 1.0
        if isinstance(aqi, AQIData):
            aqi_factor = 1.0 + (aqi.aqi_index / 500.0) * 0.2

        # Convert OSRM steps to graph nodes and edges
        nodes: list[PyNode] = []
        adjacency: list[list[PyEdge]] = []

        # Start with origin
        nodes.append(PyNode(0, origin.lat, origin.lon, "Start"))
        adjacency.append([])

        for i, step in enumerate(steps):
            loc = step.get("maneuver", {}).get("location", [0, 0])
            name = step.get("name", f"Step {i}")
            
            node_id = i + 1
            nodes.append(PyNode(node_id, loc[1], loc[0], name))
            adjacency.append([])

            # Create edge from previous node to this one
            dist = step.get("distance", 0) / 1000.0
            duration = step.get("duration", 1) / 60.0
            
            # Estimate speed
            speed = (dist / (duration / 60.0)) if duration > 0 else 30.0
            
            # Simple heuristic for signals (OSRM often marks them in 'intersections')
            num_signals = len(step.get("intersections", [])) // 2 

            edge = PyEdge(
                to                = node_id,
                distance_km       = dist,
                speed_limit_kmh   = speed * 1.2, # assume limit is slightly higher
                current_speed_kmh = speed * weather_penalty,
                gradient_pct      = 0.0, # would need DEM for real gradient
                num_signals       = num_signals,
            )
            adjacency[i].append(edge)

        return nodes, adjacency


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r    = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)
    a    = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))