"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

export default function ExamPage({ params }) {
  const { exam } = use(params);
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!exam || !user?.uid) {
        setLoading(false);
        return;
      }
      setError("");
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/exam-tests?exam=${encodeURIComponent(exam)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `API ${res.status}`);
        }
        const data = await res.json();
        setTests(data.tests || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load tests.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [exam, user]);

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
