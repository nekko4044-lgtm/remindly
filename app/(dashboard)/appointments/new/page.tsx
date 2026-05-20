"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { Client } from "@/lib/types";
import { ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ClientWithCount = Client & { appointments_count: number };

const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => {
  const mins = 8 * 60 + i * 15;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const label = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { value, label };
});

const DURATION_OPTIONS = [
  "30 minutes", "1 hour", "1 hour 30 minutes", "2 hours", "2 hours 30 minutes", "3 hours",
];

const TIMEZONES = [
  "(CT) America/Chicago",
  "(ET) America/New_York",
  "(MT) America/Denver",
  "(PT) America/Los_Angeles",
];

const AVATAR_COLORS = ["#7e57c2","#42a5f5","#66bb6a","#ef5350","#ffa726","#26c6da","#ec407a","#8d6e63"];

function avatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const inputCls =
  "w-full px-3 py-2.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-[14px] text-white placeholder-[#6b6b6b] focus:outline-none focus:border-[#e8502a] focus:ring-1 focus:ring-[#e8502a]/40 transition-colors";

const selectCls =
  "w-full px-3 py-2.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-[14px] text-white focus:outline-none focus:border-[#e8502a] focus:ring-1 focus:ring-[#e8502a]/40 transition-colors appearance-none cursor-pointer";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
      <label className="text-[12.5px] font-medium text-[#a3a3a3]">
        {label}{required && <span className="text-[#e8502a] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="pb-6 border-b border-[#2a2a2a] mb-6 last:border-0 last:pb-0 last:mb-0">
      <h3 className="text-[14px] font-semibold text-white mb-0.5">{title}</h3>
      {hint && <p className="text-[12.5px] text-[#6b6b6b] mb-4">{hint}</p>}
      {!hint && <div className="mt-3" />}
      {children}
    </div>
  );
}

