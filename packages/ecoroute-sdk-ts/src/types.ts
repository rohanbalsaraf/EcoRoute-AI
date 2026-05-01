export interface Coordinate {
  lat: number;
  lon: number;
}

export type VehicleType = "petrol" | "diesel" | "ev" | "hybrid";

export interface RouteMetric {
  distance_km: number;
  time_min: number;
  co2_kg: number;
  path: number[];
  path_coords?: Coordinate[];
}

export interface RouteResponse {
  origin: Coordinate & { node_id: number };
  destination: Coordinate & { node_id: number };
  vehicle: VehicleType;
  routes: {
    greenest: RouteMetric;
    fastest: RouteMetric;
    shortest: RouteMetric;
  };
}

export interface EcoRouteOptions {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}
