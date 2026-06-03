import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

// Map real Stripe Price IDs → internal plan_id
const PRICE_TO_PLAN = {
  "price_1Te7qJRX4Ldl6df54K6Y5Gk5": "starter", // Starter Mensal
  "price_1Te7qJRX4Ldl6df5DiM3j04Z": "starter", // Starter Anual
  "price_1Te7qKRX4Ldl6df5hChLwuSH": "pro",     // Pro Mensal
  "price_1Te7qKRX4Ldl6df5N4CZunsQ": "pro",     // Pro Anual
  "price_1Te7qKRX4Ldl6df5GvlzcCEz": "agency",  // Agency Mensal
  "price_1Te7qKRX4Ldl6df5F5dh32i7": "agency",  // Agency Anual
};

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Use service role to update UserProfile (no user session in webhooks)
  const base44 = createClientFromRequest(req);

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        if (!userId || !planId) break;

        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: userId });
        const profile = profiles?.[0];
        if (profile) {
          await base44.asServiceRole.entities.UserProfile.update(profile.id, {
            plan_id: planId,
            subscription_status: "active",
            stripe_customer_id: session.customer,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const planId = PRICE_TO_PLAN[priceId] || null;
        const status = sub.status; // active | trialing | past_due | canceled | incomplete

        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: userId });
        const profile = profiles?.[0];
        if (profile) {
          const update = { subscription_status: status, stripe_price_id: priceId };
          if (planId) update.plan_id = planId;
          await base44.asServiceRole.entities.UserProfile.update(profile.id, update);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: userId });
        const profile = profiles?.[0];
        if (profile) {
          await base44.asServiceRole.entities.UserProfile.update(profile.id, {
            plan_id: "trial",
            subscription_status: "canceled",
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find the UserProfile tied to this Stripe customer
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ stripe_customer_id: customerId });
        const profile = profiles?.[0];
        if (!profile) break;

        // Find open proposals (lead or proposta) for this user and move them to "confirmado"
        const proposals = await base44.asServiceRole.entities.Proposal.filter({ client_id: profile.user_id });
        const open = proposals.filter((p) => ["lead", "proposta"].includes(p.status));
        for (const p of open) {
          await base44.asServiceRole.entities.Proposal.update(p.id, { status: "confirmado" });
        }

        // Also update subscription status to active on successful payment
        await base44.asServiceRole.entities.UserProfile.update(profile.id, {
          subscription_status: "active",
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        // Find by stripe_customer_id
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ stripe_customer_id: customerId });
        const profile = profiles?.[0];
        if (profile) {
          await base44.asServiceRole.entities.UserProfile.update(profile.id, {
            subscription_status: "past_due",
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    return new Response(`Handler Error: ${err.message}`, { status: 500 });
  }

  return Response.json({ received: true });
});