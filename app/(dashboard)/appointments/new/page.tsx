"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { Client } from "@/lib/types";
import { Search, ChevronDown, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// 08:00 → 20:00 in 15-min increments (49 slots)
const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => {
  const mins = 8 * 60 + i * 15;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "Pick a date";
  return new Date(dateStr + "T12:00:00").toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const inputCls =
  "w-full px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#e8502a] focus:border-transparent";

// Light-theme CSS vars scoped to the Calendar popover so dates are clearly visible
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

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#888888] mb-1">
        {label}
        {required && <span className="text-[#e8502a] ml-0.5">*</span>}
      </label>
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
    supabase
      .from("clients")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setClients(data);
      });
  }, []); // eslint-disable-line

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setClientOpen(false);
      }
      if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
        setTimeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Scroll selected time slot into view when the dropdown opens
  useEffect(() => {
    if (timeOpen && time && timeListRef.current) {
      const selected = timeListRef.current.querySelector<HTMLElement>('[data-selected="true"]');
      if (selected) selected.scrollIntoView({ block: "nearest" });
    }
  }, [timeOpen]); // eslint-disable-line

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

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
      .insert({
        user_id: user!.id,
        client_id: selectedClient.id,
        service_name: serviceName.trim(),
        scheduled_at: scheduledAt,
        notes: notes.trim() || null,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    // Email confirmation (best-effort)
    fetch("/api/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: selectedClient.name,
        clientEmail: selectedClient.email,
        serviceName: serviceName.trim(),
        scheduledAt,
      }),
    }).catch(() => {});

    // SMS confirmation (best-effort)
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
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">New Appointment</h1>
        <p className="text-sm text-[#888888] mt-1">
          Schedule an appointment and send a confirmation to your client.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 space-y-5"
      >
        {/* Client selector */}
        <Field label="Client" required>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setClientOpen((o) => !o)}
              className={cn(
                inputCls,
                "flex items-center justify-between text-left",
                selectedClient ? "text-white" : "text-[#555555]"
              )}
            >
              {selectedClient ? selectedClient.name : "Select a client…"}
              <ChevronDown className="w-4 h-4 text-[#555555] shrink-0" />
            </button>

            {clientOpen && (
              <div className="absolute z-10 mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden">
                <div className="p-2 border-b border-[#2a2a2a]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555] pointer-events-none" />
                    <input
                      autoFocus
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search clients…"
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#111111] border border-[#2a2a2a] rounded-md text-white placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#e8502a]"
                    />
                  </div>
                </div>
                <ul className="max-h-48 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-[#555555]">No clients found.</li>
                  ) : (
                    filteredClients.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClient(c);
                            setClientOpen(false);
                            setClientSearch("");
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm hover:bg-[#222222] transition-colors",
                            selectedClient?.id === c.id ? "text-white font-medium" : "text-[#888888]"
                          )}
                        >
                          <span>{c.name}</span>
                          <span className="ml-2 text-[#555555] text-xs">{c.phone}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </Field>

        {/* Service */}
        <Field label="Service" required>
          <input
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Haircut, Massage, Consultation…"
          />
        </Field>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-4">

          {/* Date — light-theme Calendar in a Popover */}
          <Field label="Date" required>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8502a]",
                    date ? "text-white" : "text-[#555555]"
                  )}
                >
                  {formatDateDisplay(date)}
                  <CalendarIcon className="w-4 h-4 text-[#555555] shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto p-0 bg-white border-[#e5e5e5] shadow-xl"
              >
                <div style={calendarVars}>
                  <Calendar
                    mode="single"
                    selected={date ? new Date(date + "T12:00:00") : undefined}
                    onSelect={(d) => {
                      if (d) {
                        setDate(toDateStr(d));
                        setDateOpen(false);
                      }
                    }}
                    disabled={{ before: todayStart }}
                    autoFocus
                    classNames={{
                      today: "ring-1 ring-[#e8502a] rounded-md",
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </Field>

          {/* Time — custom scrollable dropdown, 08:00–20:00 in 15-min steps */}
          <Field label="Time" required>
            <div className="relative" ref={timeRef}>
              <button
                type="button"
                onClick={() => setTimeOpen((o) => !o)}
                className={cn(
                  inputCls,
                  "flex items-center justify-between text-left",
                  time ? "text-white" : "text-[#555555]"
                )}
              >
                {time || "Pick a time"}
                <Clock className="w-4 h-4 text-[#555555] shrink-0" />
              </button>

              {timeOpen && (
                <div className="absolute z-10 mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl overflow-hidden">
                  <ul
                    ref={timeListRef}
                    className="max-h-[240px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#3a3a3a] [&::-webkit-scrollbar-track]:bg-transparent"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <li key={t}>
                        <button
                          type="button"
                          data-selected={time === t ? "true" : undefined}
                          onClick={() => {
                            setTime(t);
                            setTimeOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer",
                            time === t
                              ? "bg-[#e8502a] text-white"
                              : "text-[#888888] hover:bg-[#e8502a] hover:text-white"
                          )}
                        >
                          {t}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Field>
        </div>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Any notes for this appointment…"
          />
        </Field>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 text-sm border border-[#2a2a2a] text-[#888888] rounded-lg hover:bg-[#222222] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm bg-[#e8502a] text-white rounded-lg hover:bg-[#d44424] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Schedule Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
