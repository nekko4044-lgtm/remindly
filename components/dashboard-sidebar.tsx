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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

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

  return (
    <aside className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-6 h-16 flex items-center border-b border-[#2a2a2a]">
        <span className="font-bold text-white text-lg tracking-tight">
          NoShow
          <span className="inline-block w-1.5 h-1.5 bg-[#e8502a] rounded-full ml-0.5 translate-y-[-3px]" />
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#252525] text-white"
                  : "text-[#888888] hover:bg-[#222222] hover:text-white"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? "text-[#e8502a]" : "text-[#555555]"}`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-[#2a2a2a]">
        <div className="px-3 mb-2">
          <p className="text-xs font-medium text-white truncate">{businessName}</p>
          <p className="text-xs text-[#555555] truncate">{email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[#888888] hover:bg-[#222222] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 text-[#555555] shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
