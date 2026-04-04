"use client";

import { motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import type { Profile } from "@/types";
import type { ReactNode } from "react";

export function DashboardShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile: Profile | null;
}) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
