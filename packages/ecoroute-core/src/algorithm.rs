// ================================================================
// ecoroute-core/src/algorithm.rs
//
// Contains:
//   1. green_dijkstra   — finds lowest carbon path
//   2. gdawa_star       — faster A* version of green_dijkstra
//   3. find_all_routes  — runs all 3 variants, returns comparison
//   4. Helpers          — reconstruct_path, total_distance, total_time
// ================================================================

use std::collections::BinaryHeap;

use crate::carbon::{carbon_cost, travel_time_minutes, Vehicle};
use crate::graph::{AllRoutes, Edge, OptimizeFor, RoadGraph, RouteResult};
use crate::heuristic::{carbon_heuristic, time_heuristic};
use crate::priority_queue::State;

// ================================================================
// ALGORITHM 1 — GREEN DIJKSTRA
// Finds the exact lowest-carbon path.
// Guaranteed optimal. Slower on very large graphs.
// Use for: short city routes, exact results, testing
// ================================================================
pub fn green_dijkstra(
    graph:   &RoadGraph,
    start:   usize,
    end:     usize,
    vehicle: &Vehicle,
) -> Option<RouteResult> {
    if start >= graph.node_count() || end >= graph.node_count() {
        return None;
    }

    let n = graph.node_count();
    let mut carbon   = vec![f64::INFINITY; n];
    let mut prev     = vec![None::<usize>; n];
    let mut visited  = vec![false; n];
    let mut heap     = BinaryHeap::new();

    carbon[start] = 0.0;
    heap.push(State { cost: 0.0, position: start });

    while let Some(State { cost, position }) = heap.pop() {
        if position == end { break; }
        if visited[position]  { continue; }
        visited[position] = true;

        for edge in graph.edges_from(position) {
            if edge.to >= n { continue; }

            let new_cost = cost + carbon_cost(edge, vehicle);

            if new_cost < carbon[edge.to] {
                carbon[edge.to]  = new_cost;
                prev[edge.to]    = Some(position);
                heap.push(State { cost: new_cost, position: edge.to });
            }
        }
    }

    if carbon[end].is_infinite() { return None; }

    let path     = reconstruct_path(&prev, start, end)?;
    let distance = total_distance(graph, &path);
    let time     = total_time(graph, &path);

    Some(RouteResult {
        total_carbon_kg:   carbon[end],
        total_distance_km: distance,
        total_time_min:    time,
        optimize_for:      OptimizeFor::Carbon,
        path,
    })
}

// ================================================================
// ALGORITHM 2 — GDAWA* (Green Dijkstra Adaptive Weighted A*)
//
// Upgrade over plain Dijkstra:
// Uses a heuristic to skip nodes that are clearly not on the
// optimal path. Up to 10x faster on large city graphs.
//
// weight_bias controls heuristic influence:
//   0.0 = pure Dijkstra (exact, slow)
//   1.0 = pure A*       (fast, exact if heuristic admissible)
//   1.5 = weighted A*   (faster, slightly suboptimal)
//
// Guaranteed optimal when weight_bias <= 1.0
// ================================================================
pub fn gdawa_star(
    graph:       &RoadGraph,
    start:       usize,
    end:         usize,
    vehicle:     &Vehicle,
    weight_bias: f64,
) -> Option<RouteResult> {
    if start >= graph.node_count() || end >= graph.node_count() {
        return None;
    }

    let n       = graph.node_count();
    let end_node = graph.node(end);

    let mut g_cost  = vec![f64::INFINITY; n]; // actual carbon so far
    let mut prev    = vec![None::<usize>; n];
    let mut visited = vec![false; n];
    let mut heap    = BinaryHeap::new();

    g_cost[start] = 0.0;
    let h_start   = carbon_heuristic(graph.node(start), end_node, vehicle);
    heap.push(State {
        cost:     g_cost[start] + weight_bias * h_start,
        position: start,
    });

    while let Some(State { position, .. }) = heap.pop() {
        if position == end  { break; }
        if visited[position] { continue; }
        visited[position] = true;

        for edge in graph.edges_from(position) {
            if edge.to >= n { continue; }

            let tentative_g = g_cost[position] + carbon_cost(edge, vehicle);

            if tentative_g < g_cost[edge.to] {
                g_cost[edge.to] = tentative_g;
                prev[edge.to]   = Some(position);

                let h = carbon_heuristic(graph.node(edge.to), end_node, vehicle);
                let f = tentative_g + weight_bias * h;
                heap.push(State { cost: f, position: edge.to });
            }
        }
    }

    if g_cost[end].is_infinite() { return None; }

    let path     = reconstruct_path(&prev, start, end)?;
    let distance = total_distance(graph, &path);
    let time     = total_time(graph, &path);

    Some(RouteResult {
        total_carbon_kg:   g_cost[end],
        total_distance_km: distance,
        total_time_min:    time,
        optimize_for:      OptimizeFor::Carbon,
        path,
    })
}

