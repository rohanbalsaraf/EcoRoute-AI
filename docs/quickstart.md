# EcoRoute API Quickstart

Welcome to the EcoRoute API! Our API allows you to integrate sub-millisecond, carbon-aware route optimization directly into your applications.

## 1. Get Your API Key

To get started, you need an API key to authenticate your requests.

1. Sign up or log in at [https://ecoroute-saas.com/sign-up](https://ecoroute-saas.com/sign-up) (or your local dashboard).
2. Navigate to your **Developer Dashboard**.
3. Click the **Generate New Key** button.
4. **Important:** Copy your key immediately! For security reasons, the raw key (e.g., `ecoroute_live_...`) is only shown once.

## 2. Make Your First API Request

The EcoRoute API uses standard HTTP REST. All requests must be authenticated using a Bearer token in the `Authorization` header.

### Endpoint
`POST /v1/routes`

### Authentication
Send your API key in the `Authorization` header:
`Authorization: Bearer ecoroute_live_your_api_key_here`

### Example Request (cURL)

```bash
curl -X POST "https://api.ecoroute-saas.com/v1/routes?origin=Paris&destination=Berlin" \
     -H "Authorization: Bearer ecoroute_live_your_api_key_here" \
     -H "Content-Type: application/json"
```

### Example Response

```json
{
  "origin": "Paris",
  "destination": "Berlin",
  "routes": [
    {
      "type": "greenest",
      "carbon_cost": 4.5,
      "distance_km": 12.2,
      "duration_min": 25
    }
  ]
}
```

## 3. Rate Limits

Your usage limits depend on your current subscription tier:

- **Free Tier:** 100 requests per day.
- **Pro Tier:** 10,000 requests per day.

You can view your current daily usage at any time in the Developer Dashboard. If you exceed your limit, the API will return a `429 Too Many Requests` error.

## Next Steps

Check out the [API Reference](./api-reference.md) for more details on available endpoints, parameters, and error codes.
