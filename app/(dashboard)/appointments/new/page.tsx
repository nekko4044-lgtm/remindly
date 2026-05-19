"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { Client } from "@/lib/types";
import { Search, ChevronDown } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#e8502a] focus:border-transparent";

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

  const [serviceName, setServiceName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("appointments").insert({
      user_id: user!.id,
      client_id: selectedClient.id,
      service_name: serviceName.trim(),
      scheduled_at: scheduledAt,
      notes: notes.trim() || null,
      status: "scheduled",
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

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
              className={`${inputCls} flex items-center justify-between text-left ${
                selectedClient ? "text-white" : "text-[#555555]"
              }`}
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
                    <li className="px-3 py-2 text-sm text-[#555555]">
                      No clients found.
                    </li>
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
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[#222222] transition-colors ${
                            selectedClient?.id === c.id
                              ? "text-white font-medium"
                              : "text-[#888888]"
                          }`}
                        >
                          <span>{c.name}</span>
                          <span className="ml-2 text-[#555555] text-xs">
                            {c.phone}
                          </span>
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
          <Field label="Date" required>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Time" required>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputCls}
            />
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
