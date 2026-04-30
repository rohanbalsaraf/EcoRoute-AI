// ================================================================
// ecoroute-core/src/priority_queue.rs
// Min-heap State for Dijkstra and A*
// Rust's BinaryHeap is a max-heap by default —
// we flip the ordering so lowest cost = highest priority
// ================================================================

use std::cmp::Ordering;

// ----------------------------------------------------------------
// State — one entry in the priority queue
// ----------------------------------------------------------------
#[derive(Debug, Clone, PartialEq)]
pub struct State {
    pub cost:     f64,    // g_cost for Dijkstra, f_cost for A*
    pub position: usize,  // node index
}

// Flip ordering so BinaryHeap becomes a min-heap
impl PartialOrd for State {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        // other.cost vs self.cost  — reversed for min-heap
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
// Tests
// ----------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BinaryHeap;

    #[test]
    fn test_min_heap_pops_lowest_cost_first() {
        let mut heap = BinaryHeap::new();
        heap.push(State { cost: 5.0,  position: 0 });
        heap.push(State { cost: 1.0,  position: 1 });
        heap.push(State { cost: 10.0, position: 2 });
        heap.push(State { cost: 3.0,  position: 3 });

        // Should pop in ascending cost order
        assert_eq!(heap.pop().unwrap().cost, 1.0);
        assert_eq!(heap.pop().unwrap().cost, 3.0);
        assert_eq!(heap.pop().unwrap().cost, 5.0);
        assert_eq!(heap.pop().unwrap().cost, 10.0);
    }

    #[test]
    fn test_equal_costs_dont_panic() {
        let mut heap = BinaryHeap::new();
        heap.push(State { cost: 2.0, position: 0 });
        heap.push(State { cost: 2.0, position: 1 });
        // Should not panic
        assert!(heap.pop().is_some());
        assert!(heap.pop().is_some());
    }
}