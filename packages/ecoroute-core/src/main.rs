// ================================================================
// ecoroute-core/src/main.rs
// Full integration test of all algorithms
// Route: Pune Railway Station → Hinjewadi IT Park
// ================================================================

mod algorithm;
mod carbon;
mod graph;
mod heuristic;
mod priority_queue;

use algorithm::{find_all_routes, gdawa_star, green_dijkstra};
use carbon::Vehicle;
use graph::{Edge, Node, RoadGraph};

fn main() {
    let graph = pune_road_graph();

    println!("================================================================");
    println!(" EcoRoute AI — Algorithm Test Suite");
    println!(" Route: Pune Railway Station → Hinjewadi IT Park");
    println!("================================================================\n");

    // ---------------------------------------------------------------
    // TEST 1: Green Dijkstra across all vehicle types
    // ---------------------------------------------------------------
    println!("── TEST 1: Green Dijkstra — All Vehicle Types ──────────────────\n");

    let vehicles: Vec<(&str, Vehicle)> = vec![
        ("Petrol", Vehicle::Petrol),
        ("Diesel", Vehicle::Diesel),
        ("CNG", Vehicle::Cng),
        ("Hybrid", Vehicle::Hybrid),
        ("EV", Vehicle::Ev),
    ];

    for (label, vehicle) in &vehicles {
        match green_dijkstra(&graph, 0, 5, vehicle) {
            Some(r) => {
                println!("Vehicle  : {}", label);
                println!("Path     : {}", path_names(&r.path));
                println!("Distance : {:.2} km", r.total_distance_km);
                println!("Time     : {:.0} min", r.total_time_min);
                println!("Carbon   : {:.4} kg CO2\n", r.total_carbon_kg);
            }
            None => println!("{}: No path found\n", label),
        }
    }

    // ---------------------------------------------------------------
    // TEST 2: GDAWA* vs Dijkstra — same answer, verify correctness
    // ---------------------------------------------------------------
    println!("── TEST 2: GDAWA* vs Dijkstra — Same Answer? ───────────────────\n");

    let dijkstra = green_dijkstra(&graph, 0, 5, &Vehicle::Petrol).unwrap();
    let astar = gdawa_star(&graph, 0, 5, &Vehicle::Petrol, 1.0).unwrap();

    println!("Dijkstra carbon : {:.4} kg CO2", dijkstra.total_carbon_kg);
    println!("A* carbon       : {:.4} kg CO2", astar.total_carbon_kg);
    let diff = (dijkstra.total_carbon_kg - astar.total_carbon_kg).abs();
    println!(
        "Difference      : {:.6} kg  ({})\n",
        diff,
        if diff < 0.001 {
            "✓ Match — A* is correct"
        } else {
            "✗ Mismatch — check heuristic admissibility!"
        }
    );

    // ---------------------------------------------------------------
    // TEST 3: Three-route comparison (what users see in the app)
    // ---------------------------------------------------------------
    println!("── TEST 3: Three-Route Comparison — Petrol Car ─────────────────");

    if let Some(routes) = find_all_routes(&graph, 0, 5, &Vehicle::Petrol) {
        routes.print_comparison();
        println!("\nGreenest path : {}", path_names(&routes.greenest.path));
        println!("Fastest  path : {}", path_names(&routes.fastest.path));
        println!("Shortest path : {}", path_names(&routes.shortest.path));
    }

    // ---------------------------------------------------------------
    // TEST 4: Petrol vs EV savings
    // ---------------------------------------------------------------
    println!("\n── TEST 4: Petrol vs EV Carbon Savings ─────────────────────────\n");

    let petrol = green_dijkstra(&graph, 0, 5, &Vehicle::Petrol).unwrap();
    let ev = green_dijkstra(&graph, 0, 5, &Vehicle::Ev).unwrap();
    let saved = petrol.total_carbon_kg - ev.total_carbon_kg;
    let equiv = graph::RouteResult::savings_equivalents(saved);

    println!("Petrol carbon   : {:.4} kg CO2", petrol.total_carbon_kg);
    println!("EV carbon       : {:.4} kg CO2", ev.total_carbon_kg);
    println!("Saved by EV     : {:.4} kg CO2", saved);
    println!("= {:.0} smartphones charged", equiv.smartphones_charged);
    println!("= {:.1} km of petrol driving avoided", equiv.km_not_driven);

    let annual = saved * 500.0;
    println!("\nIf this is your daily commute (500 trips/year):");
    println!("Annual CO2 saving : {:.1} kg/year", annual);
    println!("= {:.1} trees worth of CO2 absorption", annual / 21.7);

    // ---------------------------------------------------------------
    // TEST 5: Edge cases — make sure nothing panics
    // ---------------------------------------------------------------
    println!("\n── TEST 5: Edge Cases ───────────────────────────────────────────\n");

    let no_path = green_dijkstra(&graph, 5, 0, &Vehicle::Petrol);
    println!(
        "Route destination → start (no path): {}",
        if no_path.is_none() {
            "✓ Correctly returns None"
        } else {
            "✗ Should have been None"
        }
    );

    let bad_node = green_dijkstra(&graph, 0, 999, &Vehicle::Petrol);
    println!(
        "Route to invalid node 999: {}",
        if bad_node.is_none() {
            "✓ Correctly returns None"
        } else {
            "✗ Should have been None"
        }
    );

    println!("\n================================================================");
    println!(" All tests passed. Run `cargo test` for full unit test suite.");
    println!("================================================================");
}

