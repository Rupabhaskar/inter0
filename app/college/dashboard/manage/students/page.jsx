// // "use client";

// // import { useEffect, useState } from "react";
// // import { db } from "@/lib/firebase";
// // import { collection, getDocs } from "firebase/firestore";
// // import AdmissionForm from "@/components/AdmissionForm";

// // export default function StudentsPage() {
// //   const [students, setStudents] = useState([]);
// //   const [showForm, setShowForm] = useState(false);
// //   const [editStudent, setEditStudent] = useState(null);
// //   const [loading, setLoading] = useState(false);

// //   /* ---------------- FETCH STUDENTS ---------------- */
// //   const fetchStudents = async () => {
// //     setLoading(true);
// //     const snap = await getDocs(collection(db, "students"));
// //     setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
// //     setLoading(false);
// //   };

// //   useEffect(() => {
// //     fetchStudents();
// //   }, []);

// //   /* ---------------- RESET PASSWORD ---------------- */
// //   const resetPassword = async (student) => {
// //     if (!confirm("Reset password to Sample@123 ?")) return;

// //     const res = await fetch("/college/api/reset-student-password", {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ uid: student.uid, id: student.id }),
// //     });

// //     if (res.ok) {
// //       alert("Password reset to Sample@123");
// //       fetchStudents();
// //     } else {
// //       alert("Failed to reset password");
// //     }
// //   };

// //   /* ---------------- DELETE STUDENT ---------------- */
// //   const deleteStudent = async (student) => {
// //     if (!confirm("Delete this student?")) return;

// //     const res = await fetch("/college/api/delete-student", {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ uid: student.uid, id: student.id }),
// //     });

// //     if (res.ok) fetchStudents();
// //     else alert("Delete failed");
// //   };

// //   /* ---------------- UPDATE STUDENT ---------------- */
// //   const updateStudent = async () => {
// //     const res = await fetch("/college/api/update-student", {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify(editStudent),
// //     });

// //     if (res.ok) {
// //       setEditStudent(null);
// //       fetchStudents();
// //     } else alert("Update failed");
// //   };

// //   return (
// //     <div className="p-6 min-h-screen bg-gray-100">
// //       {/* HEADER */}
// //       <div className="flex justify-between items-center mb-6">
// //         <h1 className="text-3xl font-bold">Students</h1>
// //         <button
// //           onClick={() => setShowForm(true)}
// //           className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
// //         >
// //           Create Admission
// //         </button>
// //       </div>

// //       {/* CREATE FORM */}
// //       {showForm && (
// //         <AdmissionForm
// //           onClose={() => setShowForm(false)}
// //           onSuccess={fetchStudents}
// //         />
// //       )}

// //       {/* EDIT MODAL */}
// //       {editStudent && (
// //         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
// //           <div className="bg-white p-6 rounded-xl w-full max-w-md">
// //             <h2 className="text-xl font-semibold mb-4">Edit Student</h2>

// //             <input
// //               className="w-full p-3 border rounded mb-3"
// //               placeholder="Name"
// //               value={editStudent.name}
// //               onChange={(e) =>
// //                 setEditStudent({ ...editStudent, name: e.target.value })
// //               }
// //             />

// //             <input
// //               className="w-full p-3 border rounded mb-3"
// //               placeholder="Phone"
// //               value={editStudent.phone}
// //               onChange={(e) =>
// //                 setEditStudent({ ...editStudent, phone: e.target.value })
// //               }
// //             />

// //             <input
// //               className="w-full p-3 border rounded mb-3"
// //               placeholder="Course"
// //               value={editStudent.course}
// //               onChange={(e) =>
// //                 setEditStudent({ ...editStudent, course: e.target.value })
// //               }
// //             />

// //             <div className="flex justify-end gap-3">
// //               <button
// //                 onClick={() => setEditStudent(null)}
// //                 className="px-4 py-2 bg-gray-300 rounded"
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 onClick={updateStudent}
// //                 className="px-4 py-2 bg-blue-600 text-white rounded"
// //               >
// //                 Save
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* TABLE */}
// //       <div className="bg-white rounded-xl shadow overflow-x-auto">
// //         <table className="w-full">
// //           <thead className="bg-gray-200">
// //             <tr>
// //               <th className="p-3 text-left">Name</th>
// //               <th className="p-3 text-left">Email</th>
// //               <th className="p-3 text-left">Course</th>
// //               <th className="p-3 text-left">Password Status</th>
// //               <th className="p-3 text-left">Actions</th>
// //             </tr>
// //           </thead>

