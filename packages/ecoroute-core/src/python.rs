use crate::algorithm::find_all_routes;
use crate::carbon::Vehicle;
use crate::graph::{
    AllRoutes, Edge, Node, OptimizeFor, RoadGraph, RouteResult, SavingsEquivalents,
};
use pyo3::exceptions::PyRuntimeError;
use pyo3::prelude::*;

#[pyclass]
pub struct PyRoadGraph {
    pub inner: RoadGraph,
}

#[pymethods]
impl PyRoadGraph {
    #[new]
    pub fn new(nodes: Vec<Node>, adjacency: Vec<Vec<Edge>>) -> Self {
        PyRoadGraph {
            inner: RoadGraph::new(nodes, adjacency),
        }
    }

    pub fn node_count(&self) -> usize {
        self.inner.node_count()
    }

    pub fn nearest_node(&self, lat: f64, lon: f64) -> usize {
        self.inner.nearest_node(lat, lon)
    }

    pub fn get_node_coords(&self, node_id: usize) -> PyResult<(f64, f64)> {
        if node_id >= self.inner.nodes.len() {
            return Err(PyRuntimeError::new_err("Node ID out of bounds"));
        }
        let node = &self.inner.nodes[node_id];
        Ok((node.lat, node.lon))
    }
}

#[pyfunction]
pub fn calculate_routes(
    graph: &PyRoadGraph,
    start: usize,
    end: usize,
    vehicle_str: String,
) -> PyResult<AllRoutes> {
    let vehicle = match vehicle_str.to_lowercase().as_str() {
        "petrol" => Vehicle::Petrol,
        "diesel" => Vehicle::Diesel,
        "cng" => Vehicle::Cng,
        "hybrid" => Vehicle::Hybrid,
        "ev" => Vehicle::Ev,
        _ => return Err(PyRuntimeError::new_err("Invalid vehicle type")),
    };

    find_all_routes(&graph.inner, start, end, &vehicle)
        .ok_or_else(|| PyRuntimeError::new_err("No path found between nodes"))
}

#[pyclass]
pub struct PyCarbonAgent {
    pub inner: crate::rl_agent::CarbonAgent,
}

#[pymethods]
impl PyCarbonAgent {
    #[new]
    pub fn new() -> Self {
        PyCarbonAgent {
            inner: crate::rl_agent::CarbonAgent::new(),
        }
    }

    pub fn predict_penalty(
        &self,
        current_speed: f64,
        speed_limit: f64,
        num_signals: u32,
        gradient: f64,
    ) -> f64 {
        let state = crate::rl_agent::SegmentState::from_edge(
            current_speed,
            speed_limit,
            num_signals,
            gradient,
        );
        self.inner.predict_penalty(&state)
    }

    pub fn update(
        &mut self,
        current_speed: f64,
        speed_limit: f64,
        num_signals: u32,
        gradient: f64,
        realized_ratio: f64,
    ) {
        let state = crate::rl_agent::SegmentState::from_edge(
            current_speed,
            speed_limit,
            num_signals,
            gradient,
        );
        self.inner.update(state, realized_ratio);
    }

    pub fn save_json(&self) -> PyResult<String> {
        serde_json::to_string(&self.inner)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to serialize agent: {}", e)))
    }

    #[staticmethod]
    pub fn load_json(json: String) -> PyResult<Self> {
        let inner = serde_json::from_str(&json)
            .map_err(|e| PyRuntimeError::new_err(format!("Failed to parse agent: {}", e)))?;
        Ok(PyCarbonAgent { inner })
    }
}

#[pymodule]
fn ecoroute_core(_py: Python, m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<PyRoadGraph>()?;
    m.add_class::<PyCarbonAgent>()?;
    m.add_class::<AllRoutes>()?;
    m.add_class::<RouteResult>()?;
    m.add_class::<OptimizeFor>()?;
    m.add_class::<SavingsEquivalents>()?;
    m.add_function(wrap_pyfunction!(calculate_routes, m)?)?;
    Ok(())
}
