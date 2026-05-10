import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Stripe not configured yet.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const PACKAGES = {
    starter:    { credits: 500,  price: 499,  name: 'Starter Pack — 500 Credits' },
    pro:        { credits: 2000, price: 1499, name: 'Pro Pack — 2,000 Credits' },
    enterprise: { credits: 6000, price: 3999, name: 'Enterprise Pack — 6,000 Credits' },
  };

  const { pkg, userId, email } = req.body || {};
  const selected = PACKAGES[pkg];
  if (!selected) return res.status(400).json({ error: 'Invalid package' });
  if (!userId)   return res.status(400).json({ error: 'userId required' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: selected.name },
          unit_amount: selected.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://my-webxyu.vercel.app/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `https://my-webxyu.vercel.app/api-dashboard`,
      metadata: { userId, credits: String(selected.credits), pkg },
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
