"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import PermissionRoute from "@/components/PermissionRoute";

// Schema: classes (collection) → collegeCode (doc) → items (subcollection) → classId (doc) with { name, ... }

function ClassesPageContent() {
  const [collegeCode, setCollegeCode] = useState(null);
  const [className, setClassName] = useState("");
  const [classes, setClasses] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /* Resolve college code (collegeAdmin → collegeShort; collegeuser → admin's collegeShort) */
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        setCollegeCode(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.role === "collegeAdmin") {
            setCollegeCode(data.collegeShort ?? null);
          } else if (data.collegeAdminUid) {
            const adminSnap = await getDoc(doc(db, "users", data.collegeAdminUid));
            const adminData = adminSnap.exists() ? adminSnap.data() : {};
            setCollegeCode(adminData.collegeShort ?? null);
          } else {
            setCollegeCode(null);
          }
        } else {
          setCollegeCode(null);
        }
      } catch {
        setCollegeCode(null);
      }
    });
  }, []);

  const fetchClasses = useCallback(async () => {
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) {
      setClasses([]);
      return;
    }
    const snap = await getDocs(collection(db, "classes", code, "items"));
    setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, [collegeCode]);

  useEffect(() => {
    queueMicrotask(() => fetchClasses());
  }, [fetchClasses]);

  const createClass = async () => {
    if (!className.trim()) return;
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) return;

    setLoading(true);
    await addDoc(collection(db, "classes", code, "items"), {
      name: className.trim(),
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    setClassName("");
    setLoading(false);
    fetchClasses();
  };

  const startEdit = (cls) => {
    setEditingId(cls.id);
    setEditingName(cls.name);
  };

  const saveEdit = async (id) => {
    if (!editingName.trim()) return;
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) return;

    await updateDoc(doc(db, "classes", code, "items", id), {
      name: editingName.trim(),
    });
    setEditingId(null);
    fetchClasses();
  };

  const confirmDelete = async () => {
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) return;

    await deleteDoc(doc(db, "classes", code, "items", deletingId));
    setDeletingId(null);
    fetchClasses();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Classes</h1>
        <p className="text-gray-500 mt-1">
          Create and manage classrooms
        </p>
      </div>

      {!collegeCode && (
        <p className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          College code not found. Only college admins or users linked to a college can manage classes.
        </p>
      )}

      {/* Create Class */}
      {collegeCode && (
      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3">
        <input
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder="Enter class name"
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          onClick={createClass}
          disabled={loading}
          className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 disabled:opacity-50"
        >
          <Plus size={18} />
          Create
        </button>
      </div>
      )}

      {/* Empty State */}
      {collegeCode && classes.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          No classes created yet
        </div>
      )}

      {/* Class List */}
      {collegeCode && (
      <div className="grid gap-3">
        {classes.map((cls) => (
          <div
            key={cls.id}
            onClick={() =>
              editingId !== cls.id &&
              router.push(`/college/dashboard/manage/classes/${cls.id}`)
            }
            className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center cursor-pointer hover:shadow-md transition"
          >
            {/* Name / Edit */}
            {editingId === cls.id ? (
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="border rounded-lg px-2 py-1 w-full mr-4"
              />
            ) : (
              <div>
                <h3 className="font-semibold text-lg">{cls.name}</h3>
                <p className="text-sm text-gray-500">
                  Click to manage students
                </p>
              </div>
            )}

            {/* Actions */} 
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {editingId === cls.id ? (
                <>
                  <button
                    onClick={() => saveEdit(cls.id)}
                    className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                  >
                    <X size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(cls)}
                    className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => setDeletingId(cls.id)}
                    className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Delete Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold">Delete Class?</h2>
            <p className="text-gray-500 mt-2">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-lg bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClassesPage() {
  return (
    <PermissionRoute requiredPermission="manage-classes">
      <ClassesPageContent />
    </PermissionRoute>
  );
}
