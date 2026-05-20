"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import Link from "next/link";
import { Calendar, CheckCircle, Bell } from "lucide-react";
import type { User } from "@/lib/types";

const inputCls =
  "w-full px-3 py-2.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-[14px] text-white placeholder-[#6b6b6b] focus:outline-none focus:border-[#e8502a] focus:ring-1 focus:ring-[#e8502a]/40 transition-colors";

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
  trial: "bg-[#252525] text-[#a3a3a3]",
  solo: "bg-blue-500/15 text-blue-400",
  business: "bg-purple-500/15 text-purple-400",
  pro: "bg-amber-500/15 text-amber-400",
};

function Section({
  title,
  hint,
  children,
  last,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`pb-6 ${last ? "" : "border-b border-[#2a2a2a] mb-6"}`}>
      <h3 className="text-[14px] font-semibold text-white mb-0.5">{title}</h3>
      {hint && <p className="text-[12.5px] text-[#6b6b6b] mb-4">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
      <label className="text-[12.5px] font-medium text-[#a3a3a3]">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-[#6b6b6b]">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Partial<User>>({});
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [smsTemplate24h, setSmsTemplate24h] = useState(
    "Hi {name}! Reminder: your {service} appointment is tomorrow at {time}. Reply YES to confirm or NO to cancel."
  );

  const [twilioPhone, setTwilioPhone] = useState<string | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/phone")
      .then((r) => r.json())
      .then((d) => setTwilioPhone(d.phone ?? null))
      .catch(() => setTwilioPhone(null))
      .finally(() => setPhoneLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from("users")
      .update({ business_name: businessName.trim(), timezone, sms_template_24h: smsTemplate24h.trim() })
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
    ? new Date(profile.trial_ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const plan = profile.plan ?? "trial";

  if (loading) {
    return <div className="p-8"><div className="py-16 text-center text-[14px] text-[#6b6b6b]">Loading…</div></div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-[1400px]">
      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">Settings</h1>
        <p className="text-[14px] text-[#a3a3a3] mt-1">Manage your business profile and notification preferences.</p>
      </div>

      <div className="grid gap-6 items-start grid-cols-1 md:grid-cols-[1.4fr_1fr]">
        {/* Left: form */}
        <form onSubmit={handleSave} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-7">

          <Section title="Business" hint="Your business name appears in reminder messages sent to clients.">
            <Field label="Business Name">
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputCls}
                placeholder="e.g. Sarah's Hair Studio"
              />
            </Field>
            <Field label="Account Email">
              <input value={email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
            </Field>
          </Section>

          <Section title="Localization" hint="Used to format dates and times in reminders.">
            <Field label="Timezone">
              <div className="relative">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={inputCls}
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    backgroundSize: "14px",
                    paddingRight: "36px",
                    appearance: "none",
                  }}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} style={{ background: "#1a1a1a" }}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </Section>

          <Section title="SMS Reminders" hint="Customize the message sent to clients 24 hours before their appointment." last>
            <Field
              label="24-Hour Reminder Template"
              hint="Variables: {name}, {service}, {time}, {date}"
            >
              <textarea
                value={smsTemplate24h}
                onChange={(e) => setSmsTemplate24h(e.target.value)}
                className={`${inputCls} resize-none`}
                rows={4}
              />
            </Field>
            {/* Live preview */}
            <div className="mt-3 bg-[#0d0d0d] border border-dashed border-[#353535] rounded-lg p-3.5">
              <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#e8502a] font-medium mb-1.5">Preview</div>
              <p className="text-[13px] text-[#a3a3a3] leading-relaxed">
                {smsTemplate24h
                  .replace("{name}", "Alex")
                  .replace("{service}", "Haircut")
                  .replace("{time}", "2:00 PM")
                  .replace("{date}", "Fri, May 23")}
              </p>
            </div>
          </Section>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mb-4">{error}</p>
          )}

          <div className="flex items-center gap-3 pt-6 border-t border-[#2a2a2a] mt-6">
            <button
              type="submit"
              disabled={saving}
              className="h-[42px] px-6 text-[14px] bg-[#e8502a] text-white rounded-lg font-medium hover:bg-[#ff6a3d] disabled:opacity-50 transition-colors shadow-[0_6px_16px_-6px_rgba(232,80,42,0.5)]"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-[13.5px] text-[#22c55e]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="20 6 9 17 4 12"/></svg>
                Changes saved
              </span>
            )}
          </div>
        </form>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Subscription */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-6">
            <h3 className="text-[14px] font-semibold text-white mb-4">Subscription</h3>

            <div className="flex items-center gap-2.5 mb-4">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium ${PLAN_COLORS[plan]}`}>
                {PLAN_LABELS[plan]}
              </span>
              {plan === "trial" && trialEnd && (
                <span className="text-[13px] text-[#6b6b6b]">Trial ends {trialEnd}</span>
              )}
            </div>

            {plan === "trial" && (
              <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-4 mb-4">
                <div className="text-[13px] text-[#a3a3a3] leading-relaxed">
                  You&apos;re on a free trial. Upgrade to keep sending reminders and unlock unlimited clients.
                </div>
              </div>
            )}

            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13.5px] font-medium bg-[#e8502a] text-white hover:bg-[#ff6a3d] transition-colors"
            >
              Manage billing
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>

          {/* Quick info */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-6">
            <h3 className="text-[14px] font-semibold text-white mb-4">How reminders work</h3>
            <div className="space-y-3">
              {[
                { icon: <Calendar className="text-[#e8502a] w-5 h-5" />, text: "A reminder SMS is sent 24 hours before each appointment." },
                { icon: <CheckCircle className="text-[#e8502a] w-5 h-5" />, text: "Clients reply YES to confirm or NO to cancel." },
                { icon: <Bell className="text-[#e8502a] w-5 h-5" />, text: "A second reminder goes out 2 hours before." },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3 text-[13px] text-[#a3a3a3]">
                  <span className="shrink-0 mt-px">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Twilio phone */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-6">
            <h3 className="text-[14px] font-semibold text-white mb-1">Sender number</h3>
            <p className="text-[12.5px] text-[#6b6b6b] mb-3">
              SMS reminders are sent from this number. Your clients will see it when they receive a text.
            </p>
            <div className="font-mono text-[15px] font-medium text-white">
              {phoneLoading
                ? <span className="text-[#6b6b6b] text-[13px]">Loading…</span>
                : twilioPhone
                  ? twilioPhone
                  : <span className="text-[#6b6b6b] text-[13px]">Not configured</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