// ================================================================
// ALGORITHM 3 — TIME-OPTIMISED A* (fastest route)
// Same A* but edge weight = travel time, not carbon
// ================================================================
pub fn fastest_route(
    graph:   &RoadGraph,
    start:   usize,
    end:     usize,
    vehicle: &Vehicle,
) -> Option<RouteResult> {
    if start >= graph.node_count() || end >= graph.node_count() {
        return None;
    }

    let n        = graph.node_count();
    let end_node = graph.node(end);

    let mut g_cost  = vec![f64::INFINITY; n];
    let mut prev    = vec![None::<usize>; n];
    let mut visited = vec![false; n];
    let mut heap    = BinaryHeap::new();

    g_cost[start] = 0.0;
    let h_start   = time_heuristic(graph.node(start), end_node);
    heap.push(State { cost: h_start, position: start });

    while let Some(State { position, .. }) = heap.pop() {
        if position == end  { break; }
        if visited[position] { continue; }
        visited[position] = true;

        for edge in graph.edges_from(position) {
            if edge.to >= n { continue; }

            let tentative_g = g_cost[position] + travel_time_minutes(edge);

            if tentative_g < g_cost[edge.to] {
                g_cost[edge.to] = tentative_g;
                prev[edge.to]   = Some(position);

                let h = time_heuristic(graph.node(edge.to), end_node);
                heap.push(State {
                    cost:     tentative_g + h,
                    position: edge.to,
                });
            }
        }
    }

    if g_cost[end].is_infinite() { return None; }

    let path     = reconstruct_path(&prev, start, end)?;
    let distance = total_distance(graph, &path);
    let carbon   = total_carbon(graph, &path, vehicle);

    Some(RouteResult {
        total_carbon_kg:   carbon,
        total_distance_km: distance,
        total_time_min:    g_cost[end],
        optimize_for:      OptimizeFor::Time,
        path,
    })
}

// ================================================================
// ALGORITHM 4 — DISTANCE-OPTIMISED (shortest route)
// Edge weight = distance in km
// ================================================================
pub fn shortest_route(
    graph:   &RoadGraph,
    start:   usize,
    end:     usize,
    vehicle: &Vehicle,
) -> Option<RouteResult> {
    if start >= graph.node_count() || end >= graph.node_count() {
        return None;
    }

    let n = graph.node_count();
    let mut dist    = vec![f64::INFINITY; n];
    let mut prev    = vec![None::<usize>; n];
    let mut visited = vec![false; n];
    let mut heap    = BinaryHeap::new();

    dist[start] = 0.0;
    heap.push(State { cost: 0.0, position: start });

    while let Some(State { cost, position }) = heap.pop() {
        if position == end  { break; }
        if visited[position] { continue; }
        visited[position] = true;

        for edge in graph.edges_from(position) {
            if edge.to >= n { continue; }

            let new_dist = cost + edge.distance_km;

            if new_dist < dist[edge.to] {
                dist[edge.to] = new_dist;
                prev[edge.to] = Some(position);
                heap.push(State { cost: new_dist, position: edge.to });
            }
        }
    }

    if dist[end].is_infinite() { return None; }

    let path   = reconstruct_path(&prev, start, end)?;
    let time   = total_time(graph, &path);
    let carbon = total_carbon(graph, &path, vehicle);

    Some(RouteResult {
        total_carbon_kg:   carbon,
        total_distance_km: dist[end],
        total_time_min:    time,
        optimize_for:      OptimizeFor::Distance,
        path,
    })
}

