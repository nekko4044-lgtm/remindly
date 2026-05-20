"use client";

import { useState } from "react";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardTopbar from "./dashboard-topbar";

interface Props {
  email: string;
  businessName: string;
  children: React.ReactNode;
}

export default function DashboardShell({ email, businessName, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#111111]">
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <DashboardSidebar
        email={email}
        businessName={businessName}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto flex flex-col w-full min-w-0">
        <DashboardTopbar onMenuClick={() => setSidebarOpen(true)} />
        {children}
      </main>
    </div>
  );
}
