# ================================================================
# ecoroute-agent/agent/mcp_server.py
#
# EcoRoute MCP Server — allows LLMs to use EcoRoute as a native tool
# ================================================================

import asyncio
from mcp.server import Server
from .tools import find_greenest_route, compare_vehicle_emissions

app = Server("ecoroute-server")

@app.call_tool("find_route")
async def handle_find_route(arguments: dict):
    origin = arguments.get("origin")
    destination = arguments.get("destination")
    vehicle = arguments.get("vehicle", "petrol")
    return await find_greenest_route.run({"origin": origin, "destination": destination, "vehicle": vehicle})

@app.call_tool("compare_vehicles")
async def handle_compare(arguments: dict):
    origin = arguments.get("origin")
    destination = arguments.get("destination")
    return await compare_vehicle_emissions.run({"origin": origin, "destination": destination})

@app.list_tools()
async def list_tools():
    return [
        {
            "name": "find_route",
            "description": "Find sustainable routes between two locations.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string"},
                    "destination": {"type": "string"},
                    "vehicle": {"type": "string"}
                },
                "required": ["origin", "destination"]
            }
        },
        {
            "name": "compare_vehicles",
            "description": "Compare carbon emissions for different vehicle types.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "origin": {"type": "string"},
                    "destination": {"type": "string"}
                },
                "required": ["origin", "destination"]
            }
        }
    ]

if __name__ == "__main__":
    from mcp.server.stdio import stdio_server
    asyncio.run(stdio_server(app))
