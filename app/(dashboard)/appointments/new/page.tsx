"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { Client } from "@/lib/types";
import { Search, ChevronDown, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => {
  const mins = 8 * 60 + i * 15;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "Pick a date";
  return new Date(dateStr + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTimeDisplay(t: string): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const inputCls =
  "w-full px-3 py-2.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-[14px] text-white placeholder-[#6b6b6b] focus:outline-none focus:border-[#e8502a] focus:ring-1 focus:ring-[#e8502a]/40 transition-colors";

const calendarVars = {
  "--primary": "#e8502a",
  "--primary-foreground": "#ffffff",
  "--accent": "#f5f5f5",
  "--accent-foreground": "#111111",
  "--muted-foreground": "#777777",
  "--background": "#ffffff",
  "--foreground": "#111111",
  "--border": "#e5e5e5",
  "--ring": "#e8502a",
} as React.CSSProperties;

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
      <label className="text-[12.5px] font-medium text-[#a3a3a3] tracking-[0.005em]">
        {label}
        {required && <span className="text-[#e8502a] ml-0.5">*</span>}
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

export default function NewAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [time, setTime] = useState("");
  const [timeOpen, setTimeOpen] = useState(false);
  const timeRef = useRef<HTMLDivElement>(null);
  const timeListRef = useRef<HTMLUListElement>(null);

  const [serviceName, setServiceName] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  useEffect(() => {
    supabase.from("clients").select("*").order("name").then(({ data }) => {
      if (data) setClients(data);
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

  // Reminder schedule preview: 24h before
  const reminderDate = date && time
    ? new Date(new Date(`${date}T${time}`).getTime() - 24 * 60 * 60 * 1000).toLocaleString([], {
        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

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
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13.5px] font-medium text-[#a3a3a3] border border-[#2a2a2a] hover:bg-[#1a1a1a] hover:text-white hover:border-[#353535] transition-all"
        >
          Cancel
        </button>
      </div>

      <div className="grid gap-6 items-start" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        {/* Form card */}
        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-7">

          <Section title="Client" hint="Pick from your existing clients.">
            <Field label="Client" required>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setClientOpen((o) => !o)}
                  className={cn(inputCls, "flex items-center justify-between text-left", selectedClient ? "text-white" : "text-[#6b6b6b]")}
                >
                  {selectedClient ? selectedClient.name : "Select a client…"}
                  <ChevronDown className="w-4 h-4 text-[#6b6b6b] shrink-0" />
                </button>

                {clientOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-[#2a2a2a]">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b6b] pointer-events-none" />
                        <input
                          autoFocus
                          type="text"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          placeholder="Search clients…"
                          className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#0d0d0d] border border-[#2a2a2a] rounded-md text-white placeholder-[#6b6b6b] focus:outline-none focus:border-[#e8502a]"
                        />
                      </div>
                    </div>
                    <ul className="max-h-48 overflow-y-auto">
                      {filteredClients.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-[#6b6b6b]">No clients found.</li>
                      ) : (
                        filteredClients.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => { setSelectedClient(c); setClientOpen(false); setClientSearch(""); }}
                              className={cn("w-full text-left px-3 py-2 text-sm hover:bg-[#e8502a]/10 transition-colors", selectedClient?.id === c.id ? "text-[#e8502a]" : "text-[#a3a3a3]")}
                            >
                              <span className="font-medium">{c.name}</span>
                              <span className="ml-2 text-[#6b6b6b] font-mono text-xs">{c.phone}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </Field>
          </Section>

          <Section title="Service" hint="What are you booking them in for?">
            <Field label="Service" required>
              <input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className={inputCls}
                placeholder="e.g. Haircut, Massage, Consultation…"
              />
            </Field>
          </Section>

          <Section title="When" hint="Pick a date and time. Reminders go out automatically 24 hours before.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn("w-full flex items-center justify-between px-3 py-2.5 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg text-[14px] transition-colors focus:outline-none focus:border-[#e8502a]", date ? "text-white" : "text-[#6b6b6b]")}
                    >
                      {formatDateDisplay(date)}
                      <CalendarIcon className="w-4 h-4 text-[#6b6b6b] shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0 bg-white border-[#e5e5e5] shadow-xl">
                    <div style={calendarVars}>
                      <Calendar
                        mode="single"
                        selected={date ? new Date(date + "T12:00:00") : undefined}
                        onSelect={(d) => { if (d) { setDate(toDateStr(d)); setDateOpen(false); } }}
                        disabled={{ before: todayStart }}
                        autoFocus
                        classNames={{ today: "ring-1 ring-[#e8502a] rounded-md" }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </Field>

              <Field label="Time" required>
                <div className="relative" ref={timeRef}>
                  <button
                    type="button"
                    onClick={() => setTimeOpen((o) => !o)}
                    className={cn(inputCls, "flex items-center justify-between text-left", time ? "text-white" : "text-[#6b6b6b]")}
                  >
                    {time ? formatTimeDisplay(time) : "Pick a time"}
                    <Clock className="w-4 h-4 text-[#6b6b6b] shrink-0" />
                  </button>

                  {timeOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden">
                      <ul
                        ref={timeListRef}
                        className="max-h-[240px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#3a3a3a] [&::-webkit-scrollbar-track]:bg-transparent"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <li key={t}>
                            <button
                              type="button"
                              data-selected={time === t ? "true" : undefined}
                              onClick={() => { setTime(t); setTimeOpen(false); }}
                              className={cn("w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer font-mono", time === t ? "bg-[#e8502a] text-white" : "text-[#a3a3a3] hover:bg-[#e8502a]/10 hover:text-white")}
                            >
                              {formatTimeDisplay(t)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Field>
            </div>
          </Section>

          <Section title="Notes" hint="Anything you want to remember. The client won't see this.">
            <Field label="Internal notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="e.g. Client prefers shorter on the sides…"
              />
            </Field>
          </Section>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mb-4">
              {error}
            </p>
          )}

          <div className="flex gap-2.5 mt-6 pt-6 border-t border-[#2a2a2a]">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-[42px] px-5 text-[14px] border border-[#2a2a2a] text-[#a3a3a3] rounded-lg hover:bg-[#222222] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-[42px] px-5 text-[14px] bg-[#e8502a] text-white rounded-lg font-medium hover:bg-[#ff6a3d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-[0_6px_16px_-6px_rgba(232,80,42,0.5)]"
            >
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
          <SummaryRow k="Date" v={date ? formatDateDisplay(date) : "—"} />
          <SummaryRow k="Time" v={time ? formatTimeDisplay(time) : "—"} />

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
