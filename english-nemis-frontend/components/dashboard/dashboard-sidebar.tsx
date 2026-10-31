"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import {
  LayoutDashboard,
  BookOpen,
  Languages,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  Settings2,
  LogOut,
  ChevronUp,
  GraduationCap,
  Loader2,
  ServerCog,
} from "lucide-react";

import type { AuthUser } from "../../app/lib/auth/session";

const navigation = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Lessons",
    href: "/dashboard/lessons",
    icon: BookOpen,
  },
  {
    title: "Vocabulary",
    href: "/dashboard/vocabulary",
    icon: Languages,
  },
  {
    title: "AI Practice",
    href: "/dashboard/practice",
    icon: BrainCircuit,
  },
  {
    title: "Study Planner",
    href: "/dashboard/planner",
    icon: CalendarDays,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: ChartNoAxesCombined,
  },
];

interface DashboardSidebarProps {
  user: AuthUser;
  onNavigate?: () => void;
}

export function DashboardSidebar({
  user,
  onNavigate,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const initials = user.displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Could not sign out. Try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-rule bg-surface-2">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-rule px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-ink text-white">
          <GraduationCap size={18} strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold tracking-[-0.025em] text-ink">
            LinguaCoach AI
          </h1>

          <p className="text-[11px] text-ink-3">
            Learning Workspace
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Workspace
        </p>

        <nav className="space-y-0.5">
          {navigation.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-9 items-center gap-3 rounded-md px-3 text-[13px] transition-colors",
                  active
                    ? "bg-rule font-medium text-ink"
                    : "text-ink-3 hover:bg-rule-soft hover:text-ink",
                ].join(" ")}
              >
                <Icon
                  size={17}
                  strokeWidth={1.8}
                  className={active ? "text-ink" : ""}
                />

                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="my-5 border-t border-rule" />

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Preferences
        </p>

        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          aria-current={
            pathname.startsWith("/dashboard/settings")
              ? "page"
              : undefined
          }
          className={[
            "flex h-9 items-center gap-3 rounded-md px-3 text-[13px] transition-colors",
            pathname.startsWith("/dashboard/settings")
              ? "bg-rule font-medium text-ink"
              : "text-ink-3 hover:bg-rule-soft hover:text-ink",
          ].join(" ")}
        >
          <Settings2 size={17} strokeWidth={1.8} />
          Settings
        </Link>

        {user.role === "admin" && (
          <>
            <div className="my-5 border-t border-rule" />

            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              Admin
            </p>

            <Link
              href="/dashboard/admin/ai"
              onClick={onNavigate}
              aria-current={
                pathname.startsWith("/dashboard/admin/ai")
                  ? "page"
                  : undefined
              }
              className={[
                "flex h-9 items-center gap-3 rounded-md px-3 text-[13px] transition-colors",
                pathname.startsWith("/dashboard/admin/ai")
                  ? "bg-rule font-medium text-ink"
                  : "text-ink-3 hover:bg-rule-soft hover:text-ink",
              ].join(" ")}
            >
              <ServerCog size={17} strokeWidth={1.8} />
              AI Config
            </Link>
          </>
        )}
      </div>

      {/* User Profile */}
      <div className="relative shrink-0 border-t border-rule p-3">
        {showAccountMenu && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 rounded-lg border border-rule bg-white p-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
            <div className="border-b border-rule-soft px-3 py-2">
              <p className="truncate text-[12px] font-medium text-ink">
                {user.displayName}
              </p>

              <p className="truncate text-[11px] text-ink-3">
                {user.email}
              </p>
            </div>

            <Link
              href="/dashboard/settings"
              onClick={() => {
                setShowAccountMenu(false);
                onNavigate?.();
              }}
              className="flex h-9 items-center gap-2 rounded-md px-3 text-[12px] text-ink-2 hover:bg-surface-2"
            >
              <Settings2 size={15} />
              Account settings
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LogOut size={15} />
              )}

              Sign out
            </button>

            {logoutError && (
              <p role="alert" className="px-3 py-2 text-xs text-red-600">
                {logoutError}
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAccountMenu(!showAccountMenu)}
          aria-expanded={showAccountMenu}
          aria-label="Account menu"
          className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-[#efefef]"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[12px] font-semibold text-ink">
            {initials || "U"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-ink">
              {user.displayName}
            </p>

            <p className="truncate text-[11px] text-ink-3">
              {user.email}
            </p>
          </div>

          <ChevronUp
            size={15}
            className={[
              "shrink-0 text-muted transition-transform",
              showAccountMenu ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
      </div>
    </aside>
  );
}