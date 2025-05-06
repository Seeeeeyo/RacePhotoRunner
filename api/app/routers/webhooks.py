from fastapi import APIRouter, Request, Depends
from app.database import get_db

router = APIRouter()

@router.post("/clerk-webhook")
async def handle_clerk_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    event = await request.json()
    
    if event["type"] == "user.created":
        # Trigger user sync
        await sync_clerk_user(event["data"], db)
    
    return {"status": "received"}