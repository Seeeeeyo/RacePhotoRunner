1. Install Stripe SDKs
Backend (FastAPI/Node):

bash
Copy
Edit
# For Python backend
pip install stripe

# For Node.js backend
npm install stripe
Frontend:

bash
Copy
Edit
npm install @stripe/stripe-js
2. Initialize Stripe Client
Load API keys from environment variables:

STRIPE_SECRET_KEY

STRIPE_PUBLISHABLE_KEY

3. Photographer Onboarding (Stripe Connect Express)
When a photographer signs up:

Create a Connect Express account

Redirect them to onboarding URL

Backend:

python
Copy
Edit
account = stripe.Account.create(type="express")
account_link = stripe.AccountLink.create(
    account=account.id,
    refresh_url="https://your-site.com/onboarding/refresh",
    return_url="https://your-site.com/onboarding/complete",
    type="account_onboarding",
)
Save the account.id on the user’s profile in the DB.

4. Checkout Flow for Athletes
Use Stripe Checkout for purchase sessions.

Dynamically create Checkout Sessions with:

Image/product name

Price (based on photo or bundle)

Connected account (stripe_account param)

Platform commission via application_fee_amount

Backend:

python
Copy
Edit
session = stripe.checkout.Session.create(
  payment_method_types=["card"],
  line_items=[{
    "price_data": {
      "currency": "usd",
      "product_data": {
        "name": "Bib 2405 Race Package",
      },
      "unit_amount": 1500,  # $15.00
    },
    "quantity": 1,
  }],
  payment_intent_data={
    "application_fee_amount": 300,  # $3.00 fee
    "transfer_data": {
      "destination": photographer_stripe_account_id,
    },
  },
  mode="payment",
  success_url="https://your-site.com/success?session_id={CHECKOUT_SESSION_ID}",
  cancel_url="https://your-site.com/cancel",
)
Redirect the frontend to session.url

5. Handle Webhooks
Set up Stripe webhook to listen to:

checkout.session.completed

payment_intent.succeeded

On success:

Unlock/download access for purchased images

Send email with image ZIP or download links

Python Flask Example:

python
Copy
Edit
@app.route("/webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    event = stripe.Event.construct_from(
        json.loads(payload), stripe.api_key
    )

    if event.type == "checkout.session.completed":
        handle_checkout_complete(event.data.object)
6. Security + Testing
Use test keys in dev.

Use .env for secrets.

Add webhook secret validation.

Test with Stripe CLI:

bash
Copy
Edit
stripe listen --forward-to localhost:8000/webhook
📄 Data Model Updates
Update User table:

ts
Copy
Edit
{
  id: UUID,
  email: string,
  role: "athlete" | "photographer",
  stripe_account_id: string | null
}
🧪 Testing
Write integration tests:

Purchase success & failure

User role access (only athletes can buy)

Payout split check

Webhook trigger and image delivery

