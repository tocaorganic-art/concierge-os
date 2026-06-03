import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

const PLANS = [
  { name: "Concierge OS Starter Mensal", plan: "starter", cycle: "mensal", amount: 9700 },
  { name: "Concierge OS Starter Anual",  plan: "starter", cycle: "anual",  amount: 7700 },
  { name: "Concierge OS Pro Mensal",     plan: "pro",     cycle: "mensal", amount: 19700 },
  { name: "Concierge OS Pro Anual",      plan: "pro",     cycle: "anual",  amount: 15700 },
  { name: "Concierge OS Agency Mensal",  plan: "agency",  cycle: "mensal", amount: 39700 },
  { name: "Concierge OS Agency Anual",   plan: "agency",  cycle: "anual",  amount: 31700 },
];

Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("MY_STRIPE_SK"));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = [];
    for (const p of PLANS) {
      // Create product
      const product = await stripe.products.create({
        name: p.name,
        metadata: { plan: p.plan, cycle: p.cycle },
      });

      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: p.amount,
        currency: "brl",
        recurring: { interval: "month" },
        metadata: { plan: p.plan, cycle: p.cycle },
      });

      results.push({ name: p.name, price_id: price.id, product_id: product.id });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});