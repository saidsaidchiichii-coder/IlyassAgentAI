# 🔥 IlyassAI — Real Stripe Subscription System
## Complete Setup Guide

---

## 📁 Files to Push to GitHub

Replace/add these files in your repo:

```
api/create-checkout.js    ← REPLACE (3 plans: free/pro/custom)
api/webhook.js            ← REPLACE (handles all Stripe events)
api/subscription-status.js ← ADD NEW
api/cancel-subscription.js  ← ADD NEW
api/_middleware.js          ← REPLACE (plan enforcement)
public/pricing.html         ← ADD NEW (pricing page)
public/success.html         ← ADD NEW (success page)
vercel.json                 ← REPLACE (updated routes)
```

---

## 💳 Step 1 — Create Stripe Products

Go to https://dashboard.stripe.com → Products → Add product

**Create 2 products (Free is $0 — no Stripe product needed):**

### Pro Plan ($18/mo)
- Name: IlyassAI Pro
- Price: $18.00 / month (recurring)
- Copy the **Price ID**: `price_xxxxxxx`

### Custom Plan ($80/mo)
- Name: IlyassAI Custom
- Price: $80.00 / month (recurring)
- Copy the **Price ID**: `price_xxxxxxx`

> **Note**: The current code uses `price_data` (dynamic pricing) so you don't need Price IDs yet.
> If you want to use pre-created products, replace `price_data` blocks with `price: 'price_xxx'`.

---

## 🔑 Step 2 — Vercel Environment Variables

Go to: https://vercel.com/your-team/IlyassAgentAI/settings/environment-variables

Add these variables:

| Variable | Value | Where to find |
|----------|-------|---------------|
| `STRIPE_SECRET_KEY` | `sk_live_xxxxx` | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxx` | Stripe Dashboard → Webhooks |
| `FIREBASE_PROJECT_ID` | `ilyassagentai` | Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@ilyassagentai.iam.gserviceaccount.com` | Firebase → Service Accounts |
| `FIREBASE_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n..."` | Firebase → Service Accounts → Generate key |
| `NEXT_PUBLIC_BASE_URL` | `https://ilyassagentai.vercel.app` | Your Vercel deployment URL |

**For testing:** Use `sk_test_xxxxx` (test keys) before going live!

---

## 🪝 Step 3 — Setup Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. URL: `https://ilyassagentai.vercel.app/api/webhook`
4. Select events:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.updated`
5. Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET`

---

## 🔥 Step 4 — Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Open the JSON file and copy:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters!)

---

## 📊 Step 5 — Firestore Data Structure

The system automatically creates/updates this structure in Firestore:

```
users/{userId} {
  plan: "free" | "pro" | "custom"
  planStatus: "active" | "cancelled" | "payment_failed" | "cancelling"
  planFeatures: { ... }
  planActivatedAt: "2026-05-13T..."
  stripeCustomerId: "cus_xxx"
  stripeSubscriptionId: "sub_xxx"
  lastPayment: "2026-05-13T..."
  totalSpent: 1800  (in cents)
}

usage/{userId}_{YYYY-MM-DD} {
  messages: 45
  userId: "..."
  date: "2026-05-13"
}
```

---

## 🧪 Step 6 — Test the System

**Test cards (use in Stripe test mode):**
- ✅ Success: `4242 4242 4242 4242` (any future date, any CVV)
- ❌ Declined: `4000 0000 0000 0002`
- 🔄 Requires auth: `4000 0025 0000 3155`

**Test flow:**
1. Go to `/pricing`
2. Sign in with Firebase Auth
3. Click "Upgrade to Pro"
4. Use test card `4242 4242 4242 4242`
5. Check Firestore → user document updated with `plan: "pro"`
6. Check `/api/subscription-status?userId=YOUR_UID` → returns plan data

---

## 🚀 Step 7 — Deploy

```bash
# Push to GitHub
git add .
git commit -m "feat: Real Stripe subscription system - 3 plans"
git push origin main

# Vercel auto-deploys on push
# Or manually: vercel --prod
```

---

## 💡 How to Use in Your App

```javascript
// Check if user can use a feature
const res = await fetch(`/api/subscription-status?userId=${user.uid}`);
const { plan, planFeatures } = await res.json();

if (planFeatures.webSearch) {
  // Enable web search
}

if (planFeatures.imageGenPerDay === -1) {
  // Unlimited image generation
}

// Check message limit
if (planFeatures.messagesPerDay === -1 || messagesUsed < planFeatures.messagesPerDay) {
  // Allow message
} else {
  // Show upgrade prompt
}
```

---

## 📞 Plans Summary

| Feature | Free ($0) | Pro ($18) | Custom ($80) |
|---------|-----------|-----------|--------------|
| Messages/day | 100 | Unlimited | Unlimited |
| Models | GPT-3.5 | GPT-4o, Claude | All + Custom |
| Images | ❌ | Unlimited | Unlimited |
| Web Search | ❌ | ✅ | ✅ |
| Memory | ❌ | ✅ | ✅ |
| Priority | ❌ | ✅ (80% faster) | ✅ |
| Own API Key | ❌ | ❌ | ✅ |
