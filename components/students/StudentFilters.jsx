"use client";

export default function StudentFilters({ students, filters, setFilters }) {
  const courses = [...new Set(students.map((s) => s.course))];

  return (
    <div className="bg-white p-4 rounded-xl shadow mb-4 grid grid-cols-1 md:grid-cols-5 gap-4">
      <input
        placeholder="Search Roll Number"
        value={filters.roll}
        onChange={(e) => setFilters({ ...filters, roll: e.target.value })}
        className="p-3 border rounded"
      />

      <select
        value={filters.course}
        onChange={(e) => setFilters({ ...filters, course: e.target.value })}
        className="p-3 border rounded"
      >
        <option value="">All Courses</option>
        {courses.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={filters.sortBy}
        onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
        className="p-3 border rounded"
      >
        <option value="">Sort By</option>
        <option value="name">Name</option>
        <option value="roll">Roll Number</option>
      </select>

      <select
        value={filters.sortOrder}
        onChange={(e) =>
          setFilters({ ...filters, sortOrder: e.target.value })
        }
        className="p-3 border rounded"
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>

      <button
        onClick={() =>
          setFilters({ roll: "", course: "", sortBy: "", sortOrder: "asc" })
        }
        className="bg-gray-600 text-white rounded"
      >
        Clear
      </button>
    </div>
  );
}
