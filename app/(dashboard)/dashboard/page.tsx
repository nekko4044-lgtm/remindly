import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
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

  // Current week: Monday-based
  const weekStart = new Date(today);
  const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon
  weekStart.setDate(today.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000 - 1);

  const prevWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000);
  const prevWeekEnd = new Date(weekStart.getTime() - 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthEnd = new Date(monthStart.getTime() - 1);

  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86_400_000);

  // Six weeks ago for chart
  const sixWeeksAgo = new Date(weekStart.getTime() - 5 * 7 * 86_400_000);

  const [
    { data: profile },
    { count: totalClients },
    { count: newClientsMonth },
    { count: confirmedWeek },
    { count: totalWeek },
    { count: scheduledWeek },
    { count: cancelledWeek },
    { count: confirmedPrevWeek },
    { count: noshowMonth },
    { count: totalMonth },
    { count: noshowPrevMonth },
    { count: totalPrevMonth },
    { data: todayAppointments },
    { data: chartApts },
  ] = await Promise.all([
    supabase.from("users").select("business_name").eq("id", user.id).single(),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", thirtyDaysAgo.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "confirmed").gte("scheduled_at", weekStart.toISOString()).lte("scheduled_at", weekEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("scheduled_at", weekStart.toISOString()).lte("scheduled_at", weekEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "scheduled").gte("scheduled_at", weekStart.toISOString()).lte("scheduled_at", weekEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "cancelled").gte("scheduled_at", weekStart.toISOString()).lte("scheduled_at", weekEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "confirmed").gte("scheduled_at", prevWeekStart.toISOString()).lte("scheduled_at", prevWeekEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "no_show").gte("scheduled_at", monthStart.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("scheduled_at", monthStart.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "no_show").gte("scheduled_at", prevMonthStart.toISOString()).lte("scheduled_at", prevMonthEnd.toISOString()),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("scheduled_at", prevMonthStart.toISOString()).lte("scheduled_at", prevMonthEnd.toISOString()),
    supabase.from("appointments").select("*, client:clients(name)").eq("user_id", user.id).gte("scheduled_at", today.toISOString()).lt("scheduled_at", tomorrow.toISOString()).order("scheduled_at"),
    supabase.from("appointments").select("scheduled_at, status").eq("user_id", user.id).gte("scheduled_at", sixWeeksAgo.toISOString()).lte("scheduled_at", weekEnd.toISOString()),
  ]);

  const businessName = profile?.business_name ?? "there";
  const todayCount = todayAppointments?.length ?? 0;
  const confirmedToday = todayAppointments?.filter((a) => a.status === "confirmed").length ?? 0;
  const scheduledToday = todayAppointments?.filter((a) => a.status === "scheduled").length ?? 0;
  const cancelledToday = todayAppointments?.filter((a) => a.status === "cancelled").length ?? 0;

  const noshowRate = totalMonth && totalMonth > 0 ? ((noshowMonth ?? 0) / totalMonth * 100) : 0;
  const noshowRatePrev = totalPrevMonth && totalPrevMonth > 0 ? ((noshowPrevMonth ?? 0) / totalPrevMonth * 100) : 0;
  const noshowDelta = noshowRate - noshowRatePrev;

  const confirmedWeekDelta = (confirmedWeek ?? 0) - (confirmedPrevWeek ?? 0);

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Build 6-week chart data
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(weekStart.getTime() - (5 - i) * 7 * 86_400_000);
    const end = new Date(start.getTime() + 7 * 86_400_000 - 1);
    const label = i === 5 ? "THIS" : `W-${5 - i}`;
    const weekApts = chartApts?.filter((a) => {
      const d = new Date(a.scheduled_at);
      return d >= start && d <= end;
    }) ?? [];
    return { label, total: weekApts.length, noshow: weekApts.filter((a) => a.status === "no_show").length };
  });
  const maxTotal = Math.max(...weeks.map((w) => w.total), 1);

  return (
    <div className="p-4 sm:p-8 max-w-[1400px]">
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
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          label="Total Clients"
          value={totalClients ?? 0}
          delta={newClientsMonth ? { value: `+${newClientsMonth}`, dir: "up" } : undefined}
          footer="in the last 30 days"
        />
        <StatCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          label="Today's Appointments"
          value={todayCount}
          footer={`${confirmedToday} confirmed · ${scheduledToday} scheduled · ${cancelledToday} cancelled`}
        />
        <StatCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>}
          label="Confirmed This Week"
          value={confirmedWeek ?? 0}
          unit={totalWeek ? `/ ${totalWeek}` : undefined}
          delta={confirmedWeekDelta !== 0 ? { value: confirmedWeekDelta > 0 ? `+${confirmedWeekDelta}` : `${confirmedWeekDelta}`, dir: confirmedWeekDelta > 0 ? "up" : "down" } : undefined}
          footer="vs last week"
        />
        <StatCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
          label="No-show Rate"
          value={noshowRate.toFixed(1)}
          unit="%"
          delta={noshowDelta !== 0 ? { value: noshowDelta > 0 ? `+${noshowDelta.toFixed(1)}%` : `${noshowDelta.toFixed(1)}%`, dir: noshowDelta < 0 ? "up" : "down-bad" } : undefined}
          footer="vs last month"
        />
      </div>

      {/* Chart + This week at a glance */}
      <div className="grid gap-4 mb-6 grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
        {/* Bar chart */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] overflow-hidden">
          <div className="px-5 py-[18px] flex items-center justify-between gap-4 border-b border-[#2a2a2a]">
            <div>
              <h2 className="text-[15px] font-semibold text-white tracking-tight">No-show rate</h2>
              <div className="text-[12.5px] text-[#6b6b6b] mt-0.5">Last 6 weeks</div>
            </div>
          </div>
          <div className="px-5 py-3 flex items-center gap-4 text-[12px] text-[#a3a3a3]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#353535] inline-block" />
              Total appointments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-[#e8502a] inline-block" />
              No-shows
            </span>
          </div>
          <div className="px-5 pb-5 h-[220px] flex items-end gap-[18px]">
            {weeks.map(({ label, total, noshow }) => {
              const barH = total > 0 ? Math.max((total / maxTotal) * 160, 4) : 4;
              const noshowH = total > 0 ? (noshow / total) * barH : 0;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full max-w-14 relative rounded-[4px] overflow-hidden" style={{ height: `${barH}px` }}>
                    <div className="absolute inset-0 bg-[#2f2f2f] group-hover:bg-[#383838] transition-colors" />
                    {noshowH > 0 && (
                      <div className="absolute top-0 left-0 right-0 bg-[#e8502a] group-hover:bg-[#ff6a3d] transition-colors" style={{ height: `${noshowH}px` }} />
                    )}
                  </div>
                  <span className="font-mono text-[10.5px] text-[#6b6b6b] tracking-[0.04em]">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* This week at a glance */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] overflow-hidden">
          <div className="px-5 py-[18px] border-b border-[#2a2a2a]">
            <h2 className="text-[15px] font-semibold text-white tracking-tight">This week at a glance</h2>
            <div className="text-[12.5px] text-[#6b6b6b] mt-0.5">
              {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
          <div className="px-5 pb-5">
            <GlanceRow
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px]"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
              label="Booked"
              value={totalWeek ?? 0}
            />
            <GlanceRow
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px]"><polyline points="20 6 9 17 4 12"/></svg>}
              label="Confirmed"
              value={confirmedWeek ?? 0}
            />
            <GlanceRow
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
              label="Pending reply"
              value={scheduledWeek ?? 0}
            />
            <GlanceRow
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[13px] h-[13px]"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
              label="Cancelled"
              value={cancelledWeek ?? 0}
            />
          </div>
        </div>
      </div>

      {/* Today's appointments table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] overflow-hidden">
        <div className="px-5 py-[18px] border-b border-[#2a2a2a] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white tracking-tight">Today&apos;s appointments</h2>
            <div className="text-[12.5px] text-[#6b6b6b] mt-0.5">{todayCount} scheduled</div>
          </div>
          <Link href="/appointments" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13.5px] font-medium text-[#a3a3a3] border border-[#2a2a2a] hover:bg-[#222222] hover:text-white hover:border-[#353535] transition-all">
            View all
          </Link>
        </div>

        {todayAppointments && todayAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  {["Client", "Service", "Time", "Status", ""].map((h) => (
                    <th key={h} className={`px-5 py-3.5 font-mono text-[11.5px] font-medium text-[#6b6b6b] uppercase tracking-[0.06em] bg-[#0d0d0d] border-y border-[#2a2a2a] ${h === "" ? "text-right" : "text-left"}`}>
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
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0" style={{ background: avatarColor(clientName) }}>
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
                          <Link href={`/appointments/${apt.id}`} className="w-7 h-7 rounded-md inline-flex items-center justify-center text-[#6b6b6b] hover:bg-[#2a2a2a] hover:text-white transition-colors">
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
            <Link href="/appointments/new" className="mt-2 inline-block text-sm font-medium text-[#e8502a] hover:underline">Schedule one →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, unit, delta, footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  delta?: { value: string; dir: "up" | "down" | "down-bad" };
  footer?: string;
}) {
  const deltaColors = {
    up: "text-[#22c55e] bg-[rgba(34,197,94,0.14)]",
    down: "text-[#22c55e] bg-[rgba(34,197,94,0.14)]",
    "down-bad": "text-[#ef4444] bg-[rgba(239,68,68,0.14)]",
  };
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] p-[18px_20px]">
      <div className="flex items-center gap-2 text-[12.5px] text-[#a3a3a3] mb-3.5">
        <span className="w-[26px] h-[26px] rounded-[7px] bg-[#1f1f1f] border border-[#2a2a2a] inline-flex items-center justify-center text-[#a3a3a3]">
          {icon}
        </span>
        {label}
      </div>
      <div className="text-[30px] font-semibold tracking-tight leading-none mb-2 flex items-baseline gap-1 text-white">
        {value}
        {unit && <span className="text-[18px] text-[#a3a3a3] font-medium">{unit}</span>}
      </div>
      <div className="flex items-center gap-1.5 text-[12px] text-[#6b6b6b] flex-wrap">
        {delta && (
          <span className={`inline-flex items-center gap-0.5 font-mono text-[11.5px] px-1.5 py-0.5 rounded font-medium ${deltaColors[delta.dir]}`}>
            {delta.dir === "down-bad" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="6 9 12 15 18 9"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="18 15 12 9 6 15"/></svg>
            )}
            {delta.value}
          </span>
        )}
        {footer}
      </div>
    </div>
  );
}

function GlanceRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-t border-[#2a2a2a] first:border-t-0 first:pt-5">
      <span className="flex items-center gap-2.5 text-[13px] text-[#a3a3a3]">
        <span className="w-[26px] h-[26px] rounded-[7px] bg-[#0d0d0d] border border-[#2a2a2a] inline-flex items-center justify-center text-[#a3a3a3]">
          {icon}
        </span>
        {label}
      </span>
      <span className="font-mono text-[14px] font-medium text-white">{value}</span>
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${statusStyles[status] ?? statusStyles.scheduled}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {statusLabels[status] ?? status}
    </span>
  );
}
