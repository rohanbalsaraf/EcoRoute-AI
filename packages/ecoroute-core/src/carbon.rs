// ================================================================
// ecoroute-core/src/carbon.rs
// Vehicle definitions + carbon cost function for one road edge
// ================================================================

use crate::graph::Edge;

use serde::{Deserialize, Serialize};

// ----------------------------------------------------------------
// Vehicle — belongs to the traveller, not the road
// ----------------------------------------------------------------
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Vehicle {
    Petrol,
    Diesel,
    Cng,
    Hybrid,
    Ev,
}

impl Vehicle {
    // Litres of fuel burned per km at steady free-flow speed
    pub fn consumption_per_km(&self) -> f64 {
        match self {
            Vehicle::Petrol => 0.06,
            Vehicle::Diesel => 0.055,
            Vehicle::Cng => 0.05,
            Vehicle::Hybrid => 0.035,
            Vehicle::Ev => 0.0,
        }
    }

    // Litres burned per hour while engine is idling at a signal
    pub fn idle_consumption_per_hour(&self) -> f64 {
        match self {
            Vehicle::Petrol => 0.50,
            Vehicle::Diesel => 0.55,
            Vehicle::Cng => 0.45,
            Vehicle::Hybrid => 0.10, // hybrid shuts engine at idle
            Vehicle::Ev => 0.0,
        }
    }

    // kg of CO2 produced per litre of fuel burned
    pub fn emission_factor(&self) -> f64 {
        match self {
            Vehicle::Petrol => 2.31,
            Vehicle::Diesel => 2.68,
            Vehicle::Cng => 1.63,
            Vehicle::Hybrid => 2.31,
            Vehicle::Ev => 0.0, // zero tailpipe emissions
        }
    }

    // Human readable label
    #[allow(dead_code)]
    pub fn label(&self) -> &str {
        match self {
            Vehicle::Petrol => "Petrol",
            Vehicle::Diesel => "Diesel",
            Vehicle::Cng => "CNG",
            Vehicle::Hybrid => "Hybrid",
            Vehicle::Ev => "EV",
        }
    }
}

// Physics & Environmental Constants
const GRADIENT_UPHILL_FACTOR: f64 = 0.03; // 3% penalty per 1% slope
const GRADIENT_DOWNHILL_FACTOR: f64 = 0.01; // 1% recovery per 1% slope
const AVG_SIGNAL_WAIT_SECONDS: f64 = 45.0;
const MAX_ACCEL_PENALTY: f64 = 0.5; // Up to 50% extra fuel in congestion

// ----------------------------------------------------------------
// carbon_cost — kg CO2 for one vehicle on one road segment
//
// Formula:
//   moving_fuel = distance × consumption × gradient × accel
//   idle_fuel   = signal_wait_hours × idle_consumption
//   carbon      = (moving_fuel + idle_fuel) × emission_factor
// ----------------------------------------------------------------
pub fn carbon_cost(edge: &Edge, vehicle: &Vehicle) -> f64 {
    // --- gradient penalty ---
    let gradient_penalty = if edge.gradient_pct > 0.0 {
        1.0 + (edge.gradient_pct * GRADIENT_UPHILL_FACTOR)
    } else if edge.gradient_pct < 0.0 {
        1.0 + (edge.gradient_pct * GRADIENT_DOWNHILL_FACTOR)
    } else {
        1.0
    };

    // --- acceleration penalty from stop-go traffic ---
    // speed_ratio = how much of speed limit is actually being used
    let speed_ratio = if edge.speed_limit_kmh > 0.0 {
        (edge.current_speed_kmh / edge.speed_limit_kmh).clamp(0.0, 1.0)
    } else {
        1.0
    };

    // Continuous penalty function: 1.0 at free flow, 1.5 at dead stop
    let accel_penalty = 1.0 + MAX_ACCEL_PENALTY * (1.0 - speed_ratio).powi(2);

    // --- fuel burned while moving ---
    let moving_fuel =
        edge.distance_km * vehicle.consumption_per_km() * gradient_penalty * accel_penalty;

    // --- fuel burned idling at red lights ---
    let idle_time_hours = (edge.num_signals as f64 * AVG_SIGNAL_WAIT_SECONDS) / 3600.0;
    let idle_fuel = idle_time_hours * vehicle.idle_consumption_per_hour();

    // --- convert fuel to carbon ---
    let total_fuel = moving_fuel + idle_fuel;
    (total_fuel * vehicle.emission_factor()).max(0.0)
}

// ----------------------------------------------------------------
// travel_time_minutes — used when optimising for time not carbon
// ----------------------------------------------------------------
pub fn travel_time_minutes(edge: &Edge) -> f64 {
    let speed = if edge.current_speed_kmh > 0.0 {
        edge.current_speed_kmh
    } else {
        5.0 // crawling in jam
    };
    let moving_min = (edge.distance_km / speed) * 60.0;
    let signal_min = (edge.num_signals as f64 * AVG_SIGNAL_WAIT_SECONDS) / 60.0;
    moving_min + signal_min
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::Edge;

    fn sample_edge() -> Edge {
        Edge {
            to: 1,
            distance_km: 5.0,
            speed_limit_kmh: 60.0,
            current_speed_kmh: 50.0,
            gradient_pct: 0.0,
            num_signals: 2,
        }
    }

    #[test]
    fn ev_always_zero_carbon() {
        let edge = sample_edge();
        let cost = carbon_cost(&edge, &Vehicle::Ev);
        assert_eq!(cost, 0.0, "EV should always have 0 carbon cost");
    }

    #[test]
    fn diesel_more_than_petrol() {
        let edge = sample_edge();
        let petrol = carbon_cost(&edge, &Vehicle::Petrol);
        let diesel = carbon_cost(&edge, &Vehicle::Diesel);
        assert!(diesel > petrol, "Diesel should emit more than petrol");
    }

    #[test]
    fn congestion_increases_cost() {
        let mut free_flow = sample_edge();
        free_flow.current_speed_kmh = 55.0; // 92% of limit

        let mut congested = sample_edge();
        congested.current_speed_kmh = 10.0; // 17% of limit

        let cost_free = carbon_cost(&free_flow, &Vehicle::Petrol);
        let cost_cong = carbon_cost(&congested, &Vehicle::Petrol);
        assert!(cost_cong > cost_free, "Congested road should cost more");
    }

    #[test]
    fn uphill_increases_cost() {
        let mut flat = sample_edge();
        flat.gradient_pct = 0.0;

        let mut uphill = sample_edge();
        uphill.gradient_pct = 5.0;

        let cost_flat = carbon_cost(&flat, &Vehicle::Petrol);
        let cost_uphill = carbon_cost(&uphill, &Vehicle::Petrol);
        assert!(cost_uphill > cost_flat, "Uphill should cost more");
    }

    #[test]
    fn more_signals_increases_cost() {
        let mut few = sample_edge();
        few.num_signals = 1;

        let mut many = sample_edge();
        many.num_signals = 8;

        let cost_few = carbon_cost(&few, &Vehicle::Petrol);
        let cost_many = carbon_cost(&many, &Vehicle::Petrol);
        assert!(cost_many > cost_few, "More signals should cost more");
    }
}
