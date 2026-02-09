"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function CollegeTestsPage() {
  const [tests, setTests] = useState([]);
  const [submittedTestIds, setSubmittedTestIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const loadTests = async () => {
      if (!user?.uid) {
        setTests([]);
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/college/api/questions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `API ${res.status}`);
        }
        const data = await res.json();
        setTests(data.tests || []);
        setSubmittedTestIds(
          new Set(Array.isArray(data.submittedTestIds) ? data.submittedTestIds : [])
        );
      } catch (err) {
        console.error(err);
        setTests([]);
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, [user]);

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading College Tests...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">College Tests</h2>
      <p className="text-slate-500 mb-6">
        Select a test to start
      </p>

      {tests.length === 0 ? (
        <p className="text-red-500">No tests found for your college.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {tests.map((test) => {
            const testId = test.id;
            const alreadySubmitted = submittedTestIds.has(testId);
            return (
              <div
                key={testId}
                onClick={() => {
                  if (alreadySubmitted) return;
                  router.push(`/select-test/college/${testId}`);
                }}
                className={`p-6 border rounded-lg transition ${
                  alreadySubmitted
                    ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-75"
                    : "bg-white cursor-pointer hover:shadow-lg hover:border-blue-300"
                }`}
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

                {alreadySubmitted ? (
                  <p className="text-xs text-amber-600 mt-3 font-medium">
                    Already submitted
                  </p>
                ) : (
                  <p className="text-xs text-green-600 mt-3">
                    Click to start
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
