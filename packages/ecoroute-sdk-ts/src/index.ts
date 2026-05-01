import axios, { AxiosInstance } from 'axios';
import { 
  Coordinate, 
  VehicleType, 
  RouteResponse, 
  EcoRouteOptions 
} from './types';

export * from './types';

export class EcoRouteClient {
  private client: AxiosInstance;
  private apiKey?: string;

  constructor(options: EcoRouteOptions = {}) {
    this.apiKey = options.apiKey || process.env.ECOROUTE_API_KEY;
    const baseUrl = options.baseUrl || process.env.ECOROUTE_API_URL || 'https://api.ecoroute.ai';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: options.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Add interceptor to include API key if available
    this.client.interceptors.request.use((config) => {
      if (this.apiKey) {
        config.headers.Authorization = `Bearer ${this.apiKey}`;
      }
      return config;
    });
  }

  /**
   * Find the greenest, fastest, and shortest routes between two points.
   * 
   * @param origin - Coordinates of the starting point
   * @param destination - Coordinates of the destination
   * @param vehicle - Type of vehicle for emission calculation
   * @returns Detailed routing information with carbon metrics
   */
  async findRoutes(
    origin: Coordinate,
    destination: Coordinate,
    vehicle: VehicleType = "petrol"
  ): Promise<RouteResponse> {
    try {
      const response = await this.client.post<RouteResponse>('/v1/routes', {
        origin_lat: origin.lat,
        origin_lon: origin.lon,
        dest_lat: destination.lat,
        dest_lon: destination.lon,
        vehicle
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `EcoRoute API Error: ${error.response?.data?.detail || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Utility to calculate distance between two coordinates using Haversine formula.
   */
  static calculateDistance(start: Coordinate, end: Coordinate): number {
    const R = 6371; // Earth radius in km
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLon = (end.lon - start.lon) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