// Native select with custom chevron
function Select({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectCls}
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6b6b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: "14px", paddingRight: "36px" }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<ClientWithCount[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithCount | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeOpen, setTimeOpen] = useState(false);
  const timeRef = useRef<HTMLDivElement>(null);
  const timeListRef = useRef<HTMLUListElement>(null);
  const dateScrollRef = useRef<HTMLDivElement>(null);

  function scrollDates(dir: "left" | "right") {
    dateScrollRef.current?.scrollBy({ left: dir === "right" ? 240 : -240, behavior: "smooth" });
  }
  const [timezone, setTimezone] = useState(TIMEZONES[0]);

  const [serviceName, setServiceName] = useState("");
  const [duration, setDuration] = useState("1 hour");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Generate 14 upcoming date chips
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dateChips = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(todayStart.getTime() + i * 86_400_000);
    return {
      value: toDateStr(d),
      dow: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      day: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
    };
  });

  useEffect(() => {
    supabase
      .from("clients")
      .select("*, appointments(count)")
      .order("name")
      .then(({ data }) => {
        if (data) setClients(data.map((c) => ({
          ...c,
          appointments_count: (c.appointments as { count: number }[] | null)?.[0]?.count ?? 0,
        })));
      });
  }, []); // eslint-disable-line

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setClientOpen(false);
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) setTimeOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (timeOpen && time && timeListRef.current) {
      const selected = timeListRef.current.querySelector<HTMLElement>('[data-selected="true"]');
      if (selected) selected.scrollIntoView({ block: "nearest" });
    }
  }, [timeOpen]); // eslint-disable-line

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // Reminder 24h before
  const reminderDate = date && time
    ? new Date(new Date(`${date}T${time}`).getTime() - 24 * 60 * 60 * 1000).toLocaleString([], {
        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  const selectedTimeLabel = TIME_OPTIONS.find((t) => t.value === time)?.label ?? "—";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedClient) { setError("Please select a client."); return; }
    if (!serviceName.trim()) { setError("Service name is required."); return; }
    if (!date || !time) { setError("Date and time are required."); return; }
    setSaving(true);

    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: newApt, error: insertError } = await supabase
      .from("appointments")
      .insert({ user_id: user!.id, client_id: selectedClient.id, service_name: serviceName.trim(), scheduled_at: scheduledAt, notes: notes.trim() || null, status: "scheduled" })
      .select("id")
      .single();

    if (insertError) { setError(insertError.message); setSaving(false); return; }

    fetch("/api/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName: selectedClient.name, clientEmail: selectedClient.email, serviceName: serviceName.trim(), scheduledAt }),
    }).catch(() => {});

    if (newApt?.id) {
      fetch("/api/send-confirmation-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: newApt.id }),
      }).catch(() => {});
    }

    router.push("/appointments");
  }

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-end justify-between gap-6 mb-7 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">New appointment</h1>
          <p className="text-[14px] text-[#a3a3a3] mt-1">Schedule a booking and we&apos;ll send a reminder text 24 hours before.</p>
        </div>
        <button type="button" onClick={() => router.back()} className="inline-flex items-center h-9 px-3.5 rounded-lg text-[13.5px] font-medium text-[#a3a3a3] border border-[#2a2a2a] hover:bg-[#1a1a1a] hover:text-white transition-all">
          Cancel
        </button>
      </div>

      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-7">

          {/* Client */}
          <Section title="Client" hint="Pick from your existing clients, or add a new one.">
            <Field label="Client" required>
              <div className="relative" ref={dropdownRef}>
                {/* Picker trigger */}
                <div
                  onClick={() => setClientOpen((o) => !o)}
                  className={cn(
                    "flex items-center gap-2.5 px-2 pr-3 py-1.5 bg-[#0d0d0d] border rounded-lg cursor-pointer transition-colors",
                    clientOpen ? "border-[#e8502a]" : "border-[#2a2a2a] hover:border-[#353535]"
                  )}
                >
                  {selectedClient ? (
                    <>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0" style={{ background: avatarColor(selectedClient.name) }}>
                        {initials(selectedClient.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium text-white">{selectedClient.name}</div>
                        <div className="text-[12px] text-[#6b6b6b] font-mono">
                          {selectedClient.phone}{selectedClient.appointments_count > 0 && ` · ${selectedClient.appointments_count} prior appointment${selectedClient.appointments_count !== 1 ? "s" : ""}`}
                        </div>
                      </div>
                    </>
                  ) : (
                    <span className="flex-1 text-[14px] text-[#6b6b6b] py-1">Select a client…</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-[#6b6b6b] shrink-0" />
                </div>

                {clientOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-[#2a2a2a]">
                      <input
                        autoFocus
                        type="text"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="Search clients…"
                        className="w-full px-3 py-1.5 text-sm bg-[#0d0d0d] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:border-[#e8502a]"
                      />
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <li className="px-3 py-2.5 text-sm text-[#6b6b6b]">No clients found.</li>
                      ) : filteredClients.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => { setSelectedClient(c); setClientOpen(false); setClientSearch(""); }}
                            className={cn("w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#e8502a]/10 transition-colors", selectedClient?.id === c.id && "bg-[#e8502a]/10")}
                          >
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0" style={{ background: avatarColor(c.name) }}>
                              {initials(c.name)}
                            </div>
                            <span className="flex-1 text-left text-[13.5px] font-medium text-white">{c.name}</span>
                            <span className="font-mono text-[12px] text-[#6b6b6b]">{c.phone}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Field>
          </Section>

          {/* Service */}
          <Section title="Service" hint="What are you booking them in for?">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Service" required>
                <input value={serviceName} onChange={(e) => setServiceName(e.target.value)} className={inputCls} placeholder="e.g. Haircut" />
              </Field>
              <Field label="Duration">
                <Select value={duration} onChange={setDuration} options={DURATION_OPTIONS} />
              </Field>
            </div>
          </Section>

          {/* When */}
          <Section title="When" hint="Pick a date and time. Reminders go out automatically 24 hours before.">
            <Field label="Date" required>
              <div className="relative flex items-center gap-1">
                {/* Left arrow */}
                <button
                  type="button"
                  onClick={() => scrollDates("left")}
                  className="shrink-0 w-8 h-[76px] rounded-lg bg-[#0d0d0d] border border-[#2a2a2a] flex items-center justify-center text-[#6b6b6b] hover:text-white hover:border-[#353535] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Scrollable chips */}
                <div
                  ref={dateScrollRef}
                  className="flex gap-1.5 overflow-x-auto flex-1 min-w-0 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none" }}
                >
                  {dateChips.map(({ value, dow, day, month }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDate(value)}
                      className={cn(
                        "flex-shrink-0 w-[62px] rounded-lg py-2.5 text-center cursor-pointer transition-all border",
                        date === value
                          ? "bg-[rgba(232,80,42,0.14)] border-[#e8502a] text-white"
                          : "bg-[#0d0d0d] border-[#2a2a2a] text-white hover:border-[#353535]"
                      )}
                    >
                      <div className={cn("font-mono text-[10.5px] tracking-[0.04em] uppercase", date === value ? "text-[#ff6a3d]" : "text-[#6b6b6b]")}>
                        {dow}
                      </div>
                      <div className="text-[17px] font-semibold leading-tight mt-0.5">{day}</div>
                      <div className="text-[10px] text-[#6b6b6b]">{month}</div>
                    </button>
                  ))}
                </div>

                {/* Right arrow */}
                <button
                  type="button"
                  onClick={() => scrollDates("right")}
                  className="shrink-0 w-8 h-[76px] rounded-lg bg-[#0d0d0d] border border-[#2a2a2a] flex items-center justify-center text-[#6b6b6b] hover:text-white hover:border-[#353535] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3 mt-1">
              {/* Time */}
              <Field label="Time" required>
                <div className="relative" ref={timeRef}>
                  <button
                    type="button"
                    onClick={() => setTimeOpen((o) => !o)}
                    className={cn(inputCls, "flex items-center justify-between text-left", time ? "text-white" : "text-[#6b6b6b]")}
                  >
                    {time ? selectedTimeLabel : "Pick a time"}
                    <Clock className="w-4 h-4 text-[#6b6b6b] shrink-0" />
                  </button>
                  {timeOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
                      <ul ref={timeListRef} className="max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#3a3a3a]">
                        {TIME_OPTIONS.map(({ value: tv, label: tl }) => (
                          <li key={tv}>
                            <button
                              type="button"
                              data-selected={time === tv ? "true" : undefined}
                              onClick={() => { setTime(tv); setTimeOpen(false); }}
                              className={cn("w-full text-left px-4 py-2 text-sm font-mono transition-colors", time === tv ? "bg-[#e8502a] text-white" : "text-[#a3a3a3] hover:bg-[#e8502a]/10 hover:text-white")}
                            >
                              {tl}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Field>

              {/* Timezone */}
              <Field label="Time zone">
                <Select value={timezone} onChange={setTimezone} options={TIMEZONES} />
              </Field>
            </div>
          </Section>

          {/* Notes */}
          <Section title="Notes" hint="Anything you want to remember. The client won't see this.">
            <Field label="Internal notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-none`} rows={4} placeholder="e.g. Prefers shorter on the sides. Bring color reference photo." />
            </Field>
          </Section>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mb-4">{error}</p>
          )}

          <div className="flex gap-2.5 mt-6 pt-6 border-t border-[#2a2a2a]">
            <button type="button" onClick={() => router.back()} className="h-[42px] px-5 text-[14px] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:bg-[#222222] hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 h-[42px] px-5 text-[14px] bg-[#e8502a] text-white rounded-lg font-medium hover:bg-[#ff6a3d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-[0_6px_16px_-6px_rgba(232,80,42,0.5)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>
              {saving ? "Saving…" : "Schedule Appointment"}
            </button>
          </div>
        </form>

        {/* Summary panel */}
        <aside className="sticky top-[90px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-[22px]">
          <h3 className="font-mono text-[13px] font-medium text-[#6b6b6b] uppercase tracking-[0.08em] mb-3.5">Summary</h3>
          <SummaryRow k="Client" v={selectedClient?.name ?? "—"} />
          <SummaryRow k="Service" v={serviceName || "—"} />
          <SummaryRow k="Duration" v={duration} />
          <SummaryRow k="Date" v={date ? formatDateShort(date) : "—"} />
          <SummaryRow k="Time" v={time ? selectedTimeLabel : "—"} />

          {selectedClient?.phone && (
            <div className="mt-4 bg-[#0d0d0d] border border-dashed border-[#353535] rounded-lg p-3.5 text-[12.5px] text-[#a3a3a3] leading-relaxed">
              <div className="font-mono text-[12px] uppercase tracking-[0.06em] text-[#e8502a] font-medium mb-1.5">Reminder schedule</div>
              {reminderDate ? (
                <>We&apos;ll text <strong className="text-white">{selectedClient.name}</strong> at <strong className="text-white font-mono">{selectedClient.phone}</strong> on <strong className="text-white">{reminderDate}</strong> — 24 hours before the appointment.</>
              ) : (
                <>Pick a date and time to see when the reminder will be sent to <strong className="text-white">{selectedClient.name}</strong>.</>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-t border-[#2a2a2a] first:border-t-0 gap-3 text-[13.5px]">
      <span className="text-[#6b6b6b]">{k}</span>
      <span className="text-white font-medium text-right break-words max-w-[60%]">{v}</span>
    </div>
  );
}
