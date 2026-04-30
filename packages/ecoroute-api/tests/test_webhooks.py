import pytest
from fastapi.testclient import TestClient
import hmac
import hashlib
import json
from app.main import app, LEMON_SQUEEZY_WEBHOOK_SECRET

client = TestClient(app)

def test_lemonsqueezy_webhook_valid_signature():
    payload = {
        "meta": {
            "event_name": "subscription_created"
        },
        "data": {
            "id": "1",
            "type": "subscriptions"
        }
    }
    
    raw_body = json.dumps(payload).encode('utf-8')
    
    # Generate valid signature
    signature = hmac.new(
        LEMON_SQUEEZY_WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    
    response = client.post(
        "/v1/webhooks/lemonsqueezy",
        content=raw_body,
        headers={"X-Signature": signature}
    )
    
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

def test_lemonsqueezy_webhook_invalid_signature():
    payload = {"meta": {"event_name": "subscription_created"}}
    raw_body = json.dumps(payload).encode('utf-8')
    
    response = client.post(
        "/v1/webhooks/lemonsqueezy",
        content=raw_body,
        headers={"X-Signature": "invalid_signature_123"}
    )
    
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid signature"}

def test_lemonsqueezy_webhook_missing_signature():
    payload = {"meta": {"event_name": "subscription_created"}}
    raw_body = json.dumps(payload).encode('utf-8')
    
    response = client.post(
        "/v1/webhooks/lemonsqueezy",
        content=raw_body
    )
    
    assert response.status_code == 400
    assert response.json() == {"detail": "Missing signature"}
