// "use client";

// import { useState } from "react";

// export default function AdmissionForm({ onClose, onSuccess }) {
//   const [loading, setLoading] = useState(false);
//   const [formData, setFormData] = useState({
//     name: "",
//     email: "",
//     phone: "",
//     course: "",
//   });

//   const handleChange = (e) =>
//     setFormData({ ...formData, [e.target.name]: e.target.value });

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       const res = await fetch("/college/api/create-student", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);

//       alert("Student admitted successfully");
//       onSuccess();
//       onClose();
//     } catch (err) {
//       alert(err.message);
//     }

//     setLoading(false);
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//       <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
//         <h2 className="text-xl font-semibold mb-4">Create Admission</h2>

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <input name="name" placeholder="Name" required onChange={handleChange}
//             className="w-full p-3 border rounded-lg" />

//           <input name="email" type="email" placeholder="Email" required onChange={handleChange}
//             className="w-full p-3 border rounded-lg" />

//           <input name="phone" placeholder="Phone" required onChange={handleChange}
//             className="w-full p-3 border rounded-lg" />

//           <input name="course" placeholder="Course" required onChange={handleChange}
//             className="w-full p-3 border rounded-lg" />

//           <div className="flex justify-end gap-3">
//             <button type="button" onClick={onClose}
//               className="px-4 py-2 bg-gray-300 rounded-lg">
//               Cancel
//             </button>

//             <button type="submit" disabled={loading}
//               className="px-4 py-2 bg-blue-600 text-white rounded-lg">
//               {loading ? "Creating..." : "Submit"}
//             </button>
//           </div>
//         </form>

//         <p className="text-sm text-gray-500 mt-3">
//           Default Password: <strong>Sample@123</strong>
//         </p>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";

export default function AdmissionForm({ onClose, onSuccess, collegeAdminUid, defaultCollege }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rollNumber: "",
    name: "",
    email: "",
    phone: "",
    course: "",
  });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...formData };
      if (collegeAdminUid) payload.collegeAdminUid = collegeAdminUid;
      // College short comes from logged-in admin (defaultCollege), not from form input
      if (defaultCollege != null && String(defaultCollege).trim() !== "") {
        payload.college = String(defaultCollege).trim();
      }
      const res = await fetch("/college/api/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("Student admitted successfully");
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 text-black">
        <h2 className="text-xl font-semibold mb-4">Create Admission</h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Roll Number */}
          <input
            name="rollNumber"
            placeholder="Roll Number"
            required
            onChange={handleChange}
            className="w-full p-3 border rounded-lg border-gray-300 bg-white text-black"
          />

          <input
            name="name"
            placeholder="Name"
            required
            onChange={handleChange}
            className="w-full p-3 border rounded-lg border-gray-300 bg-white text-black"
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            onChange={handleChange}
            className="w-full p-3 border rounded-lg border-gray-300 bg-white text-black"
          />

          <input
            name="phone"
            placeholder="Phone"
            required
            onChange={handleChange}
            className="w-full p-3 border rounded-lg border-gray-300 bg-white text-black"
          />

          <input
            name="course"
            placeholder="Course"
            required
            onChange={handleChange}
            className="w-full p-3 border rounded-lg border-gray-300 bg-white text-black"
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded-lg"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              {loading ? "Creating..." : "Submit"}
            </button>
          </div>
        </form>

        <p className="text-sm text-gray-500 mt-3">
          Default Password: <strong>Sample@123</strong>
        </p>
      </div>
    </div>
  );
}
