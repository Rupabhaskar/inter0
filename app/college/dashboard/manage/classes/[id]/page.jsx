"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Search, UserPlus, UserMinus } from "lucide-react";

export default function ManageClassPage() {
  const { id: classId } = useParams();

  const [collegeCode, setCollegeCode] = useState(null);
  const [rollNumber, setRollNumber] = useState("");
  const [results, setResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState(null);

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
            setCollegeCode(adminSnap.exists() ? (adminSnap.data().collegeShort ?? null) : null);
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

  // Get studentId from students/{collegeCode}/ids – only search within this college's students
  const searchStudent = async () => {
    if (!rollNumber.trim()) return;
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) {
      alert("College code not found. Cannot search students.");
      return;
    }
    setLoading(true);
    const idsRef = collection(db, "students", code, "ids");
    const q = query(idsRef, where("rollNumber", "==", rollNumber.trim()));
    const snap = await getDocs(q);
    setResults(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setSelectedStudent(null);
    setLoading(false);
  };

  // Add student to class – studentId is the doc id from students/{collegeCode}/ids
  const addToClass = async () => {
    if (!selectedStudent) return;
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) {
      alert("College code not found. Cannot add to class.");
      return;
    }

    await addDoc(collection(db, "classMembers"), {
      classId,
      studentId: selectedStudent.id,
      collegeCode: code,
        rollNumber: selectedStudent.rollNumber,
      name: selectedStudent.name,
    });

    fetchMembers();
    setResults([]);
    setRollNumber("");
    setSelectedStudent(null);
  };

  // 📋 Fetch members
  const fetchMembers = async () => {
    const q = query(
      collection(db, "classMembers"),
      where("classId", "==", classId)
    );
    const snap = await getDocs(q);
    setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  // ➖ Remove student from class
  const removeFromClass = async (member) => {
    if (!member?.id) return;
    if (!confirm(`Remove ${member.name || member.rollNumber} from this class?`)) return;
    setRemovingId(member.id);
    try {
      await deleteDoc(doc(db, "classMembers", member.id));
      await fetchMembers();
    } catch (err) {
      console.error(err);
      alert("Failed to remove student");
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [classId]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Manage Class</h1>
        <p className="text-gray-500 mt-1">
          Search students and add them to this class
        </p>
      </div>

      {!collegeCode && (
        <p className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          College code not found. Students are loaded from your college only.
        </p>
      )}

      {/* Search Card – students from students/{collegeCode}/ids */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <label className="text-sm font-medium text-gray-600">
          Search by Roll Number 
        </label>

        <div className="flex gap-3">
          <input
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="Enter roll number"
            className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={searchStudent}
            disabled={loading || !collegeCode}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Search size={18} />
            Search
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-sm text-gray-500">Searching…</p>
        )}

        {/* No results */}
        {!loading && results.length === 0 && rollNumber && (
          <p className="text-sm text-gray-500">
            No student found with this roll number
          </p>
        )}
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
          <h3 className="font-semibold">Search Result</h3>

          {results.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedStudent(s)}
              className={`p-3 rounded-lg border cursor-pointer transition
                ${
                  selectedStudent?.id === s.id
                    ? "border-blue-500 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
            >
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-500">
                Roll No: {s.rollNumber}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={addToClass}
          disabled={!selectedStudent || !collegeCode}
          className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <UserPlus size={18} />
          Add to Class
        </button>
      </div>

      {/* Members */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-3">Class Members</h2>

        {members.length === 0 ? (
          <p className="text-sm text-gray-500">
            No students added yet
          </p>
        ) : (
          <ul className="divide-y">
            {members.map((m) => (
              <li key={m.id} className="py-2 flex justify-between items-center gap-2">
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-gray-500 ml-2">({m.rollNumber})</span>
                </div>
                <button
                  onClick={() => removeFromClass(m)}
                  disabled={removingId === m.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove from class"
                >
                  <UserMinus size={16} />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
