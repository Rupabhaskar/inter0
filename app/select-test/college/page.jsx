"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { collection, collectionGroup, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { questionDb } from "@/lib/firebaseQuestionDb";

export default function CollegeTestsPage() {
  const [tests, setTests] = useState([]);
  const [submittedTestIds, setSubmittedTestIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const loadFromFirestore = async () => {
      const idsGroup = collectionGroup(db, "ids");
      const studentQ = query(idsGroup, where("uid", "==", user.uid), limit(1));
      const studentSnap = await getDocs(studentQ);
      if (studentSnap.empty) return;
      const studentDoc = studentSnap.docs[0];
      const studentData = studentDoc.data();
      const collegeCode =
        (studentData.college != null && String(studentData.college).trim() !== "")
          ? String(studentData.college).trim()
          : studentDoc.ref.parent.parent.id;
      const testsRef = collection(questionDb, collegeCode);
      const resultsRef = collection(db, "results", "byCollege", collegeCode);
      const [testsSnap, resultsSnap] = await Promise.all([
        getDocs(testsRef),
        getDocs(query(resultsRef, where("uid", "==", user.uid))),
      ]);
      const data = testsSnap.docs.map((docSnap) => {
        const id = docSnap.id;
        const { name, duration, testType } = docSnap.data();
        return { id, name, duration, testType };
      });
      setTests(data);
      if (!resultsSnap.empty) {
        setSubmittedTestIds(
          new Set(resultsSnap.docs.map((d) => d.data().testId).filter(Boolean))
        );
      }
    };

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
        if (res.ok) {
          const data = await res.json();
          setTests(data.tests || []);
          setSubmittedTestIds(
            new Set(Array.isArray(data.submittedTestIds) ? data.submittedTestIds : [])
          );
          return;
        }
        const err = await res.json().catch(() => ({}));
        if (res.status === 503 && (err.error || "").toLowerCase().includes("question db")) {
          try {
            await loadFromFirestore();
          } catch (e) {
            console.error(e);
            setTests([]);
          }
          return;
        }
        throw new Error(err.error || `API ${res.status}`);
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
