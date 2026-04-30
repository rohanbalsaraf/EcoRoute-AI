// ================================================================
// ecoroute-core/src/graph.rs
// Core data structures: Node, Edge, RoadGraph, RouteResult
// ================================================================

// ----------------------------------------------------------------
// Node — one intersection or point on the road network
// ----------------------------------------------------------------
#[derive(Debug, Clone)]
pub struct Node {
    pub id:  usize,
    pub lat: f64,
    pub lon: f64,
}

// ----------------------------------------------------------------
// Edge — one road segment connecting two nodes
// ----------------------------------------------------------------
#[derive(Debug, Clone)]
pub struct Edge {
    pub to:                usize,
    pub distance_km:       f64,
    pub speed_limit_kmh:   f64,
    pub current_speed_kmh: f64,
    pub gradient_pct:      f64,
    pub num_signals:       u32,
}

// ----------------------------------------------------------------
// OptimizeFor — what weight the algorithm minimises
// ----------------------------------------------------------------
#[derive(Debug, Clone, PartialEq)]
pub enum OptimizeFor {
    Carbon,    // lowest CO2  — green route
    Time,      // lowest time — fastest route
    Distance,  // lowest km   — shortest route
}

// ----------------------------------------------------------------
// RoadGraph — full road network for a city
// ----------------------------------------------------------------
pub struct RoadGraph {
    pub nodes:     Vec<Node>,
    pub adjacency: Vec<Vec<Edge>>,
}

impl RoadGraph {
    pub fn new(nodes: Vec<Node>, adjacency: Vec<Vec<Edge>>) -> Self {
        Self { nodes, adjacency }
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn edges_from(&self, node_id: usize) -> &[Edge] {
        &self.adjacency[node_id]
    }

    pub fn node(&self, id: usize) -> &Node {
        &self.nodes[id]
    }

    // Update live speed — called every 5 min by traffic merger
    pub fn update_speed(&mut self, from: usize, to: usize, new_speed_kmh: f64) {
        if let Some(edge) = self.adjacency[from].iter_mut().find(|e| e.to == to) {
            edge.current_speed_kmh = new_speed_kmh;
        }
    }

    // Find nearest node to a GPS coordinate — O(n) brute force
    // Replace with KD-tree for production
    pub fn nearest_node(&self, lat: f64, lon: f64) -> usize {
        use crate::heuristic::haversine;
        self.nodes
            .iter()
            .enumerate()
            .map(|(i, n)| (i, haversine(lat, lon, n.lat, n.lon)))
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
            .map(|(i, _)| i)
            .unwrap_or(0)
    }
}

// ----------------------------------------------------------------
// RouteResult — returned by the algorithm
// ----------------------------------------------------------------
#[derive(Debug, Clone)]
pub struct RouteResult {
    pub path:              Vec<usize>,
    pub total_carbon_kg:   f64,
    pub total_distance_km: f64,
    pub total_time_min:    f64,
    pub optimize_for:      OptimizeFor,
}

// ----------------------------------------------------------------
// SavingsEquivalents — human readable CO2 comparisons
// ----------------------------------------------------------------
#[derive(Debug)]
pub struct SavingsEquivalents {
    pub smartphones_charged:   f64,
    pub trees_days_equivalent: f64,
    pub km_not_driven:         f64,
}

impl RouteResult {
    pub fn savings_equivalents(saved_kg: f64) -> SavingsEquivalents {
        SavingsEquivalents {
            smartphones_charged:   saved_kg / 0.00822,
            trees_days_equivalent: saved_kg / (21.7 / 365.0),
            km_not_driven:         saved_kg / 0.21,
        }
    }
}

// ----------------------------------------------------------------
// AllRoutes — three-route comparison shown to users
// ----------------------------------------------------------------
#[derive(Debug)]
pub struct AllRoutes {
    pub greenest: RouteResult,
    pub fastest:  RouteResult,
    pub shortest: RouteResult,
}

impl AllRoutes {
    pub fn carbon_saved_vs_fastest(&self) -> f64 {
        (self.fastest.total_carbon_kg - self.greenest.total_carbon_kg).max(0.0)
    }

    pub fn print_comparison(&self) {
        println!("\n┌─────────────┬────────────┬──────────┬────────────┐");
        println!(  "│ Route       │ Distance   │ Time     │ Carbon     │");
        println!(  "├─────────────┼────────────┼──────────┼────────────┤");
        println!("│ Greenest ✓  │ {:>7.1} km │ {:>5.0} min │ {:>7.4} kg │",
            self.greenest.total_distance_km,
            self.greenest.total_time_min,
            self.greenest.total_carbon_kg);
        println!("│ Fastest     │ {:>7.1} km │ {:>5.0} min │ {:>7.4} kg │",
            self.fastest.total_distance_km,
            self.fastest.total_time_min,
            self.fastest.total_carbon_kg);
        println!("│ Shortest    │ {:>7.1} km │ {:>5.0} min │ {:>7.4} kg │",
            self.shortest.total_distance_km,
            self.shortest.total_time_min,
            self.shortest.total_carbon_kg);
        println!(  "└─────────────┴────────────┴──────────┴────────────┘");

        let saved = self.carbon_saved_vs_fastest();
        if saved > 0.0 {
            let eq = RouteResult::savings_equivalents(saved);
            println!("\nYou save {:.4} kg CO2 vs fastest route.", saved);
            println!("= {:.0} smartphones charged", eq.smartphones_charged);
            println!("= {:.1} km of petrol driving avoided", eq.km_not_driven);
        } else {
            println!("\nGreenest route is already the fastest.");
        }
    }
}