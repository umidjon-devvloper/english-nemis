"use client";

import { usePathname } from "next/navigation";
import {
  Menu,
  Bell,
  ChevronRight,
} from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/lessons": "My Lessons",
  "/dashboard/vocabulary": "Vocabulary",
  "/dashboard/practice": "AI Practice",
  "/dashboard/planner": "Study Planner",
  "/dashboard/analytics": "Analytics",
  "/dashboard/settings": "Settings",
};

interface DashboardHeaderProps {
  onOpenSidebar: () => void;
}

export function DashboardHeader({
  onOpenSidebar,
}: DashboardHeaderProps) {
  const pathname = usePathname();

  const matchedPath = Object.keys(pageTitles)
    .filter(
      (path) =>
        pathname === path ||
        (path !== "/dashboard" &&
          pathname.startsWith(`${path}/`)),
    )
    .sort((a, b) => b.length - a.length)[0];

  const title = pageTitles[matchedPath] || "Dashboard";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-rule bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          className="flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-surface-3 lg:hidden"
        >
          <Menu size={19} />
        </button>

        <div className="flex items-center gap-2 text-[13px]">
          <span className="hidden text-muted sm:inline">
            Workspace
          </span>

          <ChevronRight
            size={14}
            className="hidden text-[#d4d4d4] sm:inline"
          />

          <span className="font-medium text-ink">
            {title}
          </span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className="relative flex size-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3"
      >
        <Bell size={17} />
      </button>
    </header>
  );
}