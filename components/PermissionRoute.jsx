"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

/**
 * PermissionRoute - Controls access to pages based on user permissions
 * @param {string} requiredPermission - The permission key required to access this page
 * @param {string[]} allowedRoles - Roles that have full access (bypass permission check)
 * @param {ReactNode} children - The page content to render
 */
export default function PermissionRoute({ 
  children, 
  requiredPermission, 
  allowedRoles = ["collegeAdmin"] 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/college");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
          router.replace("/not-authorized");
          return;
        }

        const userData = userDoc.data();
        const { role, permissions = {} } = userData;

        // Check if user has a valid role
        if (role !== "collegeAdmin" && role !== "collegeuser") {
          router.replace("/not-authorized");
          return;
        }

        // Admins have full access
        if (allowedRoles.includes(role)) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check permission for regular users
        if (requiredPermission && permissions[requiredPermission] === true) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
          router.replace("/not-authorized");
        }

        setLoading(false);
      } catch (error) {
        console.error("Permission check error:", error);
        router.replace("/not-authorized");
      }
    });
  }, [router, requiredPermission, allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return hasAccess ? children : null;
}
