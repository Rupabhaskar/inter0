"use client";

import { useEffect, useState, useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import StudentUpload from "@/components/students/StudentUpload";
import StudentFilters from "@/components/students/StudentFilters";
import StudentTable from "@/components/students/StudentTable";
import AdmissionForm from "@/components/AdmissionForm";
import PermissionRoute from "@/components/PermissionRoute";

function StudentsPageContent() {
  const [collegeScopeUid, setCollegeScopeUid] = useState(null);
  const [collegeShort, setCollegeShort] = useState(null);
  const [maxStudents, setMaxStudents] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [filters, setFilters] = useState({
    roll: "",
    course: "",
    sortBy: "",
    sortOrder: "asc",
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        setCollegeScopeUid(null);
        setCollegeShort(null);
        setMaxStudents(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.role === "collegeAdmin") {
            setCollegeScopeUid(user.uid);
            setCollegeShort(data.collegeShort ?? null);
            setMaxStudents(data.maxStudents ?? null);
          } else {
            setCollegeScopeUid(data.collegeAdminUid || null);
            if (data.collegeAdminUid) {
              const adminSnap = await getDoc(doc(db, "users", data.collegeAdminUid));
              const adminData = adminSnap.exists() ? adminSnap.data() : {};
              setCollegeShort(adminData.collegeShort ?? null);
              setMaxStudents(adminData.maxStudents ?? null);
            } else {
              setCollegeShort(null);
              setMaxStudents(null);
            }
          }
        } else {
          setCollegeScopeUid(null);
          setCollegeShort(null);
          setMaxStudents(null);
        }
      } catch {
        setCollegeScopeUid(null);
        setCollegeShort(null);
        setMaxStudents(null);
      }
    });
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      // Schema: students/{collegeCode}/ids/{uid}
      const code = (collegeShort != null && String(collegeShort).trim() !== "")
        ? String(collegeShort).trim()
        : "_";
      if (collegeScopeUid == null) {
        setAllStudents([]);
        setFilteredStudents([]);
        setLoading(false);
        return;
      }
      const idsRef = collection(db, "students", code, "ids");
      const snap = await getDocs(idsRef);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        rollNumber: String(d.data().rollNumber || ""),
      }));
      setAllStudents(data);
      setFilteredStudents(data);
    } catch (err) {
      console.error(err);
      setAllStudents([]);
      setFilteredStudents([]);
    } finally {
      setLoading(false);
    }
  }, [collegeScopeUid, collegeShort]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    let result = [...allStudents];

    if (filters.roll) {
      result = result.filter((s) =>
        s.rollNumber.includes(filters.roll)
      );
    }

    if (filters.course) {
      result = result.filter(
        (s) =>
          String(s.course || "").toLowerCase() ===
          filters.course.toLowerCase()
      );
    }

    if (filters.sortBy) {
      result.sort((a, b) => {
        const A =
          filters.sortBy === "name"
            ? String(a.name || "").toLowerCase()
            : String(a.rollNumber || "").toLowerCase();

        const B =
          filters.sortBy === "name"
            ? String(b.name || "").toLowerCase()
            : String(b.rollNumber || "").toLowerCase();

        if (A < B) return filters.sortOrder === "asc" ? -1 : 1;
        if (A > B) return filters.sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredStudents(result);
  }, [filters, allStudents]);

  const atStudentLimit = maxStudents != null && allStudents.length >= maxStudents;

  return (
    <div className="p-6 min-h-screen bg-white">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold text-black">Students</h1>
          {maxStudents != null && (
            <p className="text-sm text-gray-500 mt-1">
              Student limit: {allStudents.length} of {maxStudents} used
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(true)}
            disabled={atStudentLimit}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Admission
          </button>

          <StudentUpload
            onSuccess={fetchStudents}
            collegeAdminUid={collegeScopeUid}
            collegeCode={collegeShort ?? "_"}
            maxStudents={maxStudents}
            currentStudentCount={allStudents.length}
          />
        </div>
      </div>

      {showForm && (
        <AdmissionForm
          onClose={() => setShowForm(false)}
          onSuccess={fetchStudents}
          collegeAdminUid={collegeScopeUid}
          defaultCollege={collegeShort}
        />
      )}

      <StudentFilters
        students={allStudents}
        filters={filters}
        setFilters={setFilters}
      />

      <StudentTable
        students={filteredStudents}
        loading={loading}
        onRefresh={fetchStudents}
        collegeCode={collegeShort ?? "_"}
      />
    </div>
  );
}

export default function StudentsPage() {
  return (
    <PermissionRoute requiredPermission="manage-students">
      <StudentsPageContent />
    </PermissionRoute>
  );
}
