"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function StudentUpload({ onSuccess, collegeAdminUid, collegeCode, maxStudents, currentStudentCount }) {
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      alert("Excel file is empty");
      return;
    }

    if (maxStudents != null && currentStudentCount != null) {
      if (currentStudentCount + rows.length > maxStudents) {
        alert(
          `Student limit would be exceeded. Your college is allowed ${maxStudents} student(s). Current: ${currentStudentCount}. This upload would add ${rows.length}. Contact super admin to increase the limit.`
        );
        e.target.value = "";
        return;
      }
    }

    const payload = rows.map((r) => ({
      RollNumber: String(r.RollNumber),
      Name: r.Name,
      Email: r.Email,
      Phone: r.Phone,
      Course: r.Course,
    }));

    const body = { students: payload };
    if (collegeAdminUid) body.collegeAdminUid = collegeAdminUid;
    if (collegeCode != null) body.college = collegeCode;
    const res = await fetch("/college/api/bulk-create-students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      alert("Upload failed");
      return;
    }

    setResult(data.results);
    onSuccess();
  };

  const atStudentLimit = maxStudents != null && currentStudentCount != null && currentStudentCount >= maxStudents;

  return (
    <div>
      <button
        onClick={() => document.getElementById("excelUpload").click()}
        disabled={atStudentLimit}
        className="bg-green-600 text-white px-5 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Upload Excel
      </button>

      <input
        id="excelUpload"
        type="file"
        accept=".xlsx"
        hidden
        onChange={handleUpload}
      />

      {result && (
        <div className="mt-4 bg-white p-4 rounded-xl shadow">
          <p className="text-green-600">
            Created: {result.created.length}
          </p>
          <p className="text-yellow-600">
            Already Exists: {result.skipped.length}
          </p>
          <p className="text-red-600">
            Failed: {result.failed.length}
          </p>
        </div>
      )}
    </div>
  );
}
