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
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
