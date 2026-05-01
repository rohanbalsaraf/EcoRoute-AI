# ================================================================
# ecoroute-sdk/ecoroute/models.py
# All data types returned by the SDK
# Uses Pydantic v2 for validation and serialization
# ================================================================

from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, computed_field


# ----------------------------------------------------------------
# VehicleType — what the user is driving
# ----------------------------------------------------------------
class VehicleType(str, Enum):
    PETROL = "petrol"
    DIESEL = "diesel"
    CNG = "cng"
    HYBRID = "hybrid"
    EV = "ev"

    def emission_factor(self) -> float:
        """kg CO2 per litre of fuel"""
        return {
            VehicleType.PETROL: 2.31,
            VehicleType.DIESEL: 2.68,
            VehicleType.CNG: 1.63,
            VehicleType.HYBRID: 2.31,
            VehicleType.EV: 0.0,
        }[self]

    def consumption_per_km(self) -> float:
        """litres per km at steady speed"""
        return {
            VehicleType.PETROL: 0.06,
            VehicleType.DIESEL: 0.055,
            VehicleType.CNG: 0.05,
            VehicleType.HYBRID: 0.035,
            VehicleType.EV: 0.0,
        }[self]

    def label(self) -> str:
        return self.value.upper()


# ----------------------------------------------------------------
# OptimizeFor — which metric to minimise
# ----------------------------------------------------------------
class OptimizeFor(str, Enum):
    CARBON = "carbon"
    TIME = "time"
    DISTANCE = "distance"


