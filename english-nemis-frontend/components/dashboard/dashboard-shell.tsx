"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardHeader } from "./dashboard-header";

import type { AuthUser } from "../../app/lib/auth/session";

interface DashboardShellProps {
  user: AuthUser;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden w-[248px] shrink-0 lg:block">
        <DashboardSidebar user={user} />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-white shadow-xl">
            <DashboardSidebar
              user={user}
              onNavigate={() => setSidebarOpen(false)}
            />

            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-surface-3"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}