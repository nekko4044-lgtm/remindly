"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

type Row = Appointment & { client: { name: string } | null };

type Filter = "all" | "today" | "week" | "confirmed" | "cancelled";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "confirmed", label: "Confirmed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_OPTIONS: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  confirmed: "bg-green-500/15 text-green-400 border-green-500/25",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
  no_show: "bg-[#252525] text-[#888888] border-[#333333]",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/25",
};

const statusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  no_show: "No-show",
  completed: "Completed",
};

export default function AppointmentsPage() {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchAppointments() {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("*, client:clients(name)")
      .order("scheduled_at", { ascending: false });
    if (data) setAppointments(data as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchAppointments();
  }, []); // eslint-disable-line

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const weekEnd = new Date(todayStart.getTime() + 7 * 86_400_000);

    return appointments.filter((a) => {
      const d = new Date(a.scheduled_at);
      if (filter === "today") return d >= todayStart && d < todayEnd;
      if (filter === "week") return d >= todayStart && d < weekEnd;
      if (filter === "confirmed") return a.status === "confirmed";
      if (filter === "cancelled") return a.status === "cancelled";
      return true;
    });
  }, [appointments, filter]);

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    setUpdatingId(id);
    await supabase.from("appointments").update({ status }).eq("id", id);
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    setUpdatingId(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("appointments").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    fetchAppointments();
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Appointments</h1>
        <Link
          href="/appointments/new"
          className="inline-flex items-center gap-2 bg-[#e8502a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d44424] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Appointment
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-[#151515] p-1 rounded-lg w-fit">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === key
                ? "bg-[#252525] text-white shadow-sm"
                : "text-[#888888] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#555555]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#555555]">
            No appointments found.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#151515]">
              <tr>
                {["Client", "Service", "Date & Time", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-xs font-medium text-[#555555] uppercase tracking-wide ${
                      h === "" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {filtered.map((apt) => (
                <tr key={apt.id} className="hover:bg-[#1f1f1f]">
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {apt.client?.name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888888]">
                    {apt.service_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888888]">
                    {new Date(apt.scheduled_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={apt.status}
                      disabled={updatingId === apt.id}
                      onChange={(e) =>
                        handleStatusChange(apt.id, e.target.value as AppointmentStatus)
                      }
                      className={`text-xs font-medium border rounded-full px-2.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#e8502a] cursor-pointer bg-transparent ${
                        statusStyles[apt.status]
                      }`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-[#1a1a1a] text-white">
                          {statusLabels[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setDeleteTarget(apt)}
                      className="p-1.5 text-[#555555] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-semibold text-white mb-3">
              Delete Appointment
            </h2>
            <p className="text-sm text-[#888888] mb-6">
              Delete{" "}
              <strong className="text-white">{deleteTarget.client?.name ?? "this"}&apos;s</strong>{" "}
              appointment for{" "}
              <strong className="text-white">{deleteTarget.service_name}</strong>? This cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-sm border border-[#2a2a2a] text-[#888888] rounded-lg hover:bg-[#222222] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
