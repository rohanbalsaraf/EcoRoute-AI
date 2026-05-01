// ================================================================
// ecoroute-core/src/rl_agent.rs
//
// Reinforcement Learning Agent for Dynamic Carbon Penalty Prediction
// Uses Q-Learning to adjust edge weights based on real-time state.
// ================================================================

use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// State representation for a road segment.
/// Discretized to keep the state space manageable for Q-Learning.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SegmentState {
    pub congestion_level: u8, // 0-4 (Free flow to Gridlock)
    pub signal_density: u8,   // 0-2 (Low, Med, High)
    pub gradient_type: i8,    // -1, 0, 1 (Down, Flat, Up)
}

impl SegmentState {
    pub fn from_edge(current_speed: f64, speed_limit: f64, num_signals: u32, gradient: f64) -> Self {
        let ratio = if speed_limit > 0.0 { current_speed / speed_limit } else { 1.0 };
        
        let congestion = if ratio > 0.9 { 0 }
                        else if ratio > 0.7 { 1 }
                        else if ratio > 0.4 { 2 }
                        else if ratio > 0.1 { 3 }
                        else { 4 };

        let density = if num_signals <= 1 { 0 }
                     else if num_signals <= 4 { 1 }
                     else { 2 };

        let grad = if gradient > 1.0 { 1 }
                  else if gradient < -1.0 { -1 }
                  else { 0 };

        Self {
            congestion_level: congestion,
            signal_density: density,
            gradient_type: grad,
        }
    }
}

/// A simple Q-Learning agent that learns "Experience Penalties" for road segments.
/// It predicts a multiplier for the base carbon cost.
#[derive(Debug, Serialize, Deserialize)]
pub struct CarbonAgent {
    pub q_table: HashMap<SegmentState, f64>,
    pub learning_rate: f64,
    pub discount_factor: f64,
    pub epsilon: f64, // exploration rate
}

impl CarbonAgent {
    pub fn new() -> Self {
        Self {
            q_table: HashMap::new(),
            learning_rate: 0.1,
            discount_factor: 0.9,
            epsilon: 0.1,
        }
    }

    /// Predicts the carbon penalty multiplier for a given state.
    /// Returns a value typically between 1.0 and 2.0.
    pub fn predict_penalty(&self, state: &SegmentState) -> f64 {
        // Default to 1.0 (no extra penalty) if state unknown
        *self.q_table.get(state).unwrap_or(&1.0)
    }

    /// Updates the Q-table based on realized "real-world" carbon cost vs predicted.
    /// realized_ratio = (actual_measured_emissions / base_theoretical_emissions)
    pub fn update(&mut self, state: SegmentState, realized_ratio: f64) {
        let current_val = self.predict_penalty(&state);
        
        // Simple Q-update logic adapted for regression of a multiplier
        let new_val = current_val + self.learning_rate * (realized_ratio - current_val);
        
        // Clamp to sane values
        self.q_table.insert(state, new_val.clamp(0.8, 5.0));
    }

    /// Merges another agent's knowledge (useful for distributed fleet learning).
    pub fn merge(&mut self, other: &CarbonAgent) {
        for (state, &other_val) in &other.q_table {
            let entry = self.q_table.entry(*state).or_insert(1.0);
            *entry = (*entry + other_val) / 2.0;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state_discretization() {
        let state = SegmentState::from_edge(10.0, 60.0, 5, 2.0);
        assert_eq!(state.congestion_level, 3); // 16.6% ratio
        assert_eq!(state.signal_density, 2);   // 5 signals
        assert_eq!(state.gradient_type, 1);    // 2.0% gradient
    }

    #[test]
    fn test_agent_learning() {
        let mut agent = CarbonAgent::new();
        let state = SegmentState { congestion_level: 4, signal_density: 2, gradient_type: 1 };
        
        // Initial prediction
        assert_eq!(agent.predict_penalty(&state), 1.0);
        
        // Real world says it's 2.5x worse than theory
        agent.update(state, 2.5);
        
        // Should have increased
        assert!(agent.predict_penalty(&state) > 1.0);
        assert!(agent.predict_penalty(&state) < 2.5);
    }
}
