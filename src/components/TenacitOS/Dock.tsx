"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";
import {
  Home,
  Monitor,
  FolderOpen,
  Brain,
  Bot,
  Building2,
  Activity,
  Clock,
  Puzzle,
  DollarSign,
  Settings,
  History,
  SquareKanban,
} from "lucide-react";

// mc-v20260308-hard-reset
const dockItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/system", label: "System Monitor", icon: Monitor },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/office", label: "Office", icon: Building2 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: SquareKanban },
  { href: "/cron", label: "Cron Jobs", icon: Clock },
  { href: "/sessions", label: "Sessions", icon: History },
  { href: "/skills", label: "Skills", icon: Puzzle },
  { href: "/costs", label: "Costs & Analytics", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Dock() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <aside
      className="dock"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: "68px",
        backgroundColor: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 6px",
        gap: "4px",
        zIndex: 50,
      }}
    >
      {dockItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className="dock-item group relative"
            style={{
              width: "56px",
              height: "56px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              borderRadius: "8px",
              backgroundColor: isActive ? "var(--accent-soft)" : "transparent",
              transition: "all 150ms ease",
              position: "relative",
              textDecoration: "none",
            }}
          >
            <Icon
              className={isActive ? "icon-active" : "icon-inactive"}
              style={{
                width: "22px",
                height: "22px",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                strokeWidth: isActive ? 2.5 : 2,
              }}
            />

            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "9px",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "52px",
              }}
            >
              {t(item.label).split(" ")[0]}
            </span>

            <span
              className="absolute left-[72px] top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-sm whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{
                backgroundColor: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {t(item.label)}
            </span>
          </Link>
        );
      })}
    </aside>
  );
}
