import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

const APP_URL = "https://toca-tr-ia-copy-5aa120a0.base44.app";

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("MY_STRIPE_SK"));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { price_id, plan_id, cycle } = await req.json();
    if (!price_id) return Response.json({ error: 'price_id required' }, { status: 400 });

    // Find or create Stripe customer
    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    let profile = profiles?.[0];
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      if (profile) {
        await base44.entities.UserProfile.update(profile.id, { stripe_customer_id: customerId });
      } else {
        profile = await base44.entities.UserProfile.create({
          user_id: user.id,
          plan_id: "trial",
          stripe_customer_id: customerId,
          trial_start_date: new Date().toISOString().split("T")[0],
        });
      }
    }

    // Create checkout session with 7-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: price_id, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: user.id, plan_id, cycle },
      },
      success_url: `${APP_URL}/planos?success=1&plan=${plan_id}`,
      cancel_url: `${APP_URL}/planos?canceled=1`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan_id, cycle },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});