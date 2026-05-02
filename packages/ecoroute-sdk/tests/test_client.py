import asyncio
from unittest.mock import AsyncMock
from ecoroute.client import EcoRouteClient
from ecoroute.models import Coordinate, Waypoint

def test_geocoding_cache():
    async def run():
        client = EcoRouteClient()
        
        # Mock geocoder
        client._geocoder.geocode = AsyncMock(return_value=Waypoint(name="Pune", coordinate=Coordinate(lat=18.52, lon=73.85)))
        
        # First call - should hit geocoder
        wp1 = await client._resolve_location("Pune")
        assert wp1.name == "Pune"
        assert client._geocoder.geocode.call_count == 1
        
        # Second call - should hit cache
        wp2 = await client._resolve_location("Pune")
        assert wp2.name == "Pune"
        assert client._geocoder.geocode.call_count == 1 # Still 1
    
    asyncio.run(run())

def test_carbon_for_path_efficiency():
    async def run():
        client = EcoRouteClient()
        
        # Mock dependencies
        client._resolve_location = AsyncMock(side_effect=[
            Waypoint(name="A", coordinate=Coordinate(lat=0, lon=0)),
            Waypoint(name="B", coordinate=Coordinate(lat=1, lon=1))
        ])
        client.find_routes = AsyncMock()
        
        await client.carbon_for_path(["A", "B"])
        
        # Should resolve both waypoints
        assert client._resolve_location.call_count == 2
        # Should call find_routes once for the segment
        assert client.find_routes.call_count == 1
        
    asyncio.run(run())
