# ================================================================
# ecoroute-agent/agent/tools.py
#
# LLM Tool definitions for the EcoRoute Assistant
# ================================================================

from typing import Optional
from langchain.tools import tool
from ecoroute import EcoRouteClient

# Initialize global client
client = EcoRouteClient()

@tool
async def find_greenest_route(origin: str, destination: str, vehicle: str = "petrol") -> str:
    """
    Finds the eco-friendly, fastest, and shortest routes between two locations.
    Use this when the user asks for directions or wants to know how to get somewhere sustainably.
    """
    try:
        routes = await client.find_routes(origin, destination, vehicle)
        if not routes:
            return f"Sorry, I couldn't find a route from {origin} to {destination}."
        
        return routes.savings_message
    except Exception as e:
        return f"Error finding route: {str(e)}"

@tool
async def compare_vehicle_emissions(origin: str, destination: str) -> str:
    """
    Compares carbon emissions across all vehicle types (EV, Hybrid, Petrol, etc.) for a specific trip.
    Use this when the user asks 'Which vehicle should I use?' or 'How much would I save with an EV?'.
    """
    try:
        vehicles = ["petrol", "diesel", "cng", "hybrid", "ev"]
        results = []
        
        for v in vehicles:
            res = await client.find_routes(origin, destination, v)
            if res:
                results.append(f"- {v.upper()}: {res.greenest.total_carbon_kg:.2f} kg CO2")
        
        if not results:
            return "No data available for this trip."
            
        return "Carbon Footprint Comparison:\n" + "\n".join(results)
    except Exception as e:
        return f"Error comparing vehicles: {str(e)}"

@tool
def get_eco_tips() -> str:
    """
    Returns general tips for reducing carbon footprint while driving.
    Use this for advice on sustainable travel.
    """
    return (
        "1. Maintain steady speeds: Avoiding rapid acceleration can save up to 15% fuel.\n"
        "2. Keep tires inflated: Low pressure increases rolling resistance.\n"
        "3. Reduce idle time: Turn off the engine if stopped for more than 60 seconds.\n"
        "4. Use regenerative braking: If in an EV, use B-mode to maximize energy recovery."
    )
