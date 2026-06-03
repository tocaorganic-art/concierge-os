import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

const APP_URL = "https://toca-tr-ia-copy-5aa120a0.base44.app";

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("MY_STRIPE_SK"));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
    const profile = profiles?.[0];
    const customerId = profile?.stripe_customer_id;

    if (!customerId) {
      return Response.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/configuracoes`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});