// //           <tbody>
// //             {loading ? (
// //               <tr>
// //                 <td colSpan="5" className="p-6 text-center">
// //                   Loading students...
// //                 </td>
// //               </tr>
// //             ) : students.length === 0 ? (
// //               <tr>
// //                 <td colSpan="5" className="p-6 text-center">
// //                   No students found
// //                 </td>
// //               </tr>
// //             ) : (
// //               students.map((s) => (
// //                 <tr key={s.id} className="border-b hover:bg-gray-50">
// //                   <td className="p-3">{s.name}</td>
// //                   <td className="p-3">{s.email}</td>
// //                   <td className="p-3">{s.course}</td>

// //                   {/* PASSWORD STATUS */}
// //                   <td className="p-3">
// //                     {s.defaultPassword ? (
// //                       <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">
// //                         Default Password
// //                       </span>
// //                     ) : (
// //                       <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
// //                         Updated
// //                       </span>
// //                     )}
// //                   </td>

// //                   {/* ACTIONS */}
// //                   <td className="p-3 space-x-2">
// //                     <button
// //                       onClick={() => setEditStudent(s)}
// //                       className="px-3 py-1 bg-yellow-500 text-white rounded"
// //                     >
// //                       Edit
// //                     </button>

// //                     <button
// //                       onClick={() => resetPassword(s)}
// //                       className="px-3 py-1 bg-indigo-600 text-white rounded"
// //                     >
// //                       Reset Password
// //                     </button>

// //                     <button
// //                       onClick={() => deleteStudent(s)}
// //                       className="px-3 py-1 bg-red-600 text-white rounded"
// //                     >
// //                       Delete
// //                     </button>
// //                   </td>
// //                 </tr>
// //               ))
// //             )}
// //           </tbody>
// //         </table>
// //       </div>
// //     </div>
// //   );
// // }

// "use client";

// import { useEffect, useState } from "react";
// import { db } from "@/lib/firebase";
// import { collection, getDocs } from "firebase/firestore";
// import AdmissionForm from "@/components/AdmissionForm";
// import * as XLSX from "xlsx";

// export default function StudentsPage() {
//   const [students, setStudents] = useState([]);
//   const [showForm, setShowForm] = useState(false);
//   const [editStudent, setEditStudent] = useState(null);
//   const [loading, setLoading] = useState(false);

//   /* ---------------- FETCH STUDENTS ---------------- */
//   const fetchStudents = async () => {
//     setLoading(true);
//     const snap = await getDocs(collection(db, "students"));
//     setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
//     setLoading(false);
//   };

//   useEffect(() => {
//     fetchStudents();
//   }, []);

//   /* ---------------- EXCEL UPLOAD ---------------- */
//   const handleExcelUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     const buffer = await file.arrayBuffer();
//     const workbook = XLSX.read(buffer);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const rows = XLSX.utils.sheet_to_json(sheet);

//     if (rows.length === 0) {
//       alert("Excel file is empty");
//       return;
//     }

//     // REQUIRED FIELDS
//     const required = ["RollNumber", "Name", "Email", "Phone", "Course"];
//     for (const r of rows) {
//       for (const field of required) {
//         if (!r[field]) {
//           alert(`Missing ${field} in RollNumber ${r.RollNumber || "UNKNOWN"}`);
//           return;
//         }
//       }
//     }

//     // UNIQUE ROLL NUMBER CHECK
//     const rollSet = new Set();
//     for (const r of rows) {
//       if (rollSet.has(r.RollNumber)) {
//         alert(`Duplicate Roll Number: ${r.RollNumber}`);
//         return;
//       }
//       rollSet.add(r.RollNumber);
//     }

//     const res = await fetch("/college/api/bulk-create-students", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ students: rows }),
//     });

//     if (res.ok) {
//       alert("Students uploaded successfully");
//       fetchStudents();
//     } else {
//       alert("Upload failed");
//     }
//   };

//   /* ---------------- RESET PASSWORD ---------------- */
//   const resetPassword = async (student) => {
//     if (!confirm("Reset password to Sample@123 ?")) return;

