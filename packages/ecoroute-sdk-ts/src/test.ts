import { EcoRouteClient } from './index';

async function test() {
  const client = new EcoRouteClient({
    apiKey: 'test_key',
    baseUrl: 'http://localhost:8000'
  });

  console.log('EcoRoute SDK Initialized');
  
  const dist = EcoRouteClient.calculateDistance(
    { lat: 40.7128, lon: -74.0060 },
    { lat: 34.0522, lon: -118.2437 }
  );
  
  console.log(`Distance from NY to LA: ${dist.toFixed(2)} km`);
}

test().catch(console.error);
