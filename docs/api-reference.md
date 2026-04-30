# EcoRoute API Reference

Base URL: `https://api.ecoroute-saas.com` (or `http://localhost:8000` for local development)

## Authentication

The EcoRoute API uses API keys to authenticate requests. You can view and manage your API keys in the [Developer Dashboard](/dashboard).

Your API keys carry many privileges, so be sure to keep them secure! Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth.

All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.

Authenticate your API requests by providing your API key in the `Authorization` header as a Bearer token:

```http
Authorization: Bearer ecoroute_live_...
```

---

## Routing Endpoints

### Calculate Routes
`POST /v1/routes`

Calculates the optimized routes between an origin and destination, providing options for the "greenest", "fastest", and "shortest" paths.

**Query Parameters:**
*   `origin` (string, required): The starting location (e.g., coordinates or city name).
*   `destination` (string, required): The ending location.

**Headers:**
*   `Authorization`: `Bearer ecoroute_live_...`

**Response (200 OK):**
```json
{
  "origin": "string",
  "destination": "string",
  "routes": [
    {
      "type": "greenest",
      "carbon_cost": "float",
      "distance_km": "float",
      "duration_min": "int"
    }
  ]
}
```

---

## Error Codes

The EcoRoute API uses standard HTTP response codes to indicate the success or failure of an API request.

*   **200 OK:** Everything worked as expected.
*   **400 Bad Request:** The request was unacceptable, often due to missing a required parameter.
*   **401 Unauthorized:** No valid API key provided.
*   **403 Forbidden:** The API key doesn't have permissions to perform the request (e.g., revoked key).
*   **404 Not Found:** The requested resource doesn't exist.
*   **429 Too Many Requests:** Too many requests hit the API too quickly. We recommend an exponential backoff of your requests.
*   **500, 502, 503, 504 Server Errors:** Something went wrong on EcoRoute's end.