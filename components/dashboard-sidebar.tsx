"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";

const WORKSPACE = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/appointments/new", label: "Appointments", icon: Calendar },
];

const ACCOUNT = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

interface Props {
  email: string;
  businessName: string;
}

export default function DashboardSidebar({ email, businessName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-all ${
          active
            ? "bg-[#1a1a1a] text-white shadow-[inset_0_0_0_1px_#2a2a2a]"
            : "text-[#a3a3a3] hover:bg-[#222222] hover:text-white"
        }`}
      >
        <Icon
          className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-[#e8502a]" : "text-[#6b6b6b]"}`}
        />
        {label}
      </Link>
    );
  }

  return (
    <aside className="w-60 bg-[#0d0d0d] border-r border-[#2a2a2a] flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-[22px] py-[22px] border-b border-[#2a2a2a]">
        <div className="w-[30px] h-[30px] rounded-lg bg-[#e8502a] flex items-center justify-center text-white font-bold text-[15px] tracking-tight shadow-[0_4px_14px_-4px_rgba(232,80,42,0.5)] shrink-0">
          N
        </div>
        <div>
          <div className="text-[16px] font-semibold tracking-tight text-white leading-none">
            NoShow
          </div>
          <div className="text-[11px] text-[#6b6b6b] mt-0.5 tracking-wide truncate max-w-[140px]">
            {businessName}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3.5 flex flex-col gap-0.5">
        <div className="font-mono text-[10.5px] tracking-widest uppercase text-[#6b6b6b] px-2.5 pt-1 pb-2">
          Workspace
        </div>
        {WORKSPACE.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <div className="font-mono text-[10.5px] tracking-widest uppercase text-[#6b6b6b] px-2.5 pt-5 pb-2">
          Account
        </div>
        {ACCOUNT.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3.5 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-default">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white text-[12.5px] font-semibold shrink-0">
            {initials(businessName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white truncate">{businessName}</div>
            <div className="text-[11.5px] text-[#6b6b6b] truncate">{email}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1 text-[#6b6b6b] hover:text-white transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
