"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";

const TESTS_COLLECTION = "superadminTests";

// Map URL exam slug to testType filter (case-insensitive match).
// JEE Advanced: only tests that explicitly have "advanced"; "JEE" / "JEE Mains" stay on JEE Mains.
function testTypeMatchesExam(testType, examSlug) {
  if (!testType || !examSlug) return false;
  const normalized = (t) =>
    String(t)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  const examLabel = examSlug.replace(/-/g, " ");
  const a = normalized(testType);
  const b = normalized(examLabel);

  // JEE Advanced: show when testType mentions "advance" or "advanced"
  if (b === "jee advanced") {
    return a.includes("advanced") || a.includes("advance");
  }
  // JEE Mains: show "JEE Mains" or generic "JEE", but NOT "JEE Advanced"
  if (b === "jee mains") {
    return (a.includes("jee") || a.includes("mains")) && !a.includes("advanced");
  }

  return a === b || a.includes(b) || b.includes(a);
}

export default function ExamPage({ params }) {
  const { exam } = use(params);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!exam) {
        setLoading(false);
        return;
      }
      setError("");
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, TESTS_COLLECTION));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = all.filter((t) =>
          testTypeMatchesExam(t.testType, exam)
        );
        setTests(filtered);
      } catch (err) {
        console.error(err);
        setError("Failed to load tests.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [exam]);

  const examLabel = exam ? exam.replace(/-/g, " ").toUpperCase() : "";

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">{examLabel}</h2>
        <p className="text-slate-500 mb-6">Select a test</p>

        {loading && (
          <div className="text-center py-10 text-gray-500">Loading tests...</div>
        )}

        {error && (
          <div className="text-center py-6 text-red-500 font-medium">{error}</div>
        )}

        {!loading && !error && tests.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No tests available for this exam type.
          </div>
        )}

        {!loading && !error && tests.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {tests.map((test) => (
              <Link
                key={test.id}
                href={`/select-test/${exam}/${test.id}`}
                className="p-6 bg-white border rounded-lg hover:shadow transition"
              >
                <h3 className="font-semibold text-lg">{test.name}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {test.testType && (
                    <span className="text-blue-600">{test.testType}</span>
                  )}
                  {test.duration != null && (
                    <span> • {test.duration} mins</span>
                  )}
                </p>
                <p className="text-xs text-green-600 mt-3">Start Test</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
