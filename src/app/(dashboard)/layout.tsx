"use client";

import dynamic from "next/dynamic";
import { TopBar, StatusBar } from "@/components/TenacitOS";

const Dock = dynamic(
  () => import("@/components/TenacitOS/Dock").then((mod) => ({ default: mod.Dock })),
  { ssr: false }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tenacios-shell" style={{ minHeight: "100vh" }}>
      <Dock />
      <TopBar />

      <main
        style={{
          marginLeft: "68px", // Width of dock
          marginTop: "48px", // Height of top bar
          marginBottom: "32px", // Height of status bar
          minHeight: "calc(100vh - 48px - 32px)",
          padding: "24px",
          overflowX: "hidden" as const,
        }}
      >
        {children}
      </main>

      <StatusBar />
    </div>
  );
}