// ================================================================
// FIND ALL ROUTES — runs all 3 variants and returns comparison
// This is what the API endpoint calls
// ================================================================
pub fn find_all_routes(
    graph:   &RoadGraph,
    start:   usize,
    end:     usize,
    vehicle: &Vehicle,
) -> Option<AllRoutes> {
    let greenest = gdawa_star(graph, start, end, vehicle, 1.0)?;
    let fastest  = fastest_route(graph, start, end, vehicle)?;
    let shortest = shortest_route(graph, start, end, vehicle)?;

    Some(AllRoutes { greenest, fastest, shortest })
}

// ================================================================
// HELPERS
// ================================================================

// Trace back through prev[] to reconstruct the path
fn reconstruct_path(
    prev:  &[Option<usize>],
    start: usize,
    end:   usize,
) -> Option<Vec<usize>> {
    let mut path    = Vec::new();
    let mut current = end;

    loop {
        path.push(current);
        if current == start { break; }
        current = prev[current]?;
    }

    path.reverse();
    Some(path)
}

// Sum distance of all edges along a path
pub fn total_distance(graph: &RoadGraph, path: &[usize]) -> f64 {
    path.windows(2)
        .filter_map(|w| {
            graph.edges_from(w[0])
                 .iter()
                 .find(|e| e.to == w[1])
                 .map(|e| e.distance_km)
        })
        .sum()
}

// Sum travel time of all edges along a path
pub fn total_time(graph: &RoadGraph, path: &[usize]) -> f64 {
    path.windows(2)
        .filter_map(|w| {
            graph.edges_from(w[0])
                 .iter()
                 .find(|e| e.to == w[1])
                 .map(|e| travel_time_minutes(e))
        })
        .sum()
}

// Calculate carbon for an already-computed path
// Used when fastest/shortest routes need their carbon calculated
pub fn total_carbon(graph: &RoadGraph, path: &[usize], vehicle: &Vehicle) -> f64 {
    path.windows(2)
        .filter_map(|w| {
            graph.edges_from(w[0])
                 .iter()
                 .find(|e| e.to == w[1])
                 .map(|e| carbon_cost(e, vehicle))
        })
        .sum()
}

