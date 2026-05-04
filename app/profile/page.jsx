
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  collectionGroup,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  updatePassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

export default function ProfilePage() {
  const router = useRouter();

  const [student, setStudent] = useState(null);
  const [studentRef, setStudentRef] = useState(null); // Firestore ref for students/{collegeCode}/ids/{uid}
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [message, setMessage] = useState("");

  /* ================= LOAD USER ================= */
  /* Schema: students in students/{collegeCode}/ids/{uid}; college admins in users/{uid} */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStudent(null);
        setStudentRef(null);
        setLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const role = userSnap.exists() ? userSnap.data().role : null;
        if (role === "collegeAdmin" || role === "collegeuser") {
          setStudent({ role });
          setStudentRef(null);
          setLoading(false);
          return;
        }

        let found = false;

        try {
          const q = query(
            collectionGroup(db, "ids"),
            where("uid", "==", user.uid),
            limit(1)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docSnap = snap.docs[0];
            setStudent(docSnap.data());
            setStudentRef(docSnap.ref);
            found = true;
          }
        } catch (_) {
          // Collection group may need an index; fall back to per-college lookup
        }

        if (!found) {
          const collegesSnap = await getDocs(
            query(collection(db, "users"), where("role", "==", "collegeAdmin"))
          );
          const collegeCodes = new Set(["_"]);
          collegesSnap.docs.forEach((d) => {
            const code = d.data().collegeShort;
            if (code) collegeCodes.add(String(code).trim());
          });
          for (const code of collegeCodes) {
            const studentDocRef = doc(db, "students", code, "ids", user.uid);
            const studentSnap = await getDoc(studentDocRef);
            if (studentSnap.exists()) {
              setStudent(studentSnap.data());
              setStudentRef(studentDocRef);
              found = true;
              break;
            }
          }
        }

        if (!found) {
          setStudent(null);
          setStudentRef(null);
        }
      } catch (err) {
        console.error("Profile load error:", err);
        setStudent(null);
        setStudentRef(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  /* ================= UPDATE PROFILE ================= */
  const updateProfile = async () => {
    if (!studentRef) {
      setMessage("Cannot update: profile ref not loaded");
      return;
    }
    setSaving(true);
    setMessage("");

    try {
      await updateDoc(studentRef, {
        name: student.name,
        phone: student.phone,
        course: student.course,
      });
      setMessage("Profile updated successfully");
    } catch {
      setMessage("Failed to update profile");
    }

    setSaving(false);
  };

  /* ================= PASSWORD CHANGE ================= */
  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    if (!studentRef) {
      setMessage("Cannot update password: profile ref not loaded");
      return;
    }

    setPasswordLoading(true);
    setMessage("");

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        user.email,
        oldPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await updateDoc(studentRef, {
        defaultPassword: false,
      });

      setMessage("Password updated successfully");
      setShowPasswordForm(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("Old password is incorrect");
    }

    setPasswordLoading(false);
  };

  /* ================= GUARDS ================= */
  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-20 text-center text-gray-400 animate-pulse">
          Loading...
        </div>
      </ProtectedRoute>
    );
  }

  if (!student) {
    return (
      <ProtectedRoute>
        <div className="p-20 text-center text-red-500">
          User record not found
        </div>
      </ProtectedRoute>
    );
  }

  /* ================= COLLEGE ADMIN / COLLEGE USER ================= */
  if (student.role === "collegeAdmin" || student.role === "collegeuser") {
    const title = student.role === "collegeAdmin"
      ? "College Administration"
      : "College User";
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-12 rounded-xl shadow-xl text-center">
            <h1 className="text-2xl font-bold mb-6">
              {title}
            </h1>

            <button
              onClick={() => router.push("/college/dashboard")}
              className="bg-indigo-600 text-white px-12 py-3 rounded-lg shadow hover:scale-105 transition"
            >
              🏫 Go to College Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  /* ================= STUDENT PROFILE ================= */
  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        {message && (
          <div className="mb-6 rounded-lg bg-indigo-50 text-indigo-700 px-4 py-2">
            {message}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* LEFT CARD */}
          <div className="bg-white border rounded-xl shadow-sm p-6 text-center">
            <div className="h-24 w-24 mx-auto rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold mb-4">
              {student.name?.charAt(0)?.toUpperCase()}
            </div>

            <h2 className="text-xl font-semibold">{student.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{student.course}</p>

            <div className="mt-4 text-sm text-gray-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Roll No</span>
                <span className="font-medium">{student.rollNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{student.email}</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="md:col-span-2 space-y-8">
            <Card title="Profile Information">
              <Field
                label="Full Name"
                value={student.name}
                onChange={(e) =>
                  setStudent({ ...student, name: e.target.value })
                }
              />
              <Field
                label="Phone"
                value={student.phone}
                onChange={(e) =>
                  setStudent({ ...student, phone: e.target.value })
                }
              />

              <button
                onClick={updateProfile}
                disabled={saving}
                className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </Card>

            <Card title="Security">
              {!showPasswordForm ? (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg"
                >
                  Change Password
                </button>
              ) : (
                <div className="space-y-4">
                  <Field
                    label="Old Password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                  <Field
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Field
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                  />

                  <button
                    onClick={handlePasswordChange}
                    disabled={passwordLoading}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg"
                  >
                    {passwordLoading ? "Updating..." : "Save Password"}
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/* ================= UI HELPERS ================= */

function Card({ title, children }) {
  return (
    <div className="bg-white border rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <div>
      <label className="text-sm text-gray-500">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full border rounded px-4 py-2 mt-1 ${
          readOnly
            ? "bg-gray-100 text-gray-600 cursor-not-allowed"
            : "focus:ring focus:ring-indigo-200"
        }`}
      />
    </div>
  );
}
