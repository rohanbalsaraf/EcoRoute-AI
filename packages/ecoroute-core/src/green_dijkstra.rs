// ================================================================
// ecoroute-core/src/green_dijkstra.rs
// Green Dijkstra — finds lowest carbon path between two nodes
// ================================================================

use std::cmp::Ordering;
use std::collections::BinaryHeap;

// ----------------------------------------------------------------
// Vehicle — belongs to the traveller, not the road
// ----------------------------------------------------------------
#[derive(Debug, Clone)]
pub enum Vehicle {
    Petrol,
    Diesel,
    Cng,
    Hybrid,
    Ev,
}

impl Vehicle {
    // Litres of fuel burned per km at steady speed
    pub fn consumption_per_km(&self) -> f64 {
        match self {
            Vehicle::Petrol => 0.06,
            Vehicle::Diesel => 0.055,
            Vehicle::Cng    => 0.05,
            Vehicle::Hybrid => 0.035,
            Vehicle::Ev     => 0.0,   // no fuel, uses kWh separately
        }
    }

    // Litres burned per hour while idling (stopped at signals)
    pub fn idle_consumption_per_hour(&self) -> f64 {
        match self {
            Vehicle::Petrol => 0.5,
            Vehicle::Diesel => 0.55,
            Vehicle::Cng    => 0.45,
            Vehicle::Hybrid => 0.1,   
            Vehicle::Ev     => 0.0,
        }
    }

    // kg of CO2 produced per litre of fuel burned
    pub fn emission_factor(&self) -> f64 {
        match self {
            Vehicle::Petrol => 2.31,
            Vehicle::Diesel => 2.68,
            Vehicle::Cng    => 1.63,
            Vehicle::Hybrid => 2.31, 
            Vehicle::Ev     => 0.0,   
        }
    }
}

// ----------------------------------------------------------------
// Edge — one road segment between two nodes
// ----------------------------------------------------------------
#[derive(Debug, Clone)]
pub struct Edge {
    pub to: usize,              // destination node index

    // Physical road properties
    pub distance_km: f64,       // length of this road segment
    pub speed_limit_kmh: f64,   // max legal speed
    pub current_speed_kmh: f64, // live speed from traffic API (0 = jammed)
    pub gradient_pct: f64,      // uphill = positive, downhill = negative
    pub num_signals: u32,       // traffic lights on this segment
}

// ----------------------------------------------------------------
// Calculates kg CO2 for one vehicle traversing one edge
// ----------------------------------------------------------------
pub fn carbon_cost(edge: &Edge, vehicle: &Vehicle) -> f64 {
    // Every 1% uphill = 3% more fuel burned
    // Downhill gives slight recovery but not full regeneration
    let gradient_penalty = if edge.gradient_pct > 0.0 {
        1.0 + (edge.gradient_pct * 0.03)
    } else if edge.gradient_pct < 0.0 {
        1.0 + (edge.gradient_pct * 0.01)  // small recovery
    } else {
        1.0
    };

    // Low speed ratio = heavy congestion = lots of braking + accelerating
    let speed_ratio = if edge.speed_limit_kmh > 0.0 {
        edge.current_speed_kmh / edge.speed_limit_kmh
    } else {
        1.0
    };

    let accel_penalty = if speed_ratio < 0.3 {
        1.5   // severe congestion — 50% extra fuel
    } else if speed_ratio < 0.5 {
        1.25  // moderate congestion — 25% extra fuel
    } else if speed_ratio < 0.7 {
        1.1   // light congestion — 10% extra fuel
    } else {
        1.0   // free flow — no penalty
    };

    let moving_fuel = edge.distance_km
        * vehicle.consumption_per_km()
        * gradient_penalty
        * accel_penalty;

    // Average red light wait = 45 seconds
    let idle_time_hours = (edge.num_signals as f64 * 45.0) / 3600.0;
    let idle_fuel = idle_time_hours * vehicle.idle_consumption_per_hour();

    // --- Step 5: total fuel to kg CO2 ---
    let total_fuel = moving_fuel + idle_fuel;
    let carbon_kg = total_fuel * vehicle.emission_factor();

    carbon_kg.max(0.0)
}

// ----------------------------------------------------------------
// State — node in the priority queue
// ----------------------------------------------------------------
#[derive(Debug, Clone, PartialEq)]
struct State {
    cost: f64,
    position: usize,
}

// Min-heap: lower cost = higher priority
impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        other.cost.partial_cmp(&self.cost)
    }
}

impl Ord for State {
    fn cmp(&self, other: &Self) -> Ordering {
        self.partial_cmp(other).unwrap_or(Ordering::Equal)
    }
}

impl Eq for State {}

// ----------------------------------------------------------------
// Route result — returned to the caller
// ----------------------------------------------------------------
#[derive(Debug)]
pub struct RouteResult {
    pub path: Vec<usize>,         // ordered list of node indices
    pub total_carbon_kg: f64,     // total CO2 for this route
    pub total_distance_km: f64,   // total distance
}

// ----------------------------------------------------------------
// Green Dijkstra — main algorithm
// Finds the path with minimum carbon cost from start to end
// ----------------------------------------------------------------
pub fn green_dijkstra(
    graph: &[Vec<Edge>],
    start: usize,
    end: usize,
    vehicle: &Vehicle,
) -> Option<RouteResult> {

    // bounds check
    if start >= graph.len() || end >= graph.len() {
        return None;
    }

    let n = graph.len();
    let mut carbon_cost_arr = vec![f64::INFINITY; n];
    let mut prev: Vec<Option<usize>> = vec![None; n];
    let mut visited = vec![false; n];
    let mut min_heap = BinaryHeap::new();

    carbon_cost_arr[start] = 0.0;
    min_heap.push(State { cost: 0.0, position: start });

    while let Some(State { cost, position }) = min_heap.pop() {

        if position == end {
            break;
        }

        if visited[position] {
            continue;
        }
        visited[position] = true;

        for edge in &graph[position] {
            if edge.to >= n {
                continue;
            }

            let edge_carbon = carbon_cost(edge, vehicle);
            let new_cost = cost + edge_carbon;

            if new_cost < carbon_cost_arr[edge.to] {
                carbon_cost_arr[edge.to] = new_cost;
                prev[edge.to] = Some(position);
                min_heap.push(State {
                    cost: new_cost,
                    position: edge.to,
                });
            }
        }
    }

    if carbon_cost_arr[end].is_infinite() {
        return None;
    }

    // reconstruct path and calculate total distance
    let path = reconstruct_path(&prev, start, end)?;
    let total_distance = calculate_total_distance(graph, &path);

    Some(RouteResult {
        total_carbon_kg: carbon_cost_arr[end],
        total_distance_km: total_distance,
        path,
    })
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

fn reconstruct_path(
    prev: &[Option<usize>],
    start: usize,
    end: usize,
) -> Option<Vec<usize>> {
    let mut path = Vec::new();
    let mut current = end;

    loop {
        path.push(current);
        if current == start {
            break;
        }
        current = prev[current]?;
    }

    path.reverse();
    Some(path)
}

fn calculate_total_distance(graph: &[Vec<Edge>], path: &[usize]) -> f64 {
    let mut total = 0.0;
    for i in 0..path.len().saturating_sub(1) {
        let from = path[i];
        let to = path[i + 1];
        if let Some(edge) = graph[from].iter().find(|e| e.to == to) {
            total += edge.distance_km;
        }
    }
    total
}