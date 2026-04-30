# ================================================================
# ecoroute-sdk/ecoroute/cli.py
# Command line interface
#
# Usage after pip install:
#   ecoroute route --from "Pune Station" --to "Hinjewadi" --vehicle petrol
#   ecoroute compare --from "Pune Station" --to "Hinjewadi"
#   ecoroute carbon --from "Pune Station" --to "Hinjewadi" --vehicle ev
# ================================================================

import asyncio
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
from .client import EcoRouteClient
from .models import VehicleType

console = Console()


@click.group()
@click.version_option(version="0.1.0", prog_name="ecoroute")
def main() -> None:
    """EcoRoute AI — Carbon-aware route optimizer"""
    pass


# ----------------------------------------------------------------
# ecoroute route
# ----------------------------------------------------------------
@main.command()
@click.option("--from", "origin",      required=True,  help="Origin location")
@click.option("--to",   "destination", required=True,  help="Destination location")
@click.option(
    "--vehicle", default="petrol",
    type=click.Choice(["petrol", "diesel", "cng", "hybrid", "ev"]),
    show_default=True,
    help="Vehicle fuel type",
)
@click.option("--all-routes", is_flag=True, help="Show all 3 routes (green/fast/short)")
def route(origin: str, destination: str, vehicle: str, all_routes: bool) -> None:
    """Find the greenest route between two places."""

    async def _run() -> None:
        client  = EcoRouteClient()
        console.print(f"\n[bold]Searching routes...[/bold] {origin} → {destination}\n")

        with console.status("[green]Running Green Dijkstra algorithm...[/green]"):
            result = await client.find_routes(origin, destination, vehicle)

        if result is None:
            console.print("[red]Could not find a route. Check location names.[/red]")
            return

        if all_routes:
            _print_comparison_table(result)
        else:
            _print_single_route(result)

    asyncio.run(_run())


# ----------------------------------------------------------------
# ecoroute compare
# ----------------------------------------------------------------
@main.command()
@click.option("--from", "origin",      required=True, help="Origin location")
@click.option("--to",   "destination", required=True, help="Destination location")
@click.option(
    "--vehicle", default="petrol",
    type=click.Choice(["petrol", "diesel", "cng", "hybrid", "ev"]),
    show_default=True,
)
def compare(origin: str, destination: str, vehicle: str) -> None:
    """Compare greenest vs fastest vs shortest route with carbon costs."""

    async def _run() -> None:
        client = EcoRouteClient()
        with console.status("[green]Comparing all routes...[/green]"):
            result = await client.find_routes(origin, destination, vehicle)

        if result is None:
            console.print("[red]No routes found.[/red]")
            return

        _print_comparison_table(result)

    asyncio.run(_run())


# ----------------------------------------------------------------
# ecoroute carbon
# ----------------------------------------------------------------
@main.command()
@click.option("--from", "origin",      required=True)
@click.option("--to",   "destination", required=True)
@click.option(
    "--vehicle", default="petrol",
    type=click.Choice(["petrol", "diesel", "cng", "hybrid", "ev"]),
    show_default=True,
)
def carbon(origin: str, destination: str, vehicle: str) -> None:
    """Show carbon cost for a specific trip and vehicle."""

    async def _run() -> None:
        client = EcoRouteClient()
        with console.status("[green]Calculating carbon cost...[/green]"):
            result = await client.find_routes(origin, destination, vehicle)

        if result is None:
            console.print("[red]No routes found.[/red]")
            return

        r = result.greenest
        console.print(Panel(
            f"[bold green]{r.total_carbon_kg:.4f} kg CO₂[/bold green]\n"
            f"Distance: {r.distance_str}  |  Time: {r.time_str}\n"
            f"Vehicle: {vehicle.upper()}\n\n"
            f"{result.savings_message}",
            title=f"Carbon cost: {origin} → {destination}",
            border_style="green",
        ))

    asyncio.run(_run())


# ----------------------------------------------------------------
# ecoroute vehicles
# ----------------------------------------------------------------
@main.command()
@click.option("--from", "origin",      required=True)
@click.option("--to",   "destination", required=True)
def vehicles(origin: str, destination: str) -> None:
    """Compare carbon cost of all vehicle types for a route."""

    async def _run() -> None:
        client = EcoRouteClient()
        table  = Table(title=f"Vehicle Comparison: {origin} → {destination}")
        table.add_column("Vehicle",  style="cyan")
        table.add_column("Distance", justify="right")
        table.add_column("Time",     justify="right")
        table.add_column("Carbon",   justify="right", style="green")

        for vtype in VehicleType:
            with console.status(f"Checking {vtype.label()}..."):
                result = await client.find_routes(origin, destination, vtype)
            if result:
                r = result.greenest
                table.add_row(
                    vtype.label(),
                    r.distance_str,
                    r.time_str,
                    r.carbon_str,
                )

        console.print(table)

    asyncio.run(_run())


# ----------------------------------------------------------------
# Rich display helpers
# ----------------------------------------------------------------
def _print_single_route(result) -> None:
    r = result.greenest
    console.print(Panel(
        f"[bold]Path:[/bold] {' → '.join(w.name for w in r.waypoints)}\n"
        f"[bold]Distance:[/bold] {r.distance_str}\n"
        f"[bold]Time:[/bold] {r.time_str}\n"
        f"[bold green]Carbon:[/bold green] {r.carbon_str}\n\n"
        f"[italic]{result.savings_message}[/italic]",
        title=f"[green]Greenest Route ✓[/green] ({result.vehicle.label()})",
        border_style="green",
    ))


def _print_comparison_table(result) -> None:
    table = Table(title=f"{result.origin.name} → {result.destination.name}")
    table.add_column("Route",    style="bold")
    table.add_column("Distance", justify="right")
    table.add_column("Time",     justify="right")
    table.add_column("Carbon",   justify="right")

    table.add_row(
        "[green]Greenest ✓[/green]",
        result.greenest.distance_str,
        result.greenest.time_str,
        f"[green]{result.greenest.carbon_str}[/green]",
    )
    table.add_row(
        "Fastest",
        result.fastest.distance_str,
        result.fastest.time_str,
        result.fastest.carbon_str,
    )
    table.add_row(
        "Shortest",
        result.shortest.distance_str,
        result.shortest.time_str,
        result.shortest.carbon_str,
    )

    console.print(table)
    console.print(f"\n[italic]{result.savings_message}[/italic]\n")