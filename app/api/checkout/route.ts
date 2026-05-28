import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { PRO_PRICE_MONTHLY, PRO_PRICE_ANNUAL } from "@/lib/stripe/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { interval } = (await req.json()) as { interval?: "monthly" | "annual" };
  const priceId = interval === "annual" ? PRO_PRICE_ANNUAL : PRO_PRICE_MONTHLY;
  if (!priceId) return NextResponse.json({ error: "Pricing not configured" }, { status: 500 });

  const { data: appUser } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: appUser?.stripe_customer_id ?? undefined,
      customer_email: appUser?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: `${origin}/pricing?canceled=1`,
      allow_promotion_codes: true,
      metadata: { supabase_user_id: user.id },
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    if (!session.url) return NextResponse.json({ error: "No session URL" }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[/api/checkout] stripe session create failed", { userId: user.id, err });
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
