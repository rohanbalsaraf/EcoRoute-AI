// ================================================================
// ecoroute-core/src/heuristic.rs
// Haversine distance + A* admissible carbon heuristic
// ================================================================

use crate::carbon::Vehicle;
use crate::graph::Node;

// ----------------------------------------------------------------
// haversine — straight line distance between two GPS coordinates
// Returns km
// Used by: A* heuristic, nearest_node, AQI radius search
// ----------------------------------------------------------------
pub fn haversine(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r    = 6371.0_f64;
    let dlat = (lat2 - lat1).to_radians();
    let dlon = (lon2 - lon1).to_radians();
    let lat1 = lat1.to_radians();
    let lat2 = lat2.to_radians();

    let a = (dlat / 2.0).sin().powi(2)
        + lat1.cos() * lat2.cos() * (dlon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    r * c
}

// ----------------------------------------------------------------
// carbon_heuristic — admissible A* heuristic
//
// Estimates minimum possible carbon cost from node to destination.
// MUST never overestimate — uses best-case efficiency (0.8 factor)
// so A* always finds the true optimal path.
//
// If this overestimates even once, A* gives wrong answers.
// ----------------------------------------------------------------
pub fn carbon_heuristic(node: &Node, end: &Node, vehicle: &Vehicle) -> f64 {
    let straight_line_km = haversine(
        node.lat, node.lon,
        end.lat,  end.lon,
    );

    // Best case assumption:
    // - flat road (no gradient penalty)
    // - free flow traffic (no accel penalty)
    // - no traffic signals (no idle fuel)
    // - 80% of normal consumption (optimistic)
    let min_carbon_per_km = vehicle.consumption_per_km()
        * vehicle.emission_factor()
        * 0.8;

    straight_line_km * min_carbon_per_km
}

// ----------------------------------------------------------------
// time_heuristic — admissible heuristic when optimising for time
// ----------------------------------------------------------------
pub fn time_heuristic(node: &Node, end: &Node) -> f64 {
    let straight_line_km = haversine(
        node.lat, node.lon,
        end.lat,  end.lon,
    );
    // Best case: 120 kmh max speed on any road
    (straight_line_km / 120.0) * 60.0  // returns minutes
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pune_to_mumbai() {
        let dist = haversine(18.5204, 73.8567, 19.0760, 72.8777);
        println!("Pune → Mumbai: {:.1} km", dist);
        assert!((dist - 120.0).abs() < 15.0);
    }

    #[test]
    fn test_same_point_is_zero() {
        let dist = haversine(18.5204, 73.8567, 18.5204, 73.8567);
        assert!(dist < 0.001);
    }

    #[test]
    fn test_pune_station_to_hinjewadi() {
        // Pune Station: 18.5285, 73.8740
        // Hinjewadi:    18.5912, 73.7380
        let dist = haversine(18.5285, 73.8740, 18.5912, 73.7380);
        println!("Pune Station → Hinjewadi straight line: {:.1} km", dist);
        // Actual road distance ~18-23km, straight line should be less
        assert!(dist < 20.0);
        assert!(dist > 5.0);
    }

    #[test]
    fn test_heuristic_is_non_negative() {
        let node = Node { id: 0, lat: 18.5204, lon: 73.8567 };
        let end  = Node { id: 1, lat: 18.5912, lon: 73.7380 };
        let h = carbon_heuristic(&node, &end, &Vehicle::Petrol);
        assert!(h >= 0.0);
    }

    #[test]
    fn test_ev_heuristic_is_zero() {
        let node = Node { id: 0, lat: 18.5204, lon: 73.8567 };
        let end  = Node { id: 1, lat: 18.5912, lon: 73.7380 };
        let h = carbon_heuristic(&node, &end, &Vehicle::Ev);
        assert_eq!(h, 0.0, "EV heuristic should be 0 — no tailpipe");
    }
}