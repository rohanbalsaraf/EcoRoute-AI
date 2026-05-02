from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, Subscription
from svix.webhooks import Webhook, WebhookVerificationError
import os

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")

@router.post("/clerk")
async def clerk_webhook(
    request: Request,
    db: Session = Depends(get_db),
    svix_id: str = Header(None, alias="svix-id"),
    svix_timestamp: str = Header(None, alias="svix-timestamp"),
    svix_signature: str = Header(None, alias="svix-signature"),
):
    """
    Handles Clerk webhooks for user lifecycle events.
    Specifically 'user.created' to provision users in our database.
    """
    if not CLERK_WEBHOOK_SECRET:
        # For development, if secret is not set, we might skip verification
        # but for production it's mandatory.
        payload = await request.json()
    else:
        body = await request.body()
        try:
            wh = Webhook(CLERK_WEBHOOK_SECRET)
            payload = wh.verify(body, {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            })
        except WebhookVerificationError:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = payload.get("type")
    data = payload.get("data")

    if event_type == "user.created":
        user_id = data.get("id")
        email_addresses = data.get("email_addresses", [])
        email = email_addresses[0].get("email_address") if email_addresses else None

        # Check if user already exists
        existing_user = db.query(User).filter(User.id == user_id).first()
        if not existing_user:
            new_user = User(id=user_id, email=email)
            db.add(new_user)
            
            # Auto-provision a free subscription
            new_sub = Subscription(
                user_id=user_id,
                tier="free",
                status="active"
            )
            db.add(new_sub)
            db.commit()
            print(f"User {user_id} provisioned via Clerk webhook")

    return {"status": "success"}

LEMON_SQUEEZY_WEBHOOK_SECRET = os.getenv("LEMON_SQUEEZY_WEBHOOK_SECRET", "your_secret_here")

@router.post("/lemonsqueezy")
async def lemonsqueezy_webhook(
    request: Request,
    db: Session = Depends(get_db),
    x_signature: str = Header(None, alias="x-signature"),
):
    """
    Handles Lemon Squeezy webhooks for subscription management.
    """
    import hmac
    import hashlib

    body = await request.body()
    
    if not x_signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    if LEMON_SQUEEZY_WEBHOOK_SECRET:
        digest = hmac.new(
            LEMON_SQUEEZY_WEBHOOK_SECRET.encode(), 
            body, 
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(digest, x_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    event_name = payload.get("meta", {}).get("event_name")
    data = payload.get("data", {})
    attributes = data.get("attributes", {})

    if event_name in ["subscription_created", "subscription_updated"]:
        # custom_data usually contains our local user_id
        user_id = payload.get("meta", {}).get("custom_data", {}).get("user_id")
        
        if not user_id:
            # Fallback: find user by email
            email = attributes.get("user_email")
            user = db.query(User).filter(User.email == email).first()
            if user:
                user_id = user.id

        if user_id:
            status = attributes.get("status") # 'active', 'on_trial', 'cancelled', etc.
            # Map Lemon Squeezy variants to our tiers if needed
            # For now, if they have an active subscription, we'll call it 'pro'
            tier = "pro" if status in ["active", "on_trial"] else "free"
            
            sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if sub:
                sub.status = status
                sub.tier = tier
                db.commit()
                print(f"User {user_id} subscription updated to {tier} ({status})")
            else:
                new_sub = Subscription(user_id=user_id, tier=tier, status=status)
                db.add(new_sub)
                db.commit()

    return {"status": "success"}
