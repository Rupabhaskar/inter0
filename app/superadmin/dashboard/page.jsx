"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, secondaryAuth } from "@/lib/firebase";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [collegeAdmins, setCollegeAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [email, setEmail] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");

  const fetchCollegeAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "collegeAdmin")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setCollegeAdmins(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load college admins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollegeAdmins();
  }, []);

  const openForm = () => {
    setShowForm(true);
    setFormError("");
    setCollegeName("");
    setEmail("");
    setDefaultPassword("");
    setContactNumber("");
    setAddress("");
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError("");
  };

  const handleCreateCollegeAdmin = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const trimEmail = email.trim();
      const trimPassword = defaultPassword.trim();

      if (!trimEmail || !trimPassword) {
        setFormError("Email and default password are required.");
        setFormLoading(false);
        return;
      }

      // Check if email already exists in Firestore
      const emailQuery = query(
        collection(db, "users"),
        where("email", "==", trimEmail)
      );
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        setFormError("This email is already registered.");
        setFormLoading(false);
        return;
      }

      // Create Firebase Auth user (secondary auth so superadmin stays logged in)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        trimEmail,
        trimPassword
      );
      const uid = userCredential.user.uid;

      // Save to Firestore with role collegeAdmin and all details
      await setDoc(doc(db, "users", uid), {
        email: trimEmail,
        role: "collegeAdmin",
        collegeName: (collegeName || "").trim() || null,
        initialPassword: trimPassword,
        contactNumber: (contactNumber || "").trim() || null,
        address: (address || "").trim() || null,
        createdAt: serverTimestamp(),
      });

      closeForm();
      fetchCollegeAdmins();
    } catch (err) {
      console.error(err);
      if (
        err.code === "auth/email-already-in-use" ||
        err.message?.includes("email-already-in-use")
      ) {
        setFormError("This email is already in use. Use a different email.");
      } else {
        setFormError(err.message || "Failed to create college admin.");
      }
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to the super admin panel.</p>
        </div>
        <button
          type="button"
          onClick={openForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Create College Admin
        </button>
      </div>

      {/* User count at top */}
      <div className="bg-white p-5 rounded-xl shadow">
        <p className="text-sm text-gray-500">College Admin users</p>
        <p className="text-3xl font-bold mt-1">
          {loading ? "—" : collegeAdmins.length}
        </p>
      </div>

      {/* College Admin table – all details */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-bold text-lg mb-4">
          College Admins (role: collegeAdmin)
        </h2>
        {error && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : collegeAdmins.length === 0 ? (
          <p className="text-gray-500">No college admin users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">College</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Default Password</th>
                  <th className="p-3 font-medium">Contact Number</th>
                  <th className="p-3 font-medium">Address / Location</th>
                </tr>
              </thead>
              <tbody>
                {collegeAdmins.map((user, index) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/superadmin/dashboard/college/${user.id}`)}
                    className="border-b last:border-0 cursor-pointer hover:bg-gray-50 transition"
                  >
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3 font-medium text-blue-600">
                      {user.collegeName || user.name || user.email || "—"}
                    </td>
                    <td className="p-3">{user.email || "—"}</td>
                    <td className="p-3">
                      {user.initialPassword ?? user.password ?? "—"}
                    </td>
                    <td className="p-3">{user.contactNumber || "—"}</td>
                    <td className="p-3 max-w-xs truncate" title={user.address}>
                      {user.address || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create College Admin modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Create College Admin</h2>
              <button
                type="button"
                onClick={closeForm}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCreateCollegeAdmin} className="p-4 space-y-4">
              {formError && (
                <p className="text-red-600 text-sm">{formError}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Name *
                </label>
                <input
                  type="text"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. ABC College of Engineering"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@college.com"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Password *
                </label>
                <input
                  type="text"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  placeholder="e.g. College@123"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address / Location
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="College address or location"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                />
              </div>

              <p className="text-xs text-gray-500">
                Role will be saved as <strong>collegeAdmin</strong>.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
