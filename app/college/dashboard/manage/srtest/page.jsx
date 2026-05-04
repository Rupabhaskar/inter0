"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import PermissionRoute from "@/components/PermissionRoute";
import { BarChart3, Users, Target, FileQuestion } from "lucide-react";

function SrtestContent() {
  const [collegeCode, setCollegeCode] = useState(null);
  const [superadminTests, setSuperadminTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Resolve college code (collegeAdmin → collegeShort; collegeuser → admin's collegeShort) */
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        setCollegeCode(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.role === "collegeAdmin") {
            setCollegeCode(data.collegeShort ?? null);
          } else if (data.collegeAdminUid) {
            const adminSnap = await getDoc(doc(db, "users", data.collegeAdminUid));
            const adminData = adminSnap.exists() ? adminSnap.data() : {};
            setCollegeCode(adminData.collegeShort ?? null);
          } else {
            setCollegeCode(null);
          }
        } else {
          setCollegeCode(null);
        }
      } catch {
        setCollegeCode(null);
      }
    });
  }, []);

  /* Load superadmin tests and results – scoped ONLY to this college */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [testsSnap, collegeResultsSnap] = await Promise.all([
          getDocs(collection(db, "superadminTests")),
          collegeCode
            ? getDocs(collection(db, "results", "byCollege", collegeCode))
            : Promise.resolve({ docs: [] }),
        ]);

        if (cancelled) return;

        const tests = testsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSuperadminTests(tests);

        const superadminTestIds = new Set(tests.map((t) => t.id));
        const collegeResults = collegeCode
          ? collegeResultsSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((r) => r.testId && superadminTestIds.has(r.testId))
          : [];

        setResults({
          college: collegeResults,
          platform: [],
        });
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to load tests and results.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [collegeCode]);

  /* Test-wise analytics: for each superadmin test, aggregate attempts, unique students, avg %, subject-wise – ONLY this college's results */
  const testWiseAnalytics = useMemo(() => {
    const byTest = {};
    superadminTests.forEach((t) => {
      byTest[t.id] = {
        test: t,
        totalAttempts: 0,
        totalScore: 0,
        totalQuestions: 0,
        uidSet: new Set(),
        subjectScores: {},
        subjectTotals: {},
      };
    });

    const addResult = (r, source) => {
      const testId = r.testId;
      if (!testId || !byTest[testId]) return;
      const entry = byTest[testId];
      entry.totalAttempts += 1;
      entry.totalScore += (r.score ?? 0);
      entry.totalQuestions += (r.total ?? 0);
      if (r.uid) entry.uidSet.add(r.uid);
      if (r.subjectWise && typeof r.subjectWise === "object") {
        Object.entries(r.subjectWise).forEach(([subj, data]) => {
          const s = String(subj).trim() || "General";
          if (!entry.subjectScores[s]) entry.subjectScores[s] = 0;
          if (!entry.subjectTotals[s]) entry.subjectTotals[s] = 0;
          entry.subjectScores[s] += data.score ?? 0;
          entry.subjectTotals[s] += data.total ?? 0;
        });
      }
    };

    (results.college || []).forEach((r) => addResult(r, "college"));

    return Object.values(byTest).map((entry) => {
      const examAvg =
        entry.totalQuestions > 0
          ? Math.round((entry.totalScore / entry.totalQuestions) * 100)
          : 0;
      const subjectAvgs = {};
      Object.keys(entry.subjectScores || {}).forEach((s) => {
        const t = (entry.subjectTotals || {})[s] || 0;
        subjectAvgs[s] = t > 0 ? Math.round((entry.subjectScores[s] / t) * 100) : 0;
      });
      return {
        ...entry.test,
        totalAttempts: entry.totalAttempts,
        totalStudents: entry.uidSet.size,
        examAvg,
        subjectAvgs,
      };
    });
  }, [superadminTests, results]);

  if (loading) {
    return (
      <div className="p-6 min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading RankSprint tests and analytics…</p>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        RankSprint Test
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Default tests by RankSprint. Results and analytics are shown test-wise (platform-wide attempts).
      </p>
      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      {superadminTests.length === 0 && !error && (
        <div className="bg-white rounded-xl border shadow-sm p-8 text-center text-gray-500">
          No RankSprint tests available yet.
        </div>
      )}

      {testWiseAnalytics.length > 0 && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testWiseAnalytics.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                    <FileQuestion className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-gray-800 truncate" title={row.name}>
                      {row.name || row.id}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {row.testType || "—"} · {row.duration ? `${row.duration} min` : "—"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="flex justify-center text-indigo-600 mb-0.5">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-bold text-gray-800">{row.totalAttempts}</div>
                    <div className="text-xs text-gray-500">Attempts</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="flex justify-center text-indigo-600 mb-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-bold text-gray-800">{row.totalStudents}</div>
                    <div className="text-xs text-gray-500">Students</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="flex justify-center text-indigo-600 mb-0.5">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div className="text-lg font-bold text-gray-800">{row.examAvg}%</div>
                    <div className="text-xs text-gray-500">Avg</div>
                  </div>
                </div>
                {Object.keys(row.subjectAvgs || {}).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-500 mb-1">Subject average (%)</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(row.subjectAvgs).map(([subj, avg]) => (
                        <span
                          key={subj}
                          className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                        >
                          {subj}: {avg}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">Test-wise summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3">Test name</th>
                    <th className="p-3">Exam type</th>
                    <th className="p-3">Attempts</th>
                    <th className="p-3">Students</th>
                    <th className="p-3">Avg (%)</th>
                    <th className="p-3">Subject averages</th>
                  </tr>
                </thead>
                <tbody>
                  {testWiseAnalytics.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{row.name || row.id}</td>
                      <td className="p-3 text-gray-600">{row.testType || "—"}</td>
                      <td className="p-3">{row.totalAttempts}</td>
                      <td className="p-3">{row.totalStudents}</td>
                      <td className="p-3 font-semibold">{row.examAvg}%</td>
                      <td className="p-3">
                        {Object.keys(row.subjectAvgs || {}).length > 0 ? (
                          <span className="text-gray-600">
                            {Object.entries(row.subjectAvgs)
                              .map(([s, a]) => `${s}: ${a}%`)
                              .join(", ")}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SrtestPage() {
  return (
    <PermissionRoute requiredPermission="manage-questions">
      <SrtestContent />
    </PermissionRoute>
  );
}
