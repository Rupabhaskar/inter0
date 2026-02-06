"use client";

import { useState } from "react";

const DEFAULT_DISPLAY_PASSWORD = "Sample@123";

export default function StudentTable({ students, loading, onRefresh, collegeCode = "_" }) {
  const [resettingId, setResettingId] = useState(null);

  const deleteStudent = async (s) => {
    if (!confirm("Delete this student?")) return;

    const res = await fetch("/college/api/delete-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: s.uid || s.id, id: s.id, collegeCode }),
    });

    if (res.ok) onRefresh();
    else alert("Delete failed");
  };

  const resetPassword = async (s) => {
    if (!confirm(`Reset password for ${s.name || s.rollNumber} to default (${DEFAULT_DISPLAY_PASSWORD})?`)) return;
    const uid = s.uid || s.id;
    setResettingId(uid);
    try {
      const res = await fetch("/college/api/reset-student-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, id: s.id, collegeCode }),
      });
      if (res.ok) onRefresh();
      else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Reset failed");
      }
    } catch (e) {
      alert("Reset failed");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-3 text-black">Roll</th>
            <th className="p-3 text-black">Name</th>
            <th className="p-3 text-black">College</th>
            <th className="p-3 text-black">Email</th>
            <th className="p-3 text-black">Course</th>
            <th className="p-3 text-black">Password</th>
            <th className="p-3 text-black">Action</th>
          </tr>
        </thead>

        <tbody className="text-black">
          {loading ? (
            <tr>
              <td colSpan="7" className="p-6 text-center">
                Loading...
              </td>
            </tr>
          ) : students.length === 0 ? (
            <tr>
              <td colSpan="7" className="p-6 text-center">
                No students found
              </td>
            </tr>
          ) : (
            students.map((s) => {
              const uid = s.uid || s.id;
              const isResetting = resettingId === uid;
              const showDefaultPassword = s.defaultPassword === true;
              return (
                <tr key={s.id} className="border-b border-gray-200">
                  <td className="p-3">{s.rollNumber}</td>
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.college ?? "—"}</td>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">{s.course}</td>
                  <td className="p-3 font-mono text-sm">
                    {showDefaultPassword ? DEFAULT_DISPLAY_PASSWORD : "••••••••"}
                  </td>
                  <td className="p-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => resetPassword(s)}
                      disabled={isResetting}
                      className="bg-amber-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                    >
                      {isResetting ? "Resetting…" : "Reset password"}
                    </button>
                    <button
                      onClick={() => deleteStudent(s)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
