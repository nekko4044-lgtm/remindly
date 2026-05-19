import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Plus } from "lucide-react";
import type { AppointmentStatus } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000 - 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    { count: totalClients },
    { count: todayCount },
    { count: confirmedWeek },
    { count: noshowMonth },
    { data: todayAppointments },
  ] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("scheduled_at", today.toISOString())
      .lt("scheduled_at", tomorrow.toISOString()),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .gte("scheduled_at", weekStart.toISOString())
      .lte("scheduled_at", weekEnd.toISOString()),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "no_show")
      .gte("scheduled_at", monthStart.toISOString()),
    supabase
      .from("appointments")
      .select("*, client:clients(name)")
      .eq("user_id", user.id)
      .gte("scheduled_at", today.toISOString())
      .lt("scheduled_at", tomorrow.toISOString())
      .order("scheduled_at"),
  ]);

  const stats = [
    { label: "Total Clients", value: totalClients ?? 0 },
    { label: "Today's Appointments", value: todayCount ?? 0 },
    { label: "Confirmed This Week", value: confirmedWeek ?? 0 },
    { label: "No-shows This Month", value: noshowMonth ?? 0 },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <Link
          href="/appointments/new"
          className="inline-flex items-center gap-2 bg-[#e8502a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d44424] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Appointment
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5"
          >
            <p className="text-xs text-[#888888] mb-1">{label}</p>
            <p className="text-3xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Today's appointments */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Today&apos;s Appointments
          </h2>
          <Link
            href="/appointments"
            className="text-xs text-[#888888] hover:text-white transition-colors"
          >
            View all →
          </Link>
        </div>

        {todayAppointments && todayAppointments.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[#151515]">
              <tr>
                {["Client", "Service", "Time", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-[#555555] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {todayAppointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-[#1f1f1f]">
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {(apt.client as { name: string } | null)?.name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888888]">
                    {apt.service_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888888]">
                    {new Date(apt.scheduled_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={apt.status as AppointmentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-[#888888]">No appointments today.</p>
            <Link
              href="/appointments/new"
              className="mt-2 inline-block text-sm font-medium text-[#e8502a] hover:underline"
            >
              Schedule one →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

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

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        statusStyles[status] ?? statusStyles.scheduled
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
