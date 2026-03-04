"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

export default function ExamPage({ params }) {
  const { exam } = use(params);
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();

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

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading tests...
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-2">{examLabel}</h2>
        <p className="text-slate-500 mb-6">
          Select a test to start
        </p>

        {error && (
          <p className="text-red-500 font-medium mb-4">{error}</p>
        )}

        {!error && tests.length === 0 && (
          <p className="text-red-500">No tests available for this exam type.</p>
        )}

        {!error && tests.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {tests.map((test) => (
              <div
                key={test.id}
                onClick={() => router.push(`/select-test/${exam}/${test.id}`)}
                className="p-6 border rounded-lg transition bg-white cursor-pointer hover:shadow-lg hover:border-blue-300"
              >
                <h3 className="font-semibold text-lg">
                  {test.name || "Untitled Test"}
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  Duration: {test.duration ?? "—"} minutes
                </p>

                {test.testType && (
                  <p className="text-xs text-blue-600 mt-1">
                    {test.testType}
                  </p>
                )}

                <p className="text-xs text-green-600 mt-3">
                  Click to start
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