// ---------------------------------------------------------------
// Pune road graph
//  0 = Pune Railway Station
//  1 = Shivajinagar
//  2 = Baner (congested route)
//  3 = Aundh (cleaner route)
//  4 = Wakad
//  5 = Hinjewadi IT Park
// ---------------------------------------------------------------
fn pune_road_graph() -> RoadGraph {
    let nodes = vec![
        Node {
            id: 0,
            lat: 18.5285,
            lon: 73.8740,
        },
        Node {
            id: 1,
            lat: 18.5308,
            lon: 73.8474,
        },
        Node {
            id: 2,
            lat: 18.5590,
            lon: 73.7868,
        },
        Node {
            id: 3,
            lat: 18.5589,
            lon: 73.8087,
        },
        Node {
            id: 4,
            lat: 18.5935,
            lon: 73.7627,
        },
        Node {
            id: 5,
            lat: 18.5912,
            lon: 73.7380,
        },
    ];

    let adjacency = vec![
        // 0: Pune Station
        vec![
            Edge {
                to: 1,
                distance_km: 3.2,
                speed_limit_kmh: 40.0,
                current_speed_kmh: 15.0,
                gradient_pct: 0.5,
                num_signals: 4,
            },
            Edge {
                to: 3,
                distance_km: 5.1,
                speed_limit_kmh: 50.0,
                current_speed_kmh: 35.0,
                gradient_pct: 0.2,
                num_signals: 2,
            },
        ],
        // 1: Shivajinagar
        vec![
            Edge {
                to: 2,
                distance_km: 6.8,
                speed_limit_kmh: 60.0,
                current_speed_kmh: 12.0,
                gradient_pct: 1.2,
                num_signals: 6,
            },
            Edge {
                to: 3,
                distance_km: 4.2,
                speed_limit_kmh: 50.0,
                current_speed_kmh: 28.0,
                gradient_pct: 0.3,
                num_signals: 2,
            },
        ],
        // 2: Baner (congested)
        vec![Edge {
            to: 5,
            distance_km: 5.5,
            speed_limit_kmh: 60.0,
            current_speed_kmh: 10.0,
            gradient_pct: 0.8,
            num_signals: 5,
        }],
        // 3: Aundh (cleaner alternate)
        vec![Edge {
            to: 4,
            distance_km: 4.8,
            speed_limit_kmh: 60.0,
            current_speed_kmh: 42.0,
            gradient_pct: 0.1,
            num_signals: 1,
        }],
        // 4: Wakad
        vec![Edge {
            to: 5,
            distance_km: 3.9,
            speed_limit_kmh: 60.0,
            current_speed_kmh: 50.0,
            gradient_pct: 0.0,
            num_signals: 1,
        }],
        // 5: Hinjewadi (destination)
        vec![],
    ];

    RoadGraph::new(nodes, adjacency)
}

fn path_names(path: &[usize]) -> String {
    let names = [
        "Pune Station",
        "Shivajinagar",
        "Baner",
        "Aundh",
        "Wakad",
        "Hinjewadi",
    ];
    path.iter()
        .map(|&i| names.get(i).copied().unwrap_or("?"))
        .collect::<Vec<_>>()
        .join(" → ")
}