// ================================================================
// Tests
// ================================================================
#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::{Node, Edge, RoadGraph};
    use crate::carbon::Vehicle;

    fn pune_graph() -> RoadGraph {
        // 0=Pune Station 1=Shivajinagar 2=Baner 3=Aundh 4=Wakad 5=Hinjewadi
        let nodes = vec![
            Node { id: 0, lat: 18.5285, lon: 73.8740 },
            Node { id: 1, lat: 18.5308, lon: 73.8474 },
            Node { id: 2, lat: 18.5590, lon: 73.7868 },
            Node { id: 3, lat: 18.5589, lon: 73.8087 },
            Node { id: 4, lat: 18.5935, lon: 73.7627 },
            Node { id: 5, lat: 18.5912, lon: 73.7380 },
        ];

        let adjacency = vec![
            vec![
                Edge { to: 1, distance_km: 3.2, speed_limit_kmh: 40.0,
                       current_speed_kmh: 15.0, gradient_pct: 0.5, num_signals: 4 },
                Edge { to: 3, distance_km: 5.1, speed_limit_kmh: 50.0,
                       current_speed_kmh: 35.0, gradient_pct: 0.2, num_signals: 2 },
            ],
            vec![
                Edge { to: 2, distance_km: 6.8, speed_limit_kmh: 60.0,
                       current_speed_kmh: 12.0, gradient_pct: 1.2, num_signals: 6 },
                Edge { to: 3, distance_km: 4.2, speed_limit_kmh: 50.0,
                       current_speed_kmh: 28.0, gradient_pct: 0.3, num_signals: 2 },
            ],
            vec![
                Edge { to: 5, distance_km: 5.5, speed_limit_kmh: 60.0,
                       current_speed_kmh: 10.0, gradient_pct: 0.8, num_signals: 5 },
            ],
            vec![
                Edge { to: 4, distance_km: 4.8, speed_limit_kmh: 60.0,
                       current_speed_kmh: 42.0, gradient_pct: 0.1, num_signals: 1 },
            ],
            vec![
                Edge { to: 5, distance_km: 3.9, speed_limit_kmh: 60.0,
                       current_speed_kmh: 50.0, gradient_pct: 0.0, num_signals: 1 },
            ],
            vec![],
        ];

        RoadGraph::new(nodes, adjacency)
    }

    #[test]
    fn test_dijkstra_finds_path() {
        let graph = pune_graph();
        let result = green_dijkstra(&graph, 0, 5, &Vehicle::Petrol);
        assert!(result.is_some(), "Should find a path");
        let r = result.unwrap();
        assert_eq!(r.path[0], 0);
        assert_eq!(*r.path.last().unwrap(), 5);
    }

    #[test]
    fn test_astar_same_result_as_dijkstra() {
        let graph   = pune_graph();
        let dijkstra = green_dijkstra(&graph, 0, 5, &Vehicle::Petrol).unwrap();
        let astar    = gdawa_star(&graph, 0, 5, &Vehicle::Petrol, 1.0).unwrap();

        let diff = (dijkstra.total_carbon_kg - astar.total_carbon_kg).abs();
        assert!(diff < 0.001, "A* and Dijkstra should give same carbon cost");
    }

    #[test]
    fn test_ev_has_zero_carbon() {
        let graph  = pune_graph();
        let result = green_dijkstra(&graph, 0, 5, &Vehicle::Ev).unwrap();
        assert_eq!(result.total_carbon_kg, 0.0);
    }

    #[test]
    fn test_no_path_returns_none() {
        let graph = pune_graph();
        // Node 5 has no outgoing edges — can't route from 5 to 0
        let result = green_dijkstra(&graph, 5, 0, &Vehicle::Petrol);
        assert!(result.is_none());
    }

    #[test]
    fn test_invalid_node_returns_none() {
        let graph  = pune_graph();
        let result = green_dijkstra(&graph, 0, 999, &Vehicle::Petrol);
        assert!(result.is_none());
    }

    #[test]
    fn test_find_all_routes() {
        let graph  = pune_graph();
        let routes = find_all_routes(&graph, 0, 5, &Vehicle::Petrol);
        assert!(routes.is_some());
        let r = routes.unwrap();
        // Greenest should have lowest carbon
        assert!(r.greenest.total_carbon_kg <= r.fastest.total_carbon_kg + 0.001);
        assert!(r.greenest.total_carbon_kg <= r.shortest.total_carbon_kg + 0.001);
        r.print_comparison();
    }

    #[test]
    fn test_diesel_more_carbon_than_cng() {
        let graph  = pune_graph();
        let diesel = green_dijkstra(&graph, 0, 5, &Vehicle::Diesel).unwrap();
        let cng    = green_dijkstra(&graph, 0, 5, &Vehicle::Cng).unwrap();
        assert!(diesel.total_carbon_kg > cng.total_carbon_kg);
    }
}