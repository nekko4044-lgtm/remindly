import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_PRICE_SOLO ?? ""]: "solo",
  [process.env.STRIPE_PRICE_BUSINESS ?? ""]: "business",
  [process.env.STRIPE_PRICE_PRO ?? ""]: "pro",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = session.customer as string;

    // Get the price from the subscription
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    const priceId = subscription.items.data[0].price.id;
    const plan = PRICE_TO_PLAN[priceId] ?? "solo";

    await supabase
      .from("users")
      .update({ plan, trial_ends_at: null })
      .eq("stripe_customer_id", customerId);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    // Revert to trial (or could set to a locked state)
    await supabase
      .from("users")
      .update({
        plan: "trial",
        trial_ends_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId);
  }

  return NextResponse.json({ ok: true });
}

