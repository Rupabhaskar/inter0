"use client";

export default function StudentTable({ students, loading, onRefresh }) {
  const deleteStudent = async (s) => {
    if (!confirm("Delete this student?")) return;

    const res = await fetch("/college/api/delete-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: s.uid, id: s.id }),
    });

    if (res.ok) onRefresh();
    else alert("Delete failed");
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-3">Roll</th>
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Course</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="5" className="p-6 text-center">
                Loading...
              </td>
            </tr>
          ) : students.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-6 text-center">
                No students found
              </td>
            </tr>
          ) : (
            students.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="p-3">{s.rollNumber}</td>
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.email}</td>
                <td className="p-3">{s.course}</td>
                <td className="p-3">
                  <button
                    onClick={() => deleteStudent(s)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