//     const res = await fetch("/college/api/reset-student-password", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ uid: student.uid, id: student.id }),
//     });

//     if (res.ok) {
//       alert("Password reset");
//       fetchStudents();
//     }
//   };

//   /* ---------------- DELETE STUDENT ---------------- */
//   const deleteStudent = async (student) => {
//     if (!confirm("Delete this student?")) return;

//     const res = await fetch("/college/api/delete-student", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ uid: student.uid, id: student.id }),
//     });

//     if (res.ok) fetchStudents();
//   };

//   return (
//     <div className="p-6 min-h-screen bg-gray-100">
//       {/* HEADER */}
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-3xl font-bold">Students</h1>

//         <div className="flex gap-3">
//           <button
//             onClick={() => setShowForm(true)}
//             className="bg-blue-600 text-white px-5 py-2 rounded-lg"
//           >
//             Create Admission
//           </button>

//           <button
//             onClick={() => document.getElementById("excelUpload").click()}
//             className="bg-green-600 text-white px-5 py-2 rounded-lg"
//           >
//             Upload Excel
//           </button>

//           <input
//             id="excelUpload"
//             type="file"
//             accept=".xlsx"
//             hidden
//             onChange={handleExcelUpload}
//           />
//         </div>
//       </div>

//       {showForm && (
//         <AdmissionForm
//           onClose={() => setShowForm(false)}
//           onSuccess={fetchStudents}
//         />
//       )}

//       {/* TABLE */}
//       <div className="bg-white rounded-xl shadow overflow-x-auto">
//         <table className="w-full">
//           <thead className="bg-gray-200">
//             <tr>
//               <th className="p-3 text-left">Roll</th>
//               <th className="p-3 text-left">Name</th>
//               <th className="p-3 text-left">Email</th>
//               <th className="p-3 text-left">Course</th>
//               <th className="p-3 text-left">Status</th>
//               <th className="p-3 text-left">Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan="6" className="p-6 text-center">
//                   Loading...
//                 </td>
//               </tr>
//             ) : students.length === 0 ? (
//               <tr>
//                 <td colSpan="6" className="p-6 text-center">
//                   No students found
//                 </td>
//               </tr>
//             ) : (
//               students.map((s) => (
//                 <tr key={s.id} className="border-b">
//                   <td className="p-3">{s.rollNumber}</td>
//                   <td className="p-3">{s.name}</td>
//                   <td className="p-3">{s.email}</td>
//                   <td className="p-3">{s.course}</td>
//                   <td className="p-3">
//                     {s.defaultPassword ? "Default" : "Updated"}
//                   </td>
//                   <td className="p-3 space-x-2">
//                     <button
//                       onClick={() => resetPassword(s)}
//                       className="px-3 py-1 bg-indigo-600 text-white rounded"
//                     >
//                       Reset
//                     </button>
//                     <button
//                       onClick={() => deleteStudent(s)}
//                       className="px-3 py-1 bg-red-600 text-white rounded"
//                     >
//                       Delete
//                     </button>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }



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
        setMaxStudents(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.role === "collegeAdmin") {
            setCollegeScopeUid(user.uid);
            setMaxStudents(data.maxStudents ?? null);
          } else {
            setCollegeScopeUid(data.collegeAdminUid || null);
            if (data.collegeAdminUid) {
              const adminSnap = await getDoc(doc(db, "users", data.collegeAdminUid));
              setMaxStudents(adminSnap.exists() ? (adminSnap.data().maxStudents ?? null) : null);
            } else {
              setMaxStudents(null);
            }
          }
        } else {
          setCollegeScopeUid(null);
          setMaxStudents(null);
        }
      } catch {
        setCollegeScopeUid(null);
        setMaxStudents(null);
      }
    });
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      if (!collegeScopeUid) {
        const snap = await getDocs(collection(db, "students"));
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          rollNumber: String(d.data().rollNumber || ""),
        }));
        setAllStudents(data);
        setFilteredStudents(data);
        setLoading(false);
        return;
      }
      const q = query(
        collection(db, "students"),
        where("collegeAdminUid", "==", collegeScopeUid)
      );
      const snap = await getDocs(q);
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
  }, [collegeScopeUid]);

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
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
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
