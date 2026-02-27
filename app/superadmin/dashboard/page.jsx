"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
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
  const [deletingId, setDeletingId] = useState(null);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [collegeShort, setCollegeShort] = useState("");
  const [email, setEmail] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [collegeStudentDefaultPassword, setCollegeStudentDefaultPassword] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  // Edit form state
  const [editingCollege, setEditingCollege] = useState(null);
  const [editCollegeName, setEditCollegeName] = useState("");
  const [editCollegeShort, setEditCollegeShort] = useState("");
  const [editContactNumber, setEditContactNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCollegeStudentDefaultPassword, setEditCollegeStudentDefaultPassword] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoFile, setEditLogoFile] = useState(null);
  const [editLogoPreview, setEditLogoPreview] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

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
    setCollegeShort("");
    setEmail("");
    setDefaultPassword("");
    setContactNumber("");
    setAddress("");
    setCollegeStudentDefaultPassword("");
    setLogoFile(null);
    setLogoPreview("");
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError("");
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  };

  const openEdit = (user) => {
    setEditingCollege(user);
    setEditCollegeName(user.collegeName || "");
    setEditCollegeShort(user.collegeShort || "");
    setEditContactNumber(user.contactNumber || "");
    setEditAddress(user.address || "");
    setEditCollegeStudentDefaultPassword(user.collegeStudentDefaultPassword || "");
    setEditLogoUrl(user.logoUrl || "");
    setEditLogoFile(null);
    setEditLogoPreview("");
    setEditError("");
  };

  const closeEdit = () => {
    setEditingCollege(null);
    setEditError("");
    if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
  };

  const onLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (!file) {
      setLogoFile(null);
      setLogoPreview("");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const onEditLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
    if (!file) {
      setEditLogoFile(null);
      setEditLogoPreview("");
      return;
    }
    setEditLogoFile(file);
    setEditLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogoToCloudinary = async (file, collegeId = "") => {
    const form = new FormData();
    form.append("file", file);
    if (collegeId) form.append("collegeId", collegeId);
    const res = await fetch("/superadmin/api/upload-college-logo", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Logo upload failed.");
    return data.url;
  };

  const handleUpdateCollege = async (e) => {
    e.preventDefault();
    if (!editingCollege?.id) return;
    setEditError("");
    setEditLoading(true);
    try {
      let logoUrl = editLogoUrl;
      if (editLogoFile) {
        logoUrl = await uploadLogoToCloudinary(editLogoFile, editingCollege.id);
      }
      const studentPw = (editCollegeStudentDefaultPassword || "").trim() || null;
      const payload = {
        collegeName: (editCollegeName || "").trim() || null,
        collegeShort: (editCollegeShort || "").trim() || null,
        contactNumber: (editContactNumber || "").trim() || null,
        address: (editAddress || "").trim() || null,
        collegeStudentDefaultPassword: studentPw,
        updatedAt: serverTimestamp(),
      };
      if (logoUrl !== undefined) payload.logoUrl = logoUrl || null;
      await updateDoc(doc(db, "users", editingCollege.id), payload);
      setCollegeAdmins((prev) =>
        prev.map((c) =>
          c.id === editingCollege.id
            ? {
                ...c,
                collegeName: (editCollegeName || "").trim() || null,
                collegeShort: (editCollegeShort || "").trim() || null,
                contactNumber: (editContactNumber || "").trim() || null,
                address: (editAddress || "").trim() || null,
                collegeStudentDefaultPassword: studentPw,
                logoUrl: logoUrl ?? c.logoUrl,
              }
            : c
        )
      );
      closeEdit();
    } catch (err) {
      console.error(err);
      setEditError(err.message || "Failed to update college.");
    } finally {
      setEditLoading(false);
    }
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

      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogoToCloudinary(logoFile, uid);
      }

      const studentPw = (collegeStudentDefaultPassword || "").trim() || null;

      // Save to Firestore with role collegeAdmin and all details
      await setDoc(doc(db, "users", uid), {
        email: trimEmail,
        role: "collegeAdmin",
        collegeName: (collegeName || "").trim() || null,
        collegeShort: (collegeShort || "").trim() || null,
        initialPassword: trimPassword,
        collegeStudentDefaultPassword: studentPw,
        contactNumber: (contactNumber || "").trim() || null,
        address: (address || "").trim() || null,
        logoUrl: logoUrl,
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

  const handleDeleteCollege = async (e, user) => {
    e.stopPropagation();
    const name = user.collegeName || user.name || user.email || "this college";
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove the college admin account and cannot be undone.`)) {
      return;
    }
    setDeletingId(user.id);
    try {
      const res = await fetch("/superadmin/api/delete-college", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setCollegeAdmins((prev) => prev.filter((c) => c.id !== user.id));
    } catch (err) {
      alert(err.message || "Failed to delete college admin.");
    } finally {
      setDeletingId(null);
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
                  <th className="p-3 font-medium w-16">Logo</th>
                  <th className="p-3 font-medium">College</th>
                  <th className="p-3 font-medium">Short code</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Default Password</th>
                  <th className="p-3 font-medium">Student default password</th>
                  <th className="p-3 font-medium">Contact Number</th>
                  <th className="p-3 font-medium">Address / Location</th>
                  <th className="p-3 font-medium w-24">Action</th>
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
                    <td className="p-3">
                      {user.logoUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={user.logoUrl}
                            alt=""
                            className="w-10 h-10 rounded object-cover border"
                          />
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 font-medium text-blue-600">
                      {user.collegeName || user.name || user.email || "—"}
                    </td>
                    <td className="p-3 font-mono font-medium">
                      {user.collegeShort || "—"}
                    </td>
                    <td className="p-3">{user.email || "—"}</td>
                    <td className="p-3">
                      {user.initialPassword ?? user.password ?? "—"}
                    </td>
                    <td className="p-3 font-mono text-sm">
                      {user.collegeStudentDefaultPassword ?? "—"}
                    </td>
                    <td className="p-3">{user.contactNumber || "—"}</td>
                    <td className="p-3 max-w-xs truncate" title={user.address}>
                      {user.address || "—"}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCollege(e, user)}
                          disabled={deletingId === user.id}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === user.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
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
                  College short code
                </label>
                <input
                  type="text"
                  value={collegeShort}
                  onChange={(e) => setCollegeShort(e.target.value.toUpperCase())}
                  placeholder="e.g. SCRRC (Sir Catamachili Ram Reddy College)"
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Used in admission form and student list. Leave empty to set later in college settings.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Logo
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onLogoFileChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
                />
                {logoPreview && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WebP or GIF. Max 5MB. Stored on Cloudinary.</p>
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
                  College student default password
                </label>
                <input
                  type="text"
                  value={collegeStudentDefaultPassword}
                  onChange={(e) => setCollegeStudentDefaultPassword(e.target.value)}
                  placeholder="e.g. Student@123 (for new students)"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Default password for students created under this college. Optional.</p>
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

      {/* Edit College Admin modal */}
      {editingCollege && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">Edit College</h2>
              <button
                type="button"
                onClick={closeEdit}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleUpdateCollege} className="p-4 space-y-4">
              {editError && (
                <p className="text-red-600 text-sm">{editError}</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Name *
                </label>
                <input
                  type="text"
                  value={editCollegeName}
                  onChange={(e) => setEditCollegeName(e.target.value)}
                  placeholder="e.g. ABC College of Engineering"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College short code
                </label>
                <input
                  type="text"
                  value={editCollegeShort}
                  onChange={(e) => setEditCollegeShort(e.target.value.toUpperCase())}
                  placeholder="e.g. SCRRC"
                  className="w-full px-3 py-2 border rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College Logo
                </label>
                {(editLogoPreview || editLogoUrl) && (
                  <div className="mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editLogoPreview || editLogoUrl}
                      alt="Logo"
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onEditLogoFileChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to keep current logo. Max 5MB.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (read-only)
                </label>
                <input
                  type="email"
                  value={editingCollege.email || ""}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  College student default password
                </label>
                <input
                  type="text"
                  value={editCollegeStudentDefaultPassword}
                  onChange={(e) => setEditCollegeStudentDefaultPassword(e.target.value)}
                  placeholder="e.g. Student@123"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  value={editContactNumber}
                  onChange={(e) => setEditContactNumber(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address / Location
                </label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="College address or location"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {editLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