# ----------------------------------------------------------------
# Coordinate — a GPS point
# ----------------------------------------------------------------
class Coordinate(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")

    def __str__(self) -> str:
        return f"{self.lat:.6f},{self.lon:.6f}"


# ----------------------------------------------------------------
# Waypoint — one stop along a route with human-readable name
# ----------------------------------------------------------------
class Waypoint(BaseModel):
    name: str
    coordinate: Coordinate
    node_id: Optional[int] = None


# ----------------------------------------------------------------
# SavingsEquivalents — human-understandable CO2 comparisons
# ----------------------------------------------------------------
class SavingsEquivalents(BaseModel):
    saved_kg: float
    smartphones_charged: float
    trees_days_equivalent: float
    km_not_driven: float
    annual_saving_kg: float  # assuming 500 trips/year
    annual_trees: float

    @classmethod
    def from_saved_kg(cls, saved_kg: float) -> "SavingsEquivalents":
        annual = saved_kg * 500
        return cls(
            saved_kg=round(saved_kg, 4),
            smartphones_charged=round(saved_kg / 0.00822, 1),
            trees_days_equivalent=round(saved_kg / (21.7 / 365), 1),
            km_not_driven=round(saved_kg / 0.21, 1),
            annual_saving_kg=round(annual, 1),
            annual_trees=round(annual / 21.7, 1),
        )

    def message(self) -> str:
        if self.saved_kg <= 0:
            return "This is already the most efficient route."
        return (
            f"You save {self.saved_kg:.3f} kg CO\u2082 on this trip.\n"
            f"That's like charging {self.smartphones_charged:.0f} smartphones.\n"
            f"Do this daily: save {self.annual_saving_kg:.0f} kg CO\u2082/year "
            f"({self.annual_trees:.1f} trees worth)."
        )


# ----------------------------------------------------------------
# RouteSegment — one leg of a route (between two nodes)
# ----------------------------------------------------------------
class RouteSegment(BaseModel):
    from_name: str
    to_name: str
    distance_km: float
    time_min: float
    carbon_kg: float
    road_type: str = "road"
    congestion_level: str = "unknown"  # low | medium | high


# ----------------------------------------------------------------
# Route — one complete route option
# ----------------------------------------------------------------
class Route(BaseModel):
    label: str  # "Greenest" | "Fastest" | "Shortest"
    optimize_for: OptimizeFor
    path_node_ids: list[int]
    waypoints: list[Waypoint] = Field(default_factory=list)
    segments: list[RouteSegment] = Field(default_factory=list)
    total_distance_km: float
    total_time_min: float
    total_carbon_kg: float
    vehicle: VehicleType

    @computed_field  # type: ignore
    @property
    def distance_str(self) -> str:
        return f"{self.total_distance_km:.1f} km"

    @computed_field  # type: ignore
    @property
    def time_str(self) -> str:
        h = int(self.total_time_min // 60)
        m = int(self.total_time_min % 60)
        return f"{h}h {m}min" if h > 0 else f"{m} min"

    @computed_field  # type: ignore
    @property
    def carbon_str(self) -> str:
        return f"{self.total_carbon_kg:.4f} kg CO\u2082"


# ----------------------------------------------------------------
# RouteResponse — full API response with all three routes
# This is what find_routes() returns
# ----------------------------------------------------------------
class RouteResponse(BaseModel):
    origin: Waypoint
    destination: Waypoint
    vehicle: VehicleType
    greenest: Route
    fastest: Route
    shortest: Route

    @computed_field  # type: ignore
    @property
    def savings_vs_fastest(self) -> SavingsEquivalents:
        saved = max(0.0, self.fastest.total_carbon_kg - self.greenest.total_carbon_kg)
        return SavingsEquivalents.from_saved_kg(saved)

    @computed_field  # type: ignore
    @property
    def savings_vs_shortest(self) -> SavingsEquivalents:
        saved = max(0.0, self.shortest.total_carbon_kg - self.greenest.total_carbon_kg)
        return SavingsEquivalents.from_saved_kg(saved)

    @computed_field  # type: ignore
    @property
    def savings_message(self) -> str:
        return self.savings_vs_fastest.message()

    def print_comparison(self) -> None:
        print(f"\nRoute: {self.origin.name}  →  {self.destination.name}")
        print(f"Vehicle: {self.vehicle.label()}")
        print("┌─────────────┬────────────┬──────────┬────────────┐")
        print("│ Route       │ Distance   │ Time     │ Carbon     │")
        print("├─────────────┼────────────┼──────────┼────────────┤")
        for route in [self.greenest, self.fastest, self.shortest]:
            tick = " ✓" if route.label == "Greenest" else "  "
            print(
                f"│ {route.label:<9}{tick} │ "
                f"{route.distance_str:>10} │ "
                f"{route.time_str:>8} │ "
                f"{route.carbon_str:>10} │"
            )
        print("└─────────────┴────────────┴──────────┴────────────┘")
        print(f"\n{self.savings_message}")


# ----------------------------------------------------------------
# AQIData — air quality for a location
# ----------------------------------------------------------------
class AQIData(BaseModel):
    location: Coordinate
    pm25: float  # PM2.5 µg/m³
    pm10: float  # PM10 µg/m³
    aqi_index: float  # 0–500
    category: str  # Good | Moderate | Unhealthy | Hazardous

    @classmethod
    def category_from_aqi(cls, aqi: float) -> str:
        if aqi <= 50:
            return "Good"
        if aqi <= 100:
            return "Moderate"
        if aqi <= 150:
            return "Unhealthy for Sensitive Groups"
        if aqi <= 200:
            return "Unhealthy"
        if aqi <= 300:
            return "Very Unhealthy"
        return "Hazardous"


# ----------------------------------------------------------------
# WeatherData — current weather affecting route cost
# ----------------------------------------------------------------
class WeatherData(BaseModel):
    location: Coordinate
    temperature_c: float
    humidity_pct: float
    wind_speed_kmh: float
    condition: str  # clear | rain | fog | snow

    def fuel_penalty(self) -> float:
        """Extra fuel factor due to weather conditions"""
        penalty = 1.0
        if self.condition == "rain":
            penalty += 0.05
        if self.condition == "fog":
            penalty += 0.03
        if self.condition == "snow":
            penalty += 0.15
        if self.wind_speed_kmh > 40:
            penalty += 0.03
        return penalty
