"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";

const PAGE_NAMES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "Clients",
  "/appointments/new": "New Appointment",
  "/settings": "Settings",
  "/billing": "Billing",
};

interface Props {
  onMenuClick?: () => void;
}

export default function DashboardTopbar({ onMenuClick }: Props) {
  const pathname = usePathname();
  const pageName = Object.entries(PAGE_NAMES).find(([k]) => pathname === k || pathname.startsWith(k + "/"))?.[1] ?? "Dashboard";

  return (
    <header
      className="h-[60px] border-b border-[#2a2a2a] flex items-center justify-between px-4 md:px-8 sticky top-0 z-10"
      style={{ background: "color-mix(in srgb, #111111 88%, transparent)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden w-[34px] h-[34px] rounded-lg inline-flex items-center justify-center text-[#a3a3a3] border border-transparent hover:bg-[#222222] hover:text-white hover:border-[#2a2a2a] transition-all"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13.5px] text-[#a3a3a3]">
          <span className="hidden sm:inline">NoShow</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-[#4a4a4a] hidden sm:block">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-white font-medium">{pageName}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button className="w-[34px] h-[34px] rounded-lg inline-flex items-center justify-center text-[#a3a3a3] border border-transparent hover:bg-[#222222] hover:text-white hover:border-[#2a2a2a] transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>
        <button className="w-[34px] h-[34px] rounded-lg inline-flex items-center justify-center text-[#a3a3a3] border border-transparent hover:bg-[#222222] hover:text-white hover:border-[#2a2a2a] transition-all relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <Link
          href="/appointments/new"
          className="hidden sm:inline-flex items-center gap-1.5 bg-[#e8502a] text-white h-9 px-3.5 rounded-lg text-[13.5px] font-medium hover:bg-[#ff6a3d] transition-colors shadow-[0_6px_16px_-6px_rgba(232,80,42,0.5)] ml-1"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Appointment
        </Link>
        {/* Mobile: icon-only new button */}
        <Link
          href="/appointments/new"
          className="sm:hidden w-[34px] h-[34px] rounded-lg inline-flex items-center justify-center bg-[#e8502a] text-white hover:bg-[#ff6a3d] transition-colors ml-1"
          aria-label="New appointment"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </Link>
      </div>
    </header>
  );
}
