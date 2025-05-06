from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
import stripe
import os
from dotenv import load_dotenv
import json
from collections import defaultdict
import math # Import math for ceiling function

from app.database import get_db
# Import necessary models and crud functions
from app.models import User, Photo, Event, EventPhotographerPrice # Added EventPhotographerPrice
from app import crud # Assuming crud functions are in app.crud

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
# It's good practice to get these from env vars or config
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
PLATFORM_FEE_PERCENT = int(os.getenv("PLATFORM_FEE_PERCENT", 20)) # Example: 20% fee

router = APIRouter(
    prefix="/payments",
    tags=["payments"],
)

@router.post("/create-checkout-session")
async def create_checkout_session(request: Request, db: Session = Depends(get_db)):
    """
    Creates a Stripe Checkout Session for purchasing photos.
    Expects a JSON body like: {"photo_ids": [1, 2, 3], "user_id": "clerk_user_id_or_db_id"}
    """
    try:
        data = await request.json()
        # Expecting photo IDs as integers now based on model
        photo_ids_int = [int(pid) for pid in data.get("photo_ids", [])]
        user_id_from_request = data.get("user_id") # ID of the user making the purchase

        if not photo_ids_int or not user_id_from_request:
            raise HTTPException(status_code=400, detail="Missing photo_ids or user_id")

        # 1. Fetch purchasing user (optional, but good for metadata/email)
        # purchasing_user = crud.get_user(db, user_id=user_id_from_request) # Adjust based on your get_user implementation
        # if not purchasing_user:
        #     raise HTTPException(status_code=404, detail="Purchasing user not found")

        # 2. Fetch photo details and group by photographer
        photos_by_photographer = defaultdict(list)
        events_cache = {} # Cache event details to avoid redundant DB calls
        photographers_cache = {} # Cache photographer details

        for photo_id in photo_ids_int:
            photo = crud.get_photo(db, photo_id=photo_id) # Use your actual get_photo function
            if not photo:
                raise HTTPException(status_code=404, detail=f"Photo with id {photo_id} not found")

            if not photo.photographer_id:
                 raise HTTPException(status_code=500, detail=f"Photo {photo.id} is missing a photographer association")

            if photo.photographer_id not in photographers_cache:
                photographer = crud.get_user(db, user_id=photo.photographer_id) # Use your actual get_user function
                if not photographer:
                    raise HTTPException(status_code=404, detail=f"Photographer with id {photo.photographer_id} not found for photo {photo_id}")
                if not photographer.stripe_account_id:
                    raise HTTPException(status_code=400, detail=f"Photographer {photographer.username} ({photographer.id}) has not connected their Stripe account")
                photographers_cache[photo.photographer_id] = photographer

            if photo.event_id not in events_cache:
                 event = crud.get_event(db, event_id=photo.event_id) # Use your actual get_event function
                 if not event:
                      raise HTTPException(status_code=404, detail=f"Event with id {photo.event_id} not found for photo {photo_id}")
                 events_cache[photo.event_id] = event

            photographer = photographers_cache[photo.photographer_id]
            event = events_cache[photo.event_id]

            # --- Changed: Fetch price from EventPhotographerPrice --- 
            price_entry = crud.get_event_photographer_price(db, event_id=event.id, photographer_id=photographer.id)
            if not price_entry:
                # Handle case where photographer hasn't set a price for this event
                # Option 1: Raise error
                raise HTTPException(status_code=400, detail=f"Photographer {photographer.username} has not set a price for event {event.name}")
                # Option 2: Use a default price (less ideal)
                # price = 500 # Default to $5.00
            else:
                price = price_entry.price_per_photo

            photos_by_photographer[photographer.id].append({
                "photo": photo,
                "event": event,
                "photographer": photographer,
                "price": price # Store the fetched price
            })

        # 3. Create line items and calculate fees (now handling multiple photographers)
        line_items = []
        metadata_photographer_breakdown = {} # {photographer_id: {amount: X, fee: Y, stripe_id: Z}}
        grand_total_amount = 0

        for photographer_id, items in photos_by_photographer.items():
            photographer_stripe_account_id = items[0]["photographer"].stripe_account_id
            photographer_subtotal = 0

            for item in items:
                photo = item["photo"]
                event = item["event"]
                # --- Changed: Use price stored in item dict --- 
                # price = event.price_per_photo # Price in cents from Event model
                price = item["price"]

                line_items.append({
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"Photo from {event.name}",
                            "description": f"Photographer: {item['photographer'].username}", # Add photographer info
                            "images": [f"{FRONTEND_URL}{photo.thumbnail_path}"], # Ensure path starts with /
                        },
                        "unit_amount": price,
                    },
                    "quantity": 1,
                })
                photographer_subtotal += price
            
            # Calculate platform fee for this photographer's items
            # Using math.ceil to ensure platform doesn't lose fractions of cents
            fee_for_photographer = math.ceil(photographer_subtotal * (PLATFORM_FEE_PERCENT / 100))
            # Ensure fee isn't zero if subtotal is non-zero and fee percent > 0
            if photographer_subtotal > 0 and PLATFORM_FEE_PERCENT > 0 and fee_for_photographer == 0:
                fee_for_photographer = 1 # Minimum 1 cent fee
            # Ensure fee doesn't exceed the subtotal
            if fee_for_photographer >= photographer_subtotal and photographer_subtotal > 0:
                print(f"Warning: Calculated fee {fee_for_photographer} >= subtotal {photographer_subtotal} for photographer {photographer_id}. Setting fee to subtotal - 1 cent.")
                fee_for_photographer = photographer_subtotal -1 if photographer_subtotal > 0 else 0

            metadata_photographer_breakdown[str(photographer_id)] = { # Use string key for JSON compatibility
                "amount": photographer_subtotal, # Amount customer paid for this photographer's items
                "fee": fee_for_photographer,     # Platform fee calculated for these items
                "stripe_id": photographer_stripe_account_id
            }
            grand_total_amount += photographer_subtotal

        # 4. Define URLs
        success_url = f"{FRONTEND_URL}/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{FRONTEND_URL}/cancel"

        # 5. Create Stripe Checkout Session (No payment_intent_data for transfers)
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            # payment_intent_data is REMOVED - payment goes to platform first
            metadata={
                'user_id': user_id_from_request,
                'photo_ids': ",".join(map(str, photo_ids_int)),
                # Store photographer breakdown as JSON string
                'photographer_breakdown': json.dumps(metadata_photographer_breakdown)
            }
        )
        return {"sessionId": checkout_session.id, "url": checkout_session.url}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.strerror or str(e)}")
    except HTTPException as e:
        # Re-raise HTTPExceptions to return proper status codes
        raise e
    except Exception as e:
        # Log the exception for debugging
        print(f"Internal server error: {str(e)}") # TODO: Use proper logging
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    """
    Handles incoming Stripe webhooks.
    """
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail=f"Invalid signature: {e}")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        print(f"Checkout session completed: {session['id']}")

        # 1. Retrieve necessary info from session object and metadata
        payment_intent_id = session.get('payment_intent')
        user_id = session.get('metadata', {}).get('user_id')
        photo_ids_str = session.get('metadata', {}).get('photo_ids')
        photographer_breakdown_str = session.get('metadata', {}).get('photographer_breakdown')

        if not all([payment_intent_id, user_id, photo_ids_str, photographer_breakdown_str]):
             print(f"Error: Missing critical data in checkout session {session.id}")
             # Log the error details
             print(f"PI: {payment_intent_id}, User: {user_id}, Photos: {photo_ids_str}, Breakdown: {photographer_breakdown_str}")
             raise HTTPException(status_code=400, detail="Missing metadata/payment_intent in session")

        try:
            photo_ids = [int(pid) for pid in photo_ids_str.split(',')]
            photographer_breakdown = json.loads(photographer_breakdown_str)
        except (ValueError, json.JSONDecodeError) as e:
            print(f"Error parsing metadata for session {session.id}: {e}")
            raise HTTPException(status_code=400, detail="Invalid metadata format")

        # 2. Verify payment status
        if session.get("payment_status") == "paid":
            print(f"Payment successful for session {session['id']} by user {user_id}")

            # --- TODO: Database updates (Consider wrapping in a transaction) ---
            try:
                # Example: Create an Order record
                # order = crud.create_order(
                #     db,
                #     user_id=user_id,
                #     stripe_session_id=session.id,
                #     total_amount=session.amount_total, # Total amount paid by customer
                #     # Add other relevant fields
                # )

                # Example: Link photos to the order or mark as purchased
                # crud.mark_photos_as_purchased(db, user_id=user_id, photo_ids=photo_ids, order_id=order.id)
                pass # Replace with actual DB operations

            except Exception as db_error:
                 print(f"Error updating database for session {session.id}: {db_error}")
                 # Decide how to handle: Maybe retry later? For now, raise to signal issue.
                 # Re-raising might cause Stripe to retry the webhook.
                 raise HTTPException(status_code=500, detail=f"Database update failed: {db_error}")

            # 3. Create Stripe Transfers to photographers
            transfer_group = f"order_{session.id}" # Group transfers related to this order
            successful_transfers = 0
            failed_transfers = 0

            for photographer_id_str, details in photographer_breakdown.items():
                photographer_stripe_id = details.get('stripe_id')
                amount_paid = details.get('amount') # Amount customer paid for this photographer's items
                platform_fee = details.get('fee') # Platform fee for these items

                if photographer_stripe_id is None or amount_paid is None or platform_fee is None:
                    print(f"Error: Incomplete breakdown for photographer {photographer_id_str} in session {session.id}")
                    failed_transfers += 1
                    continue # Skip this transfer
                
                # Ensure amounts are integers
                try:
                    amount_paid_int = int(amount_paid)
                    platform_fee_int = int(platform_fee)
                except ValueError:
                     print(f"Error: Invalid amount/fee for photographer {photographer_id_str} in session {session.id}")
                     failed_transfers += 1
                     continue

                amount_to_transfer = amount_paid_int - platform_fee_int

                if amount_to_transfer <= 0:
                    print(f"Skipping transfer for photographer {photographer_id_str}: Calculated amount {amount_to_transfer} <= 0")
                    continue

                try:
                    print(f"Attempting transfer: {amount_to_transfer} cents to {photographer_stripe_id} for order {transfer_group}")
                    transfer = stripe.Transfer.create(
                        amount=amount_to_transfer,
                        currency="usd",
                        destination=photographer_stripe_id,
                        transfer_group=transfer_group,
                        source_transaction=payment_intent_id, # Link transfer to the original charge
                        metadata={
                            'checkout_session_id': session.id,
                            'photographer_db_id': photographer_id_str,
                            'buyer_user_id': user_id
                        }
                    )
                    print(f"Successfully created transfer {transfer.id} for photographer {photographer_id_str}")
                    successful_transfers += 1
                except stripe.error.StripeError as e:
                    print(f"Error creating transfer for photographer {photographer_id_str} (Stripe ID: {photographer_stripe_id}): {e}")
                    # TODO: Implement retry logic or manual notification for failed transfers
                    failed_transfers += 1
                except Exception as e:
                    print(f"Generic error creating transfer for photographer {photographer_id_str}: {e}")
                    failed_transfers += 1

            print(f"Transfer processing complete for session {session.id}: {successful_transfers} succeeded, {failed_transfers} failed.")
            # If any transfers failed, you might want additional alerting.

        else:
             print(f"Payment not successful for session {session['id']}. Status: {session.get('payment_status')}")


    # Handle other event types if needed
    # elif event['type'] == 'payment_intent.succeeded':
    #     payment_intent = event['data']['object']
    #     print(f"PaymentIntent succeeded: {payment_intent['id']}")
        # Handle payment intent success if not relying solely on checkout session completion
    else:
        print(f"Unhandled event type {event['type']}")

    return {"status": "success"} 