// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { onAuthStateChanged } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import { auth, db } from "@/lib/firebase";
// import Link from "next/link";

// export default function DashboardLayout({ children }) {
//   const router = useRouter();

//   useEffect(() => {
//     return onAuthStateChanged(auth, async (user) => {
//       if (!user) return router.push("/college");

//       const snap = await getDoc(doc(db, "users", user.uid));
//       if (!snap.exists() || snap.data().role !== "collegeAdmin") {
//         router.push("/college");
//       }
//     });
//   }, [router]);

//   return (
//     <div className="flex min-h-screen">
//       <aside className="w-64 bg-gray-900 text-white p-4 space-y-3">
//         <Link href="/college/dashboard">Dashboard</Link>
//         <Link href="/college/dashboard/students">Students</Link>
//         <Link href="/college/dashboard/leaderboard">Leaderboard</Link>
//         <Link href="/college/dashboard/subjects">Subjects</Link>
//         <Link href="/college/dashboard/attempts-accuracy">Attempts</Link>
//         <Link href="/college/dashboard/tests">Tests</Link>
//         <Link href="/college/dashboard/reports">Reports</Link>
//         <Link href="/college/dashboard/manage/tests">Manage</Link>
//         <Link href="/college/dashboard/insights">Insights</Link>
//       </aside>

//       <main className="flex-1 bg-gray-100 p-6">{children}</main>
//     </div>
//   );
// }




"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { dashboardNav } from "./_config/nav";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [collegeLogoUrl, setCollegeLogoUrl] = useState(null);
  const [collegeName, setCollegeName] = useState(null);

  // Never render dashboard until login is verified; redirect to /college if not logged in
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/college");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        
        if (!snap.exists()) {
          router.replace("/college");
          return;
        }

        const data = snap.data();
        const { role, permissions = {} } = data;

        // Allow both collegeAdmin and collegeuser roles
        if (role !== "collegeAdmin" && role !== "collegeuser") {
          router.replace("/college");
          return;
        }

        setUserData(data);
        
        // If user doesn't have dashboard permission, redirect to first accessible page
        const isAdmin = role === "collegeAdmin";
        if (!isAdmin && !permissions.dashboard && pathname === "/college/dashboard") {
          // Find first page user has access to
          const accessiblePage = dashboardNav.find((item) => {
            if (!item.permission) return false;
            
            // For manage section, check if user has any manage-* permission
            if (item.permission.startsWith("manage-")) {
              return Object.keys(permissions).some(key => 
                key.startsWith("manage-") && permissions[key] === true
              );
            }
            
            return permissions[item.permission] === true;
          });
          
          if (accessiblePage) {
            router.replace(accessiblePage.href);
            return;
          } else {
            // If no accessible page found, redirect to not-authorized
            router.replace("/not-authorized");
            return;
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        router.replace("/college");
      }
    });
  }, [router, pathname]);

  // Resolve college logo + name for sidebar (admin = own doc; collegeuser = admin's doc)
  useEffect(() => {
    if (!userData) {
      setCollegeLogoUrl(null);
      setCollegeName(null);
      return;
    }
    if (userData.role === "collegeAdmin") {
      setCollegeLogoUrl(userData.logoUrl || null);
      setCollegeName(userData.collegeName || userData.collegeShort || null);
      return;
    }
    if (userData.role === "collegeuser" && userData.collegeAdminUid) {
      let cancelled = false;
      getDoc(doc(db, "users", userData.collegeAdminUid)).then((snap) => {
        if (cancelled) return;
        const data = snap.exists() ? snap.data() : {};
        setCollegeLogoUrl(data.logoUrl || null);
        setCollegeName(data.collegeName || data.collegeShort || null);
      });
      return () => { cancelled = true; };
    }
    setCollegeLogoUrl(null);
    setCollegeName(null);
  }, [userData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-gray-600">Checking login...</div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const { role, permissions = {}, name } = userData;
  const isAdmin = role === "collegeAdmin";

  // Filter navigation items based on permissions
  const filteredNav = dashboardNav.filter((item) => {
    // Admins have access to everything
    if (isAdmin) return true;
    
    // Check if the nav item has a permission requirement
    if (item.permission) {
      // For manage section, check if user has any manage-* permission
      if (item.permission.startsWith("manage-")) {
        return Object.keys(permissions).some(key => 
          key.startsWith("manage-") && permissions[key] === true
        );
      }
      return permissions[item.permission] === true;
    }
    
    // If no permission specified, allow access (for backward compatibility)
    return true;
  });

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-200 p-4">
        {/* College logo only (no RankSprint when college logo is set) */}
        <div className="mb-6 flex flex-col items-center">
          {collegeLogoUrl ? (
            <div
              className="flex items-center justify-center rounded-full w-16 h-16 overflow-hidden border-2 border-gray-600 shadow-lg bg-white shrink-0"
              title={collegeName || "College"}
            >
              {collegeLogoUrl.includes("cloudinary.com") ? (
                <Image
                  src={collegeLogoUrl}
                  alt={collegeName || "College logo"}
                  width={64}
                  height={64}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <img
                  src={collegeLogoUrl}
                  alt={collegeName || "College logo"}
                  className="h-full w-full object-contain p-1"
                />
              )}
            </div>
          ) : (
            <Link
              href="/"
              className="flex items-center justify-center rounded-full w-14 h-14 border-2 border-gray-700 bg-amber-50 overflow-hidden shrink-0"
              title="RankSprint"
            >
              <Image
                src="/Ranksprint.png"
                alt="RankSprint"
                width={56}
                height={56}
                className="h-8 w-8 object-contain scale-110"
                priority
              />
            </Link>
          )}
          {collegeName && (
            <p className="text-xs text-gray-400 mt-2 text-center truncate w-full" title={collegeName}>
              {collegeName}
            </p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">
            {isAdmin ? "College Admin" : "College User"}
          </h2>
          {name && (
            <p className="text-sm text-gray-400 mt-1">{name}</p>
          )}
        </div>

        <nav className="space-y-1">
          {filteredNav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");

            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
                  active
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Page content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
