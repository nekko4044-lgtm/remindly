"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@/lib/types";

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const PLAN_LABELS: Record<string, string> = {
  trial: "Free Trial",
  solo: "Solo",
  business: "Business",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-gray-100 text-gray-600",
  solo: "bg-blue-50 text-blue-700",
  business: "bg-purple-50 text-purple-700",
  pro: "bg-amber-50 text-amber-700",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Partial<User>>({});
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [smsTemplate24h, setSmsTemplate24h] = useState(
    "Hi {name}! Reminder: your {service} appointment is tomorrow at {time}. Reply YES to confirm or NO to cancel."
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        setBusinessName(data.business_name ?? "");
        setTimezone(data.timezone ?? "UTC");
        setSmsTemplate24h(
          data.sms_template_24h ??
            "Hi {name}! Reminder: your {service} appointment is tomorrow at {time}. Reply YES to confirm or NO to cancel."
        );
      }
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from("users")
      .update({
        business_name: businessName.trim(),
        timezone,
        sms_template_24h: smsTemplate24h.trim(),
      })
      .eq("id", user!.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
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
      <div className="p-8 max-w-2xl mx-auto">
        <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Info */}
        <Section title="Business">
          <Field label="Business Name">
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputCls}
              placeholder="My Business"
            />
          </Field>
        </Section>

        {/* Localization */}
        <Section title="Localization">
          <Field label="Timezone">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputCls}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        {/* SMS Templates */}
        <Section title="SMS Reminders">
          <Field
            label="24-Hour Reminder Template"
            hint="Variables: {name}, {service}, {time}, {date}"
          >
            <textarea
              value={smsTemplate24h}
              onChange={(e) => setSmsTemplate24h(e.target.value)}
              className={`${inputCls} resize-none`}
              rows={3}
            />
          </Field>
        </Section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">Changes saved.</span>
          )}
        </div>
      </form>

      {/* Plan info */}
      <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          Subscription
        </h2>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              PLAN_COLORS[profile.plan ?? "trial"]
            }`}
          >
            {PLAN_LABELS[profile.plan ?? "trial"]}
          </span>
          {profile.plan === "trial" && trialEnd && (
            <span className="text-xs text-gray-500">
              Trial ends {trialEnd}
            </span>
          )}
        </div>
        <a
          href="/billing"
          className="mt-3 inline-block text-xs font-medium text-gray-900 hover:underline"
        >
          Manage billing →
        </a>
      </div>
    </div>
  );
}
