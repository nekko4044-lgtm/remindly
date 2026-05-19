"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@/lib/types";
import { Check } from "lucide-react";

type Plan = "solo" | "business" | "pro";

const PLANS: {
  key: Plan;
  name: string;
  price: number;
  priceId: string;
  features: string[];
}[] = [
  {
    key: "solo",
    name: "Solo",
    price: 19,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO ?? "",
    features: [
      "Up to 50 clients",
      "SMS & email reminders",
      "1 staff member",
      "Basic analytics",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS ?? "",
    features: [
      "Up to 200 clients",
      "SMS & email reminders",
      "5 staff members",
      "Advanced analytics",
      "Custom SMS templates",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? "",
    features: [
      "Unlimited clients",
      "SMS & email reminders",
      "Unlimited staff",
      "Priority support",
      "Custom SMS templates",
      "API access",
    ],
  },
];

const PLAN_LABELS: Record<string, string> = {
  trial: "Free Trial",
  solo: "Solo",
  business: "Business",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-[#252525] text-[#888888]",
  solo: "bg-blue-500/15 text-blue-400",
  business: "bg-purple-500/15 text-purple-400",
  pro: "bg-amber-500/15 text-amber-400",
};

export default function BillingPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("plan, trial_ends_at, stripe_customer_id")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line

  async function handleUpgrade(plan: Plan, priceId: string) {
    setCheckoutLoading(plan);
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    } else {
      alert("Failed to start checkout. Please try again.");
      setCheckoutLoading(null);
    }
  }

  const trialEnd = profile.trial_ends_at
    ? new Date(profile.trial_ends_at).toLocaleDateString([], {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="py-16 text-center text-sm text-[#555555]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <div className="mt-3 flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              PLAN_COLORS[profile.plan ?? "trial"]
            }`}
          >
            {PLAN_LABELS[profile.plan ?? "trial"]}
          </span>
          {profile.plan === "trial" && trialEnd && (
            <span className="text-sm text-[#888888]">
              Your free trial ends on {trialEnd}. Upgrade to keep access.
            </span>
          )}
          {profile.plan !== "trial" && (
            <span className="text-sm text-[#888888]">
              You&apos;re on the {PLAN_LABELS[profile.plan ?? "solo"]} plan.
            </span>
          )}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = profile.plan === plan.key;
          return (
            <div
              key={plan.key}
              className={`bg-[#1a1a1a] border rounded-xl p-6 flex flex-col ${
                isCurrent
                  ? "border-[#e8502a] ring-1 ring-[#e8502a]/50"
                  : "border-[#2a2a2a]"
              }`}
            >
              <div className="mb-4">
                <h2 className="text-base font-semibold text-white">
                  {plan.name}
                </h2>
                <div className="mt-1">
                  <span className="text-3xl font-bold text-white">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-[#888888]">/mo</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#888888]">
                    <Check className="w-4 h-4 text-[#e8502a] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full px-4 py-2 text-sm font-medium text-center text-[#888888] border border-[#2a2a2a] rounded-lg bg-[#151515]">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.key, plan.priceId)}
                  disabled={checkoutLoading !== null}
                  className="w-full px-4 py-2 text-sm font-medium bg-[#e8502a] text-white rounded-lg hover:bg-[#d44424] disabled:opacity-50 transition-colors"
                >
                  {checkoutLoading === plan.key
                    ? "Redirecting…"
                    : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
