mod green_dijkstra;

use green_dijkstra::{Edge, Vehicle, green_dijkstra};

fn main() {

    let graph = vec![
        // Node 0 
        vec![
            Edge { to: 1, distance_km: 3.2, speed_limit_kmh: 40.0,
                   current_speed_kmh: 15.0, gradient_pct: 0.5, num_signals: 4 },
            Edge { to: 3, distance_km: 5.1, speed_limit_kmh: 50.0,
                   current_speed_kmh: 35.0, gradient_pct: 0.2, num_signals: 2 },
        ],

        // Node 1 
        vec![
            Edge { to: 2, distance_km: 6.8, speed_limit_kmh: 60.0,
                   current_speed_kmh: 12.0, gradient_pct: 1.2, num_signals: 6 },
            Edge { to: 3, distance_km: 4.2, speed_limit_kmh: 50.0,
                   current_speed_kmh: 28.0, gradient_pct: 0.3, num_signals: 2 },
        ],

        // Node 2 
        vec![
            Edge { to: 5, distance_km: 5.5, speed_limit_kmh: 60.0,
                   current_speed_kmh: 10.0, gradient_pct: 0.8, num_signals: 5 },
        ],

        // Node 3 
        vec![
            Edge { to: 4, distance_km: 4.8, speed_limit_kmh: 60.0,
                   current_speed_kmh: 42.0, gradient_pct: 0.1, num_signals: 1 },
        ],

        // Node 4 
        vec![
            Edge { to: 5, distance_km: 3.9, speed_limit_kmh: 60.0,
                   current_speed_kmh: 50.0, gradient_pct: 0.0, num_signals: 1 },
        ],

        // Node 5 
        vec![],
    ];

    let start = 0;
    let end   = 5;

    println!("================================================================");
    println!("EcoRoute AI — Green Dijkstra");
    println!("From: Pune Railway Station  →  To: Hinjewadi IT Park");
    println!("================================================================\n");

    // Test all vehicle types
    let vehicles = vec![
        ("Petrol car", Vehicle::Petrol),
        ("Diesel car", Vehicle::Diesel),
        ("CNG car",    Vehicle::Cng),
        ("Hybrid car", Vehicle::Hybrid),
        ("EV car",     Vehicle::Ev),
    ];

    for (label, vehicle) in &vehicles {
        match green_dijkstra(&graph, start, end, vehicle) {
            Some(result) => {
                println!("Vehicle      : {}", label);
                println!("Path         : {:?}", result.path);
                println!("Distance     : {:.2} km", result.total_distance_km);
                println!("Carbon cost  : {:.4} kg CO2", result.total_carbon_kg);
                println!("Route taken  : {}", path_labels(&result.path));
                println!("----------------------------------------------------------------");
            }
            None => {
                println!("{}: No path found", label);
            }
        }
    }

    // Compare petrol vs EV on same route
    println!("\n================================================================");
    println!("Carbon comparison — Petrol vs EV");
    println!("================================================================");

    let petrol = green_dijkstra(&graph, start, end, &Vehicle::Petrol);
    let ev     = green_dijkstra(&graph, start, end, &Vehicle::Ev);

    if let (Some(p), Some(e)) = (petrol, ev) {
        let savings = p.total_carbon_kg - e.total_carbon_kg;
        println!("Petrol route carbon : {:.4} kg CO2", p.total_carbon_kg);
        println!("EV route carbon     : {:.4} kg CO2", e.total_carbon_kg);
        println!("CO2 saved by EV     : {:.4} kg", savings);
        println!("Phones charged equiv: {:.0}", savings / 0.00822);
    }
}

// Human-readable path labels for display
fn path_labels(path: &[usize]) -> String {
    let labels = [
        "Pune Station",
        "Shivajinagar",
        "Baner",
        "Aundh",
        "Wakad",
        "Hinjewadi",
    ];
    path.iter()
        .map(|&i| labels.get(i).copied().unwrap_or("Unknown"))
        .collect::<Vec<_>>()
        .join(" → ")
}