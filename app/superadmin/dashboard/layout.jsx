"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";

export default function SuperAdminDashboardLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/superadmin");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          router.replace("/superadmin");
          return;
        }

        const data = snap.data();
        if (data.role !== "rsadmin") {
          router.replace("/superadmin");
          return;
        }

        setUserData(data);
      } catch (error) {
        console.error("Error fetching user:", error);
        router.replace("/superadmin");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      sessionStorage.removeItem("superAdmin");
      router.replace("/superadmin");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-gray-200 p-4">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">Super Admin</h2>
          {userData.name && (
            <p className="text-sm text-gray-400 mt-1">{userData.name}</p>
          )}
        </div>

        <nav className="space-y-1">
          <Link
            href="/superadmin/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-800 hover:text-white transition"
          >
            Dashboard
          </Link>
          <Link
            href="/superadmin/dashboard/tests"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-800 hover:text-white transition"
          >
            Tests
          </Link>
        </nav>

        <div className="mt-8 pt-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-left rounded-md hover:bg-gray-800 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
