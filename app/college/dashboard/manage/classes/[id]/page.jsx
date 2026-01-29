// // "use client";

// // import { useEffect, useState } from "react";
// // import { useParams } from "next/navigation";
// // import {
// //   collection,
// //   addDoc,
// //   getDocs,
// //   query,
// //   where,
// // } from "firebase/firestore";
// // import { db } from "@/lib/firebase";

// // export default function ClassDetailPage() {
// //   const { id } = useParams();
// //   const [email, setEmail] = useState("");
// //   const [members, setMembers] = useState([]);

// //   const fetchMembers = async () => {
// //     const q = query(
// //       collection(db, "classMembers"),
// //       where("classId", "==", id)
// //     );

// //     const snap = await getDocs(q);
// //     setMembers(snap.docs.map(doc => doc.data()));
// //   };

// //   useEffect(() => {
// //     fetchMembers();
// //   }, [id]);

// //   const addMember = async () => {
// //     if (!email) return alert("Enter email");

// //     await addDoc(collection(db, "classMembers"), {
// //       classId: id,
// //       userEmail: email,
// //       role: "student",
// //     });

// //     setEmail("");
// //     fetchMembers();
// //   };

// //   return (
// //     <div className="p-6 space-y-4">
// //       <h1 className="text-xl font-bold">Manage Class</h1>

// //       <div className="flex gap-2">
// //         <input
// //           placeholder="Student email"
// //           value={email}
// //           onChange={(e) => setEmail(e.target.value)}
// //           className="border p-2 rounded"
// //         />
// //         <button onClick={addMember} className="bg-green-600 px-4 rounded text-white">
// //           Add
// //         </button>
// //       </div>

// //       <ul className="space-y-2">
// //         {members.map((m, i) => (
// //           <li key={i} className="border p-2 rounded">
// //             {m.userEmail} ({m.role})
// //           </li>
// //         ))}
// //       </ul>
// //     </div>
// //   );
// // }


// "use client";

// import { useEffect, useState } from "react";
// import { useParams } from "next/navigation";
// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   addDoc,
// } from "firebase/firestore";
// import { db } from "@/lib/firebase";

// export default function ManageClassPage() {
//   const { id: classId } = useParams();

//   const [rollNumber, setRollNumber] = useState("");
//   const [results, setResults] = useState([]);
//   const [selectedStudent, setSelectedStudent] = useState(null);
//   const [members, setMembers] = useState([]);

//   // 🔍 Search student by roll number
//   const searchStudent = async () => {
//     if (!rollNumber) return;

//     const q = query(
//       collection(db, "students"),
//       where("rollNumber", "==", rollNumber)
//     );

//     const snap = await getDocs(q);
//     const data = snap.docs.map(doc => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     setResults(data);
//     setSelectedStudent(null); // reset selection
//   };

//   // ➕ Add selected student to class
//   const addToClass = async () => {
//     if (!selectedStudent) {
//       alert("Please select a student first");
//       return;
//     }

//     await addDoc(collection(db, "classMembers"), {
//       classId,
//       studentId: selectedStudent.id,
//       rollNumber: selectedStudent.rollNumber,
//       name: selectedStudent.name,
//     });

//     alert("Student added to class");
//     setSelectedStudent(null);
//     setResults([]);
//     setRollNumber("");
//     fetchMembers();
//   };

//   // 📋 Fetch class members
//   const fetchMembers = async () => {
//     const q = query(
//       collection(db, "classMembers"),
//       where("classId", "==", classId)
//     );
//     const snap = await getDocs(q);
//     setMembers(snap.docs.map(doc => doc.data()));
//   };

//   useEffect(() => {
//     fetchMembers();
//   }, []);

//   return (
//     <div className="p-6 space-y-4">
//       <h1 className="text-xl font-bold">Add Student to Class</h1>

//       {/* Search */}
//       <div className="flex gap-2">
//         <input
//           placeholder="Enter Roll Number"
//           value={rollNumber}
//           onChange={(e) => setRollNumber(e.target.value)}
//           className="border p-2 rounded"
//         />
//         <button
//           onClick={searchStudent}
//           className="bg-blue-600 text-white px-4 rounded"
//         >
//           Search
//         </button>
//       </div>

//       {/* Search Results */}
//       {results.length > 0 && (
//         <div className="border rounded p-2 space-y-2">
//           {results.map((s) => (
//             <div
//               key={s.id}
//               onClick={() => setSelectedStudent(s)}
//               className={`p-2 border rounded cursor-pointer
//                 ${
//                   selectedStudent?.id === s.id
//                     ? "bg-blue-100 border-blue-500"
//                     : "hover:bg-gray-100"
//                 }`}
//             >
//               <p className="font-medium">{s.name}</p>
//               <p className="text-sm text-gray-600">
//                 Roll No: {s.rollNumber}
//               </p>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Add Button */}
//       <button
//         onClick={addToClass}
//         disabled={!selectedStudent}
//         className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
//       >
//         Add to Class
//       </button>

//       {/* Class Members */}
//       <div>
//         <h2 className="font-semibold mt-6 mb-2">Class Members</h2>
//         <ul className="space-y-1">
//           {members.map((m, i) => (
//             <li key={i} className="border p-2 rounded">
//               {m.name} ({m.rollNumber})
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, UserPlus } from "lucide-react";

export default function ManageClassPage() {
  const { id: classId } = useParams();

  const [rollNumber, setRollNumber] = useState("");
  const [results, setResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔍 Search student
  const searchStudent = async () => {
    if (!rollNumber.trim()) return;

    setLoading(true);
    const q = query(
      collection(db, "students"),
      where("rollNumber", "==", rollNumber)
    );

    const snap = await getDocs(q);
    setResults(
      snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    );
    setSelectedStudent(null);
    setLoading(false);
  };

  // ➕ Add student
  const addToClass = async () => {
    if (!selectedStudent) return;

    await addDoc(collection(db, "classMembers"), {
      classId,
      studentId: selectedStudent.id,
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
    setMembers(snap.docs.map(doc => doc.data()));
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Manage Class</h1>
        <p className="text-gray-500 mt-1">
          Search students and add them to this class
        </p>
      </div>

      {/* Search Card */}
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
            disabled={loading}
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
          disabled={!selectedStudent}
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
            {members.map((m, i) => (
              <li key={i} className="py-2 flex justify-between">
                <span>{m.name}</span>
                <span className="text-gray-500">
                  {m.rollNumber}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
