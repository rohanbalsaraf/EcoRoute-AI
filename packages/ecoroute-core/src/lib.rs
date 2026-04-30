// ================================================================
// ecoroute-core/src/lib.rs
// Module declarations — public API of the ecoroute-core crate
// ================================================================

pub mod graph;           // Node, Edge, RoadGraph, RouteResult, AllRoutes
pub mod carbon;          // Vehicle, carbon_cost, travel_time_minutes
pub mod heuristic;       // haversine, carbon_heuristic, time_heuristic
pub mod priority_queue;  // State (min-heap ordering)
pub mod algorithm;       // green_dijkstra, gdawa_star, find_all_routes
pub use carbon::Vehicle;
pub use graph::{AllRoutes, Edge, Node, OptimizeFor, RoadGraph, RouteResult};
pub use algorithm::find_all_routes;