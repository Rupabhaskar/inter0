"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

function ManagePageContent() {
  const router = useRouter();
  const [userPermissions, setUserPermissions] = useState({});
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/college");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const role = data.role;
          const permissions = data.permissions || {};
          
          setUserRole(role);
          setUserPermissions(permissions);

          // If not admin and has no manage permissions, redirect
          if (role !== "collegeAdmin") {
            const hasManagePermission = Object.keys(permissions).some(key => 
              key.startsWith("manage-") && permissions[key] === true
            );
            
            if (!hasManagePermission) {
              router.replace("/not-authorized");
              return;
            }
          }
        } else {
          router.replace("/college");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        router.replace("/college");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const allCards = [
    {
      title: "Settings",
      description: "Manage question configuration and rules",
      path: "./manage/settings",
      permission: "manage-settings",
    },
    {
      title: "Students",
      description: "View and manage student information",
      path: "./manage/students",
      permission: "manage-students",
    },
    {
      title: "Classes",
      description: "View and manage class information",
      path: "./manage/classes",
      permission: "manage-classes",
    },
    {
      title: "Our Test",
      description: "Unlock default tests by our",
      path: "./manage/tests",
      permission: "manage-questions", // Assuming this maps to questions/tests
    },
  ];

  // Filter cards based on permissions
  const filteredCards = allCards.filter((card) => {
    // Admins see all cards
    if (userRole === "collegeAdmin") return true;
    
    // Check if user has permission for this card
    return userPermissions[card.permission] === true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (filteredCards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Manage Dashboard
        </h1>
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <p className="text-gray-600">No manage sections available for your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Manage Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCards.map((card, index) => (
          <div
            key={index}
            onClick={() => router.push(card.path)}
            className="cursor-pointer bg-white rounded-xl shadow-md p-6
                       hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {card.title}
            </h2>
            <p className="text-gray-600">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ManagePage() {
  return <ManagePageContent />;
}
