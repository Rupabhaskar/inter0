"use client";

import { useEffect } from "react";

/**
 * In development, Next.js (Turbopack) can log: "Original file ... outside project"
 * when the project path contains spaces or parentheses (e.g. "New folder (2)").
 * This is a known dev-only bug; the app works fine. We suppress that one message
 * so college admins don't see a scary console error.
 * Best long-term fix: move the project to a path without spaces (e.g. E:\\inter0).
 */
export default function SuppressNextPathConsoleError() {
  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return;
    const original = console.error;
    console.error = function (...args) {
      const msg = args[0]?.message ?? (typeof args[0] === "string" ? args[0] : "");
      if (typeof msg === "string" && (msg.includes("outside project") || msg.includes("project_trace_source_operation"))) {
        return;
      }
      return original.apply(console, args);
    };
    return () => {
      console.error = original;
    };
  }, []);
  return null;
}
