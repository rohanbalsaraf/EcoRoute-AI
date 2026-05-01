# ================================================================
# ecoroute-sdk/ecoroute/data_sources.py
# Live data integrations:
#   - OpenAQ      → air quality (AQI) per location
#   - OpenWeather → weather conditions
#   - Nominatim   → geocoding (text → coordinates)
#   - OSRM        → open source road routing engine
# All are FREE APIs — no credit card required
# ================================================================

from __future__ import annotations
import os
import httpx
from typing import Optional
from .models import AQIData, Coordinate, WeatherData, Waypoint


# ----------------------------------------------------------------
# GeocodingClient — convert place names to GPS coordinates
# Uses Nominatim (OpenStreetMap geocoder) — completely free
# ----------------------------------------------------------------
class GeocodingClient:
    BASE_URL = "https://nominatim.openstreetmap.org"

    def __init__(self) -> None:
        self.headers = {
            "User-Agent": "EcoRouteAI/0.1.0 (github.com/yourusername/ecoroute-ai)"
        }

    async def geocode(self, place_name: str) -> Optional[Waypoint]:
        """Convert a place name into GPS coordinates."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/search",
                params={
                    "q": place_name,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1,
                },
                headers=self.headers,
                timeout=10.0,
            )
            response.raise_for_status()
            results = response.json()

            if not results:
                return None

            r = results[0]
            return Waypoint(
                name=r.get("display_name", place_name).split(",")[0],
                coordinate=Coordinate(
                    lat=float(r["lat"]),
                    lon=float(r["lon"]),
                ),
            )

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        """Convert GPS coordinates into a human-readable place name."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/reverse",
                params={"lat": lat, "lon": lon, "format": "json"},
                headers=self.headers,
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
            address = data.get("address", {})
            return (
                address.get("road")
                or address.get("suburb")
                or address.get("city")
                or data.get("display_name", "")
            )


# ----------------------------------------------------------------
# AQIClient — live air quality data from OpenAQ
# Free API, no key required for basic use
# ----------------------------------------------------------------
class AQIClient:
    BASE_URL = "https://api.openaq.org/v3"

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("OPENAQ_API_KEY", "")
        self.headers = {"X-API-Key": self.api_key} if self.api_key else {}

    async def get_aqi(
        self, lat: float, lon: float, radius_km: float = 10.0
    ) -> Optional[AQIData]:
        """Get current AQI for a GPS location."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/locations",
                params={
                    "coordinates": f"{lat},{lon}",
                    "radius": int(radius_km * 1000),  # metres
                    "limit": 5,
                    "order_by": "distance",
                },
                headers=self.headers,
                timeout=10.0,
            )

            if response.status_code != 200:
                # Return a default moderate AQI if API unavailable
                return self._default_aqi(lat, lon)

            data = response.json()
            results = data.get("results", [])
            if not results:
                return self._default_aqi(lat, lon)

            # Average PM2.5 from nearest stations
            pm25_values = []
            for station in results[:3]:
                for sensor in station.get("sensors", []):
                    if sensor.get("parameter", {}).get("name") == "pm25":
                        latest = sensor.get("latest", {})
                        if latest.get("value") is not None:
                            pm25_values.append(float(latest["value"]))

            pm25 = sum(pm25_values) / len(pm25_values) if pm25_values else 35.0
            aqi = self._pm25_to_aqi(pm25)

            return AQIData(
                location=Coordinate(lat=lat, lon=lon),
                pm25=round(pm25, 2),
                pm10=round(pm25 * 1.5, 2),  # estimate
                aqi_index=round(aqi, 1),
                category=AQIData.category_from_aqi(aqi),
            )

    @staticmethod
    def _pm25_to_aqi(pm25: float) -> float:
        """Convert PM2.5 µg/m³ to AQI index (US EPA formula)."""
        breakpoints = [
            (0, 12.0, 0, 50),
            (12.1, 35.4, 51, 100),
            (35.5, 55.4, 101, 150),
            (55.5, 150.4, 151, 200),
            (150.5, 250.4, 201, 300),
            (250.5, 500.4, 301, 500),
        ]
        for c_lo, c_hi, i_lo, i_hi in breakpoints:
            if c_lo <= pm25 <= c_hi:
                return ((i_hi - i_lo) / (c_hi - c_lo)) * (pm25 - c_lo) + i_lo
        return 500.0

    @staticmethod
    def _default_aqi(lat: float, lon: float) -> AQIData:
        return AQIData(
            location=Coordinate(lat=lat, lon=lon),
            pm25=35.0,
            pm10=52.5,
            aqi_index=100.0,
            category="Moderate",
        )


# ----------------------------------------------------------------
# WeatherClient — current weather from Open-Meteo
# Completely free, no API key needed
# ----------------------------------------------------------------
class WeatherClient:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    async def get_weather(self, lat: float, lon: float) -> WeatherData:
        """Get current weather for a location."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.BASE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
                    "wind_speed_unit": "kmh",
                    "timezone": "auto",
                    "forecast_days": 1,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
            current = data.get("current", {})

            weather_code = current.get("weather_code", 0)
            condition = self._weather_code_to_condition(weather_code)

            return WeatherData(
                location=Coordinate(lat=lat, lon=lon),
                temperature_c=current.get("temperature_2m", 25.0),
                humidity_pct=current.get("relative_humidity_2m", 60.0),
                wind_speed_kmh=current.get("wind_speed_10m", 10.0),
                condition=condition,
            )

    @staticmethod
    def _weather_code_to_condition(code: int) -> str:
        if code == 0:
            return "clear"
        if code in range(1, 4):
            return "partly_cloudy"
        if code in range(45, 50):
            return "fog"
        if code in range(51, 68):
            return "rain"
        if code in range(71, 78):
            return "snow"
        if code in range(80, 83):
            return "rain"
        if code in range(95, 100):
            return "thunderstorm"
        return "clear"


# ----------------------------------------------------------------
# OSRMClient — road routing engine for graph data
# Uses public OSRM server — free, based on OpenStreetMap
# ----------------------------------------------------------------
class OSRMClient:
    BASE_URL = "https://router.project-osrm.org"

    async def get_route(
        self,
        origin: Coordinate,
        destination: Coordinate,
    ) -> Optional[dict]:
        """
        Get raw route data from OSRM.
        Returns duration, distance, and geometry.
        Used to validate and enrich our Rust algorithm output.
        """
        coords = f"{origin.lon},{origin.lat};{destination.lon},{destination.lat}"
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/route/v1/driving/{coords}",
                params={
                    "overview": "full",
                    "geometries": "geojson",
                    "steps": "true",
                },
                timeout=15.0,
            )
            if response.status_code != 200:
                return None

            data = response.json()
            routes = data.get("routes", [])
            if not routes:
                return None

            route = routes[0]
            return {
                "distance_km": round(route["distance"] / 1000, 2),
                "time_min": round(route["duration"] / 60, 1),
                "geometry": route.get("geometry", {}),
                "steps": route.get("legs", [{}])[0].get("steps", []),
            }

    async def get_nearest_road(self, lat: float, lon: float) -> Optional[Coordinate]:
        """Snap a GPS point to the nearest road."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/nearest/v1/driving/{lon},{lat}",
                params={"number": 1},
                timeout=10.0,
            )
            if response.status_code != 200:
                return None
            data = response.json()
            waypoints = data.get("waypoints", [])
            if not waypoints:
                return None
            loc = waypoints[0]["location"]
            return Coordinate(lat=loc[1], lon=loc[0])
