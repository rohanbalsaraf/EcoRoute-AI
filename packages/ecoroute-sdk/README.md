# EcoRoute SDK

The EcoRoute SDK provides a Python client for interacting with the EcoRoute AI routing engine.

## Installation

```bash
pip install ecoroute-sdk
```

## Usage

```python
from ecoroute import EcoRouteClient

client = EcoRouteClient()
routes = client.find_routes("San Francisco", "Los Angeles")
print(routes.savings_message)
```
