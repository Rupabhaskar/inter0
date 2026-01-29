"use client";

import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CollegeAdminRoute({ children }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (role !== "collegeAdmin") {
      router.push("/not-authorized"); // or dashboard
    }
  }, [user, role, loading, router]);

  if (loading) return null;

  return user && role === "collegeAdmin" ? children : null;
}
