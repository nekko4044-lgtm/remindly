import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Plus } from "lucide-react";
import type { AppointmentStatus } from "@/lib/types";

function greeting() {
  const h = new Date().getUTCHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function avatarColor(name: string) {
  const COLORS = ["#7e57c2","#42a5f5","#66bb6a","#ef5350","#ffa726","#26c6da","#ec407a","#8d6e63"];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000 - 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    { data: profile },
    { count: totalClients },
    { count: confirmedWeek },
    { count: totalWeek },
    { count: noshowMonth },
    { count: totalMonth },
    { data: todayAppointments },
  ] = await Promise.all([
    supabase.from("users").select("business_name").eq("id", user.id).single(),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "confirmed").gte("scheduled_at", weekStart.toISOString()).lte("scheduled_at", weekEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("scheduled_at", weekStart.toISOString()).lte("scheduled_at", weekEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "no_show").gte("scheduled_at", monthStart.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("scheduled_at", monthStart.toISOString()),
    supabase.from("appointments").select("*, client:clients(name)").eq("user_id", user.id).gte("scheduled_at", today.toISOString()).lt("scheduled_at", tomorrow.toISOString()).order("scheduled_at"),
  ]);

  const businessName = profile?.business_name ?? "there";
  const todayCount = todayAppointments?.length ?? 0;
  const confirmedToday = todayAppointments?.filter((a) => a.status === "confirmed").length ?? 0;
  const scheduledToday = todayAppointments?.filter((a) => a.status === "scheduled").length ?? 0;
  const cancelledToday = todayAppointments?.filter((a) => a.status === "cancelled").length ?? 0;
  const noshowRate = totalMonth && totalMonth > 0 ? ((noshowMonth ?? 0) / totalMonth * 100).toFixed(1) : "0.0";

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Page header */}
      <div className="flex items-end justify-between gap-6 mb-7 flex-wrap">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-white leading-tight">
            {greeting()}, {businessName}.
          </h1>
          <p className="text-[14px] text-[#a3a3a3] mt-1">
            Here&apos;s what&apos;s happening today, {todayLabel}.
          </p>
        </div>
        <Link
          href="/appointments/new"
          className="inline-flex items-center gap-1.5 bg-[#e8502a] text-white h-9 px-3.5 rounded-lg text-[13.5px] font-medium hover:bg-[#ff6a3d] transition-colors shadow-[0_6px_16px_-6px_rgba(232,80,42,0.5)]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Appointment
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Clients */}
        <StatCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          label="Total Clients"
          value={totalClients ?? 0}
          footer="active clients in your account"
        />
        {/* Today */}
        <StatCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          label="Today's Appointments"
          value={todayCount}
          footer={`${confirmedToday} confirmed · ${scheduledToday} scheduled · ${cancelledToday} cancelled`}
        />
        {/* Confirmed this week */}
        <StatCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>}
          label="Confirmed This Week"
          value={confirmedWeek ?? 0}
          unit={totalWeek ? `/ ${totalWeek}` : undefined}
          footer="out of total booked this week"
        />
        {/* No-show rate */}
        <StatCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
          label="No-show Rate"
          value={noshowRate}
          unit="%"
          footer="this calendar month"
        />
      </div>

      {/* Today's appointments table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] overflow-hidden">
        <div className="px-5 py-[18px] border-b border-[#2a2a2a] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white tracking-tight">Today&apos;s appointments</h2>
            <div className="text-[12.5px] text-[#6b6b6b] mt-0.5">
              {todayCount} scheduled
            </div>
          </div>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13.5px] font-medium text-[#a3a3a3] border border-[#2a2a2a] hover:bg-[#222222] hover:text-white hover:border-[#353535] transition-all"
          >
            View all
          </Link>
        </div>

        {todayAppointments && todayAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {["Client", "Service", "Time", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-left font-mono text-[11.5px] font-medium text-[#6b6b6b] uppercase tracking-[0.06em] bg-[#0d0d0d] border-y border-[#2a2a2a] ${h === "" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayAppointments.map((apt) => {
                  const clientName = (apt.client as { name: string } | null)?.name ?? "—";
                  return (
                    <tr key={apt.id} className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1f1f1f] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
                            style={{ background: avatarColor(clientName) }}
                          >
                            {initials(clientName)}
                          </div>
                          <span className="font-medium text-white">{clientName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#a3a3a3]">{apt.service_name}</td>
                      <td className="px-5 py-3.5 font-mono text-[13px] text-white">
                        {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={apt.status as AppointmentStatus} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex gap-1">
                          <Link
                            href={`/appointments/${apt.id}`}
                            className="w-7 h-7 rounded-md inline-flex items-center justify-center text-[#6b6b6b] hover:bg-[#2a2a2a] hover:text-white transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-14 text-center">
            <p className="text-sm text-[#6b6b6b]">No appointments today.</p>
            <Link href="/appointments/new" className="mt-2 inline-block text-sm font-medium text-[#e8502a] hover:underline">
              Schedule one →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  footer?: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-[18px_20px] relative overflow-hidden">
      <div className="flex items-center gap-2 text-[12.5px] text-[#a3a3a3] mb-3.5">
        <span className="w-[26px] h-[26px] rounded-[7px] bg-[#1f1f1f] border border-[#2a2a2a] inline-flex items-center justify-center text-[#a3a3a3]">
          {icon}
        </span>
        {label}
      </div>
      <div className="text-[30px] font-semibold tracking-tight leading-none mb-2 flex items-baseline gap-1">
        {value}
        {unit && <span className="text-[18px] text-[#a3a3a3] font-medium">{unit}</span>}
      </div>
      {footer && <div className="text-[12px] text-[#6b6b6b]">{footer}</div>}
    </div>
  );
}

const statusStyles: Record<AppointmentStatus, string> = {
  scheduled: "bg-amber-500/15 text-amber-400",
  confirmed: "bg-green-500/15 text-green-400",
  cancelled: "bg-red-500/15 text-red-400",
  no_show: "bg-[#252525] text-[#6b6b6b]",
  completed: "bg-blue-500/15 text-blue-400",
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${
        statusStyles[status] ?? statusStyles.scheduled
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {statusLabels[status] ?? status}
    </span>
  );
}
