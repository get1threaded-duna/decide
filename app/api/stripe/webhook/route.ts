import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

// Webhook events cannot use the auth'd Supabase client — they're called by
// Stripe, not by a user. Use the service-role key to bypass RLS.
function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase service-role env not set");
  return createServiceClient(url, serviceKey, { auth: { persistSession: false } });
}

async function setPlanByStripeCustomer(stripeCustomerId: string, plan: "free" | "pro") {
  const supabase = adminSupabase();
  const { error } = await supabase
    .from("users")
    .update({ plan })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) console.error("[webhook] update plan failed", { stripeCustomerId, plan, error });
}

async function setPlanByUserId(userId: string, plan: "free" | "pro", stripeCustomerId?: string) {
  const supabase = adminSupabase();
  const patch: Record<string, unknown> = { plan };
  if (stripeCustomerId) patch.stripe_customer_id = stripeCustomerId;
  const { error } = await supabase.from("users").update(patch).eq("id", userId);
  if (error) console.error("[webhook] update plan by user failed", { userId, plan, error });
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.metadata?.supabase_user_id as string) ?? session.client_reference_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (userId && customerId) await setPlanByUserId(userId, "pro", customerId);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const active = sub.status === "active" || sub.status === "trialing";
        await setPlanByStripeCustomer(customerId, active ? "pro" : "free");
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await setPlanByStripeCustomer(customerId, "free");
        break;
      }
      default:
        // Other events ignored
        break;
    }
  } catch (err) {
    console.error("[webhook] handler failed", { type: event.type, err });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
