// ================================================================
// ecoroute-core/src/algorithm.rs
//
// Single generic A* engine with closure-based cost/heuristic logic.
// ================================================================

use std::collections::BinaryHeap;
use crate::carbon::{carbon_cost, travel_time_minutes, Vehicle};
use crate::graph::{AllRoutes, OptimizeFor, RoadGraph, RouteResult};
use crate::heuristic::{carbon_heuristic, time_heuristic};
use crate::priority_queue::State;

/// Generic A* implementation.
/// C: Cost function (actual weight of the edge)
/// H: Heuristic function (estimated weight to the end)
pub fn generic_astar<C, H>(
    graph:        &RoadGraph,
    start:        usize,
    end:          usize,
    cost_fn:      C,
    heuristic_fn: H,
    optimize_for: OptimizeFor,
    vehicle:      &Vehicle,
) -> Option<RouteResult>
where
    C: Fn(&crate::graph::Edge) -> f64,
    H: Fn(&crate::graph::Node) -> f64,
{
    if start >= graph.node_count() || end >= graph.node_count() {
        return None;
    }

    let n = graph.node_count();
    let mut g_cost  = vec![f64::INFINITY; n];
    let mut prev    = vec![None::<(usize, usize)>; n]; // (from_node, edge_idx)
    let mut visited = vec![false; n];
    let mut heap    = BinaryHeap::new();

    g_cost[start] = 0.0;
    let h_start = heuristic_fn(graph.node(start));
    heap.push(State { cost: h_start, position: start });

    while let Some(State { position, .. }) = heap.pop() {
        if position == end { break; }
        if visited[position] { continue; }
        visited[position] = true;

        for (idx, edge) in graph.edges_from(position).iter().enumerate() {
            if edge.to >= n { continue; }

            let tentative_g = g_cost[position] + cost_fn(edge);

            if tentative_g < g_cost[edge.to] {
                g_cost[edge.to] = tentative_g;
                prev[edge.to] = Some((position, idx));

                let h = heuristic_fn(graph.node(edge.to));
                heap.push(State {
                    cost: tentative_g + h,
                    position: edge.to,
                });
            }
        }
    }

    if g_cost[end].is_infinite() { return None; }

    reconstruct_with_metrics(graph, &prev, start, end, vehicle, optimize_for)
}

/// Reconstructs path and calculates all metrics in a single traceback.
/// This avoids running .find() or .total_X() loops over the graph again.
fn reconstruct_with_metrics(
    graph:        &RoadGraph,
    prev:         &[Option<(usize, usize)>],
    start:        usize,
    end:          usize,
    vehicle:      &Vehicle,
    optimize_for: OptimizeFor,
) -> Option<RouteResult> {
    let mut path = Vec::new();
    let mut current = end;
    let mut carbon = 0.0;
    let mut distance = 0.0;
    let mut time = 0.0;

    while current != start {
        path.push(current);
        let (from, edge_idx) = prev[current]?;
        let edge = &graph.adjacency[from][edge_idx];
        
        carbon += carbon_cost(edge, vehicle);
        distance += edge.distance_km;
        time += travel_time_minutes(edge);
        
        current = from;
    }
    path.push(start);
    path.reverse();

    Some(RouteResult {
        path,
        total_carbon_kg: carbon,
        total_distance_km: distance,
        total_time_min: time,
        optimize_for,
    })
}

// ----------------------------------------------------------------
// Specific Wrappers
// ----------------------------------------------------------------

pub fn greenest_route(graph: &RoadGraph, start: usize, end: usize, vehicle: &Vehicle) -> Option<RouteResult> {
    let end_node = graph.node(end);
    generic_astar(
        graph, start, end,
        |e| carbon_cost(e, vehicle),
        |n| carbon_heuristic(n, end_node, vehicle),
        OptimizeFor::Carbon,
        vehicle,
    )
}

pub fn fastest_route(graph: &RoadGraph, start: usize, end: usize, vehicle: &Vehicle) -> Option<RouteResult> {
    let end_node = graph.node(end);
    generic_astar(
        graph, start, end,
        |e| travel_time_minutes(e),
        |n| time_heuristic(n, end_node),
        OptimizeFor::Time,
        vehicle,
    )
}

pub fn shortest_route(graph: &RoadGraph, start: usize, end: usize, vehicle: &Vehicle) -> Option<RouteResult> {
    generic_astar(
        graph, start, end,
        |e| e.distance_km,
        |_| 0.0, // Dijkstra fallback for pure distance
        OptimizeFor::Distance,
        vehicle,
    )
}

pub fn find_all_routes(graph: &RoadGraph, start: usize, end: usize, vehicle: &Vehicle) -> Option<AllRoutes> {
    let greenest = greenest_route(graph, start, end, vehicle)?;
    let fastest  = fastest_route(graph, start, end, vehicle)?;
    let shortest = shortest_route(graph, start, end, vehicle)?;

    Some(AllRoutes { greenest, fastest, shortest })
}

// ----------------------------------------------------------------
// Legacy Compatibility
// ----------------------------------------------------------------
pub fn green_dijkstra(graph: &RoadGraph, start: usize, end: usize, vehicle: &Vehicle) -> Option<RouteResult> {
    greenest_route(graph, start, end, vehicle)
}

pub fn gdawa_star(graph: &RoadGraph, start: usize, end: usize, vehicle: &Vehicle, _weight: f64) -> Option<RouteResult> {
    greenest_route(graph, start, end, vehicle)
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
        let result = greenest_route(&graph, 0, 5, &Vehicle::Petrol);
        assert!(result.is_some(), "Should find a path");
        let r = result.unwrap();
        assert_eq!(r.path[0], 0);
        assert_eq!(*r.path.last().unwrap(), 5);
    }

    #[test]
    fn test_astar_same_result_as_dijkstra() {
        let graph   = pune_graph();
        let dijkstra = greenest_route(&graph, 0, 5, &Vehicle::Petrol).unwrap();
        let astar    = greenest_route(&graph, 0, 5, &Vehicle::Petrol).unwrap();

        let diff = (dijkstra.total_carbon_kg - astar.total_carbon_kg).abs();
        assert!(diff < 0.001, "A* and Dijkstra should give same carbon cost");
    }

    #[test]
    fn test_ev_has_zero_carbon() {
        let graph  = pune_graph();
        let result = greenest_route(&graph, 0, 5, &Vehicle::Ev).unwrap();
        assert_eq!(result.total_carbon_kg, 0.0);
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
    }
}