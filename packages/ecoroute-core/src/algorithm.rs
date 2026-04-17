use std::cmp::Ordering;
use std::collections::BinaryHeap;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub enum Vehical {
    HybridVehicle,
    DiselVehicle,
    GasVehicle,
    EvVehicle,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Edge {
    pub to: usize,
    pub weight: f64,
    pub vehical: Vehical,
    pub(crate) distance: (),
}

#[derive(Debug, Clone, PartialEq)]
struct State {
    position: usize,
    cost: f64,
}

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

fn carbon_cost_function(edge:&Edge,vehical:&Vehical)->f64{
    let cost = match vehical {
        Vehical::HybridVehicle => {
            let base = edge.weight *100.0;
            let regen = edge.weight * 10.0;
            base + regen
        },
        Vehical::GasVehicle => (edge.weight * 200.0)+(edge.weight.max(0.0) * 50.0),
        Vehical::EvVehicle => {
            let base = edge.weight *40.0;
            let regen = edge.weight *20.0;
            base+regen
        }
        Vehical::DiselVehicle => (edge.weight * 400.0) + (edge.weight.max(0.0) * 200.0),
    };
    cost.max(0.0)
}

pub fn green_dijkstra(
    graph : &[Vec<Edge>],
    start: usize,
    end: usize,
    vehical: &Vehical
)->Option<(f64,Vec<usize>)>{
    let mut carbon_cost = vec![f64::INFINITY; graph.len()];
    let mut prev :Vec<Option<usize>> = vec![None; graph.len()];
    let mut min_heap = BinaryHeap::new();

    if start >= graph.len() || end >= graph.len() {
        return None;
    }

    carbon_cost[start] = 0.0;
    min_heap.push(State { cost: 0.0, position: start }); 

    while let Some(State { cost, position }) = min_heap.pop() {
        if position == end {
            return reconstruct_path(&prev, start, end).map(|path| (cost, path));
        }

        if cost > carbon_cost[position] {
            continue;
        }

        for edge in &graph[position] {
            if edge.to >= graph.len() {
                continue;
            }
            let edge_cost = carbon_cost_function(edge,vehical);
            let new_cost = cost + edge_cost;
            if new_cost < carbon_cost[edge.to] {
                carbon_cost[edge.to] = new_cost;
                prev[edge.to] = Some(position);
                min_heap.push(State { cost: new_cost, position: edge.to });
            }
        }
    }
    None
}

fn reconstruct_path(prev: &[Option<usize>], start: usize, end: usize) -> Option<Vec<usize>> {
    if start >= prev.len() || end >= prev.len() {
        return None;
    }

    let mut path = Vec::new();
    let mut current = end;
    while current != start {
        path.push(current);
        current = match prev[current] {
            Some(prev_node) => prev_node,
            None => return None,
        };
    }
    path.push(start);
    path.reverse();
    Some(path)
}