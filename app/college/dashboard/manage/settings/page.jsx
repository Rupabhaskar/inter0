"use client";

import { useState, useEffect, useCallback } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, updateDoc, getDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
import { db, auth, secondaryAuth } from "@/lib/firebase";
import PermissionRoute from "@/components/PermissionRoute";

function CreateUserPageContent() {
  const [currentUserUid, setCurrentUserUid] = useState(null);
  const [collegeScopeUid, setCollegeScopeUid] = useState(null); // uid of college admin (scope for listing/creating)
  const [collegeCode, setCollegeCode] = useState(null); // college short code (unique per college)
  const [isCollegeAdmin, setIsCollegeAdmin] = useState(false);
  const [maxCollegeUsers, setMaxCollegeUsers] = useState(null); // null = no limit
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("collegeuser");
  // All available pages with their display names
  const allPages = {
    dashboard: "Dashboard",
    leaderboard: "Leaderboard",
    tests: "Tests",
    reports: "Reports",
    insights: "Insights",
    "attempts-accuracy": "Attempts & Accuracy",
    "college-analytics": "College Analytics",
    "manage-students": "Manage Students",
    "manage-classes": "Manage Classes",
    "manage-questions": "Manage Questions",
    "manage-settings": "Manage Settings",
  };

  const [permissions, setPermissions] = useState({
    dashboard: false,
    leaderboard: false,
    tests: false,
    reports: false,
    insights: false,
    "attempts-accuracy": false,
    "college-analytics": false,
    "manage-students": false,
    "manage-classes": false,
    "manage-questions": false,
    "manage-settings": false,
  });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("collegeuser");
  const [editPermissions, setEditPermissions] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const DEFAULT_PASSWORD = "user@123";

  // Fetch college admin's limit and current user
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setCurrentUserUid(user?.uid || null);
      if (!user?.uid) {
        setCollegeScopeUid(null);
        setCollegeCode(null);
        setMaxCollegeUsers(null);
        setIsCollegeAdmin(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const isAdmin = data.role === "collegeAdmin";
          setIsCollegeAdmin(isAdmin);
          if (isAdmin) {
            setCollegeScopeUid(user.uid);
            setCollegeCode(data.collegeShort ?? null);
            setMaxCollegeUsers(data.maxCollegeUsers ?? null);
          } else {
            setCollegeScopeUid(data.collegeAdminUid || null);
            if (data.collegeAdminUid) {
              const adminSnap = await getDoc(doc(db, "users", data.collegeAdminUid));
              const adminData = adminSnap.exists() ? adminSnap.data() : {};
              setCollegeCode(adminData.collegeShort ?? null);
              setMaxCollegeUsers(adminData.maxCollegeUsers ?? null);
            } else {
              setCollegeCode(null);
              setMaxCollegeUsers(null);
            }
          }
        } else {
          setIsCollegeAdmin(false);
          setCollegeScopeUid(null);
          setCollegeCode(null);
          setMaxCollegeUsers(null);
        }
      } catch {
        setIsCollegeAdmin(false);
        setCollegeScopeUid(null);
        setCollegeCode(null);
        setMaxCollegeUsers(null);
      }
    });
  }, []);

  // Fetch users scoped by college: prefer collegeCode (unique), fallback to collegeAdminUid
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      if (!collegeScopeUid && !collegeCode) {
        const snap = await getDocs(collection(db, "users"));
        const usersData = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role === "collegeuser");
        usersData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setUsers(usersData);
        return;
      }
      // If we have college code, fetch users with that code; else use collegeAdminUid
      if (collegeCode) {
        const qByCode = query(
          collection(db, "users"),
          where("role", "==", "collegeuser"),
          where("collegeCode", "==", collegeCode)
        );
        const snapCode = await getDocs(qByCode);
        let usersData = snapCode.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Also include users with collegeAdminUid but no collegeCode (legacy)
        if (collegeScopeUid) {
          const qByAdmin = query(
            collection(db, "users"),
            where("role", "==", "collegeuser"),
            where("collegeAdminUid", "==", collegeScopeUid)
          );
          const snapAdmin = await getDocs(qByAdmin);
          const byAdmin = snapAdmin.docs.map((d) => ({ id: d.id, ...d.data() }));
          const seen = new Set(usersData.map((u) => u.id));
          byAdmin.forEach((u) => {
            if (!seen.has(u.id)) {
              usersData.push(u);
              seen.add(u.id);
            }
          });
        }
        usersData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setUsers(usersData);
        return;
      }
      const q = query(
        collection(db, "users"),
        where("role", "==", "collegeuser"),
        where("collegeAdminUid", "==", collegeScopeUid)
      );
      const snap = await getDocs(q);
      const usersData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      usersData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, [collegeScopeUid, collegeCode]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePermissionChange = (key) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleEditPermissionChange = (key) => {
    setEditPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Open edit modal
  const handleEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditRole(user.role || "collegeuser");
    // Initialize all permissions, preserving existing ones
    const defaultPerms = {
      dashboard: false,
      leaderboard: false,
      tests: false,
      reports: false,
      insights: false,
      "attempts-accuracy": false,
      "college-analytics": false,
      "manage-students": false,
      "manage-classes": false,
      "manage-questions": false,
      "manage-settings": false,
    };
    // Merge existing permissions with defaults, ensuring all keys exist
    const existingPerms = user.permissions || {};
    const mergedPerms = { ...defaultPerms };
    Object.keys(defaultPerms).forEach((key) => {
      mergedPerms[key] = existingPerms[key] === true;
    });
    setEditPermissions(mergedPerms);
  };

  // Close edit modal
  const handleCloseEdit = () => {
    setEditingUser(null);
    setEditName("");
    setEditEmail("");
    setEditRole("collegeuser");
    setEditPermissions({});
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setEditLoading(true);
    try {
      // Prepare permissions object - only include true values for users
      let finalPermissions = {};
      if (editRole === "collegeuser") {
        // Only save permissions that are true
        Object.keys(editPermissions).forEach((key) => {
          if (editPermissions[key] === true) {
            finalPermissions[key] = true;
          }
        });
      }

      await updateDoc(doc(db, "users", editingUser.id), {
        name: editName,
        email: editEmail,
        role: editRole,
        permissions: finalPermissions,
        updatedAt: serverTimestamp(),
      });

      alert("User updated successfully!");
      handleCloseEdit();
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      alert(error.message || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Enforce maxCollegeUsers limit (set by super admin on college)
      if (collegeScopeUid != null && maxCollegeUsers != null) {
        const limitQuery = query(
          collection(db, "users"),
          where("role", "==", "collegeuser"),
          where("collegeAdminUid", "==", collegeScopeUid)
        );
        const limitSnap = await getDocs(limitQuery);
        if (limitSnap.size >= maxCollegeUsers) {
          alert(
            `College user limit reached. Your college is allowed ${maxCollegeUsers} college user(s). Contact super admin to increase the limit.`
          );
          setLoading(false);
          return;
        }
      }

      // Check if email already exists in Firestore
      const emailQuery = query(collection(db, "users"), where("email", "==", email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        alert("This email address is already registered. Please use a different email.");
        setLoading(false);
        return;
      }

      // ✅ Create user WITHOUT affecting admin session
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        DEFAULT_PASSWORD
      );

      const uid = userCredential.user.uid;

      // Store user data in Firestore (link to this college when admin is logged in)
      const userData = {
        name,
        email,
        role,
        permissions,
        forcePasswordReset: true,
        createdAt: serverTimestamp(),
      };
      if (collegeScopeUid) {
        userData.collegeAdminUid = collegeScopeUid;
      }
      if (collegeCode != null && String(collegeCode).trim() !== "") {
        userData.collegeCode = String(collegeCode).trim();
      }
      await setDoc(doc(db, "users", uid), userData);

      // ✅ Clear form only (stay on page)
      setName("");
      setEmail("");
      setRole("collegeuser");
      setPermissions({
        dashboard: false,
        leaderboard: false,
        tests: false,
        reports: false,
        insights: false,
        "attempts-accuracy": false,
        "college-analytics": false,
        "manage-students": false,
        "manage-classes": false,
        "manage-questions": false,
        "manage-settings": false,
      });

      alert("User created successfully!");
      // Refresh users list
      fetchUsers();
      // Close form after successful creation
      setShowCreateForm(false);
    } catch (error) {
      console.error(error);
      
      // Handle Firebase Auth duplicate email error
      if (error.code === "auth/email-already-in-use" || error.message?.includes("email-already-in-use")) {
        alert("This email address is already registered in Firebase Auth. Please use a different email.");
      } else {
        alert(error.message || "Failed to create user");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPermissions = (perms) => {
    if (!perms) return "None";
    const active = Object.entries(perms)
      .filter(([_, value]) => value === true)
      .map(([key]) => allPages[key] || key);
    return active.length > 0 ? active.join(", ") : "None";
  };

  // Delete user
  const handleDelete = async (user) => {
    if (!confirm(`Are you sure you want to delete user "${user.name || user.email}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingUser(user.id);
    setDeleteLoading(true);

    try {
      // Call API to delete user from Auth (requires Admin SDK)
      const response = await fetch("/college/api/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.id }), // user.id is the uid (document ID)
      });

      const data = await response.json();

      // If Admin SDK fails, try to delete Firestore document from client side
      if (!response.ok && data.code === "ADMIN_CONFIG_ERROR") {
        // Delete Firestore document using client SDK
        try {
          await deleteDoc(doc(db, "users", user.id));
          
          // Check if Auth was already deleted
          if (data.authDeleted) {
            alert("User deleted successfully! (Auth was deleted via Admin SDK, Firestore deleted via client SDK)");
          } else {
            alert("User deleted from Firestore. Firebase Auth user deletion requires Admin SDK. Please check your FIREBASE_PRIVATE_KEY format in .env.local file.");
          }
        } catch (firestoreError) {
          console.error("Firestore deletion error:", firestoreError);
          // Check if it's a permissions error
          if (firestoreError.code === "permission-denied") {
            throw new Error("Permission denied. Please check Firestore security rules allow user deletion.");
          }
          throw new Error("Failed to delete user from Firestore: " + (firestoreError.message || "Unknown error"));
        }
      } else if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      } else {
        // Check if Auth was deleted
        if (data.authDeleted === false) {
          alert("User deleted from Firestore, but Auth deletion failed. User may still be able to login.");
        } else {
          alert("User deleted successfully from both Auth and Firestore!");
        }
      }

      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(error.message || "Failed to delete user");
    } finally {
      setDeleteLoading(false);
      setDeletingUser(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Create Button */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
            {collegeCode && (
              <p className="text-sm text-gray-600 mt-1">
                College code: <span className="font-mono font-semibold">{collegeCode}</span>
              </p>
            )}
            {maxCollegeUsers != null && (
              <p className="text-sm text-gray-500 mt-1">
                College user limit: {users.length} of {maxCollegeUsers} used
              </p>
            )}
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={maxCollegeUsers != null && users.length >= maxCollegeUsers}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{showCreateForm ? "−" : "+"}</span>
            {showCreateForm ? "Close Form" : "Create New User"}
          </button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Create New User
            </h2>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Gmail address"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                readOnly
                className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-600"
                value="College User"
              />
            </div>

            <div>
              <p className="font-semibold mb-3">Page Permissions</p>
              
              {/* Main Pages */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Main Pages</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(allPages)
                    .filter(([key]) => 
                      !key.startsWith("manage-") && 
                      key !== "attempts-accuracy" && 
                      key !== "college-analytics"
                    )
                    .map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={permissions[key] || false}
                          onChange={() => handlePermissionChange(key)}
                          className="cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Analytics Pages */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Analytics</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(allPages)
                    .filter(([key]) => 
                      key === "attempts-accuracy" || key === "college-analytics"
                    )
                    .map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={permissions[key] || false}
                          onChange={() => handlePermissionChange(key)}
                          className="cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Manage Pages */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Manage Section</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(allPages)
                    .filter(([key]) => key.startsWith("manage-"))
                    .map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={permissions[key] || false}
                          onChange={() => handlePermissionChange(key)}
                          className="cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Default password: <b>user@123</b>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {loading ? "Creating..." : "Create User"}
            </button>
          </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">College Users</h2>
            <button
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
            >
              {loadingUsers ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadingUsers ? (
            <div className="text-center py-8 text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">College code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Permissions</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{user.name || "—"}</td>
                      <td className="px-4 py-3 text-sm">{user.email || "—"}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{user.collegeCode || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === "collegeAdmin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {user.role === "collegeAdmin" ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.role === "collegeAdmin" ? (
                          <span className="text-green-600 font-medium">Full Access</span>
                        ) : (
                          formatPermissions(user.permissions)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.createdAt
                          ? new Date(user.createdAt.toDate?.() || user.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={deleteLoading && deletingUser === user.id}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteLoading && deletingUser === user.id ? "Deleting..." : "Delete"}
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
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Edit User</h2>
              <button
                onClick={handleCloseEdit}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  readOnly
                  className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-600"
                  value="College User"
                />
              </div>

              <div>
                <p className="font-semibold mb-3">Page Permissions</p>
                {editRole === "collegeAdmin" ? (
                  <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                    Admins have full access to all pages. No permission selection needed.
                  </p>
                ) : (
                  <>
                  
                  {/* Main Pages */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Main Pages</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(allPages)
                        .filter(([key]) => 
                          !key.startsWith("manage-") && 
                          key !== "attempts-accuracy" && 
                          key !== "college-analytics"
                        )
                        .map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={editPermissions[key] || false}
                              onChange={() => handleEditPermissionChange(key)}
                              className="cursor-pointer"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Analytics Pages */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Analytics</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(allPages)
                        .filter(([key]) => 
                          key === "attempts-accuracy" || key === "college-analytics"
                        )
                        .map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={editPermissions[key] || false}
                              onChange={() => handleEditPermissionChange(key)}
                              className="cursor-pointer"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Manage Pages */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Manage Section</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(allPages)
                        .filter(([key]) => key.startsWith("manage-"))
                        .map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={editPermissions[key] || false}
                              onChange={() => handleEditPermissionChange(key)}
                              className="cursor-pointer"
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {editLoading ? "Updating..." : "Update User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateUserPage() {
  return (
    <PermissionRoute requiredPermission="settings">
      <CreateUserPageContent />
    </PermissionRoute>
  );
}
