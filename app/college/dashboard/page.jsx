"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { questionDb } from "@/lib/firebaseQuestionDb";
import PermissionRoute from "@/components/PermissionRoute";

const PASS_THRESHOLD_PCT = 40;

/* Skeleton placeholder for loading – same layout as dashboard, no layout shift */
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-9 w-64 bg-gray-200 rounded" />
          <div className="h-5 w-80 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-10 w-[200px] bg-gray-200 rounded-lg shrink-0" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow border border-gray-100">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-16 bg-gray-200 rounded mt-3" />
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <div className="h-6 w-36 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded w-full" />
          ))}
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-2 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardPageContent() {
  const [collegeCode, setCollegeCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [studentsCount, setStudentsCount] = useState(0);
  const [testsList, setTestsList] = useState([]);
  const [superadminTests, setSuperadminTests] = useState([]);
  const [results, setResults] = useState([]);
  const [studentIdToName, setStudentIdToName] = useState({});

  // View mode: "ourCollege" = college-code data; "ranksprint" = Super Admin tests analytics
  const [viewMode, setViewMode] = useState("ourCollege");

  // Resolve college code (collegeAdmin → collegeShort; collegeuser → admin's collegeShort)
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        setCollegeCode(null);
        setLoading(false);
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
            setLoading(false);
          }
        } else {
          setCollegeCode(null);
          setLoading(false);
        }
      } catch {
        setCollegeCode(null);
        setLoading(false);
      }
    });
  }, []);

  // Fetch students count, tests, results – scoped to this college
  useEffect(() => {
    const code =
      collegeCode != null && String(collegeCode).trim() !== ""
        ? String(collegeCode).trim()
        : null;
    if (!code) {
      setStudentsCount(0);
      setTestsList([]);
      setSuperadminTests([]);
      setResults([]);
      setStudentIdToName({});
      return;
    }

    setError("");
    const load = async () => {
      try {
        const [studentsSnap, testsSnap, superadminSnap, resultsSnap] = await Promise.all([
          getDocs(collection(db, "students", code, "ids")),
          getDocs(collection(questionDb, code)),
          getDocs(collection(db, "superadminTests")),
          getDocs(collection(db, "results", "byCollege", code)),
        ]);
        const tests = testsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const superTests = superadminSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const resultsData = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const nameMap = {};
        studentsSnap.docs.forEach((d) => {
          const uid = (d.data() && d.data().uid) || d.id;
          const name = d.data().name || d.data().email || "Student";
          if (uid) nameMap[uid] = name;
        });
        setStudentsCount(studentsSnap.docs.length);
        setTestsList(tests);
        setSuperadminTests(superTests);
        setResults(resultsData);
        setStudentIdToName(nameMap);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [collegeCode]);

  // Data for current view: Our College (college code) vs RankSprint (Super Admin tests)
  const superadminTestIds = useMemo(
    () => new Set(superadminTests.map((t) => t.id)),
    [superadminTests]
  );
  const displayResults = useMemo(() => {
    if (viewMode === "ranksprint") {
      return results.filter((r) => r.testId && superadminTestIds.has(r.testId));
    }
    return results;
  }, [viewMode, results, superadminTestIds]);
  const displayTestsList = useMemo(() => {
    if (viewMode === "ranksprint") return superadminTests;
    return testsList;
  }, [viewMode, testsList, superadminTests]);

  // Derived stats from displayResults
  const stats = useMemo(() => {
    const totalAttempts = displayResults.length;
    let totalScore = 0;
    let totalQuestions = 0;
    let maxPct = 0;
    let passCount = 0;
    const testIdsWithAttempts = new Set();

    displayResults.forEach((r) => {
      const score = r.score ?? 0;
      const total = r.total ?? 0;
      totalScore += score;
      totalQuestions += total;
      if (total > 0) {
        const pct = Math.round((score / total) * 100);
        if (pct > maxPct) maxPct = pct;
        if (pct >= PASS_THRESHOLD_PCT) passCount++;
      }
      if (r.testId) testIdsWithAttempts.add(r.testId);
    });

    const averageScorePct =
      totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    const accuracyPct = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    const passPercentage =
      totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

    return [
      { title: "Total Students", value: studentsCount },
      { title: "Total Mock Tests", value: displayTestsList.length },
      { title: "Total Attempts", value: totalAttempts },
      { title: "Average Score", value: `${averageScorePct}%` },
      { title: "Topper Score", value: maxPct > 0 ? `${maxPct}%` : "—" },
      { title: "Accuracy %", value: `${accuracyPct}%` },
      { title: "Active Tests", value: testIdsWithAttempts.size },
      { title: "Pass Percentage", value: `${passPercentage}%` },
    ];
  }, [displayResults, studentsCount, displayTestsList.length]);

  // Exam performance by testType
  const examPerformance = useMemo(() => {
    const byType = {};
    displayResults.forEach((r) => {
      const type = String(r.testType || "Other").trim() || "Other";
      if (!byType[type]) byType[type] = { score: 0, total: 0 };
      byType[type].score += r.score ?? 0;
      byType[type].total += r.total ?? 0;
    });
    return Object.entries(byType).map(([name, { score, total }]) => ({
      name,
      avg: total > 0 ? Math.round((score / total) * 100) : 0,
    }));
  }, [displayResults]);

  // Subject-wise performance from subjectWise
  const subjectPerformance = useMemo(() => {
    const bySubject = {};
    displayResults.forEach((r) => {
      if (r.subjectWise && typeof r.subjectWise === "object") {
        Object.entries(r.subjectWise).forEach(([subj, data]) => {
          const s = String(subj).trim() || "General";
          if (!bySubject[s]) bySubject[s] = { score: 0, total: 0 };
          bySubject[s].score += data.score ?? 0;
          bySubject[s].total += data.total ?? 0;
        });
      }
    });
    return Object.entries(bySubject)
      .map(([subject, { score, total }]) => ({
        subject,
        avg: total > 0 ? Math.round((score / total) * 100) : 0,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [displayResults]);

  const bestSubject = subjectPerformance[0] || null;
  const weakestSubject =
    subjectPerformance.length > 0 ? subjectPerformance[subjectPerformance.length - 1] : null;

  // Top performers: by best single attempt per student (uid)
  const toppers = useMemo(() => {
    const byUid = {};
    displayResults.forEach((r) => {
      const uid = r.uid || r.studentId;
      if (!uid) return;
      const total = r.total ?? 0;
      const pct = total > 0 ? Math.round(((r.score ?? 0) / total) * 100) : 0;
      if (!byUid[uid] || pct > byUid[uid].pct) {
        byUid[uid] = {
          pct,
          testType: String(r.testType || "Other").trim() || "Other",
        };
      }
    });
    return Object.entries(byUid)
      .map(([uid, { pct, testType }]) => ({
        uid,
        name: studentIdToName[uid] || "Student",
        score: pct,
        exam: testType,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [displayResults, studentIdToName]);

  if (!collegeCode && !loading) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">College Dashboard</h1>
        <p className="text-gray-600">College not found for your account. Please contact admin.</p>
      </div>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">College Dashboard</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER + View selector (right) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">College Dashboard</h1>
          <p className="text-gray-600">
            JEE Mains • JEE Advanced • Institute Mock Analytics
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="dashboard-view" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            View:
          </label>
          <select
            id="dashboard-view"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
          >
            <option value="ourCollege">
              Our College ({collegeCode || "—"})
            </option>
            <option value="ranksprint">RankSprint</option>
          </select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.title}
            className="bg-white p-5 rounded-xl shadow hover:shadow-md transition"
          >
            <p className="text-sm text-gray-500">{s.title}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* PERFORMANCE OVERVIEW */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-bold text-lg mb-4">Exam Performance</h2>
          {examPerformance.length > 0 ? (
            <ul className="space-y-3">
              {examPerformance.map(({ name, avg }) => (
                <li key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="font-semibold">{avg}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No attempt data yet.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-bold text-lg mb-4">Best Performing Subject</h2>
          {bestSubject ? (
            <>
              <p className="text-4xl font-bold text-green-600">{bestSubject.subject}</p>
              <p className="text-gray-500 mt-2">Avg Score: {bestSubject.avg}%</p>
            </>
          ) : (
            <p className="text-gray-500">No subject data yet.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-bold text-lg mb-4">Weakest Area</h2>
          {weakestSubject && subjectPerformance.length > 1 ? (
            <>
              <p className="text-4xl font-bold text-red-500">{weakestSubject.subject}</p>
              <p className="text-gray-500 mt-2">Avg Score: {weakestSubject.avg}% — Needs improvement</p>
            </>
          ) : weakestSubject ? (
            <>
              <p className="text-4xl font-bold text-gray-600">{weakestSubject.subject}</p>
              <p className="text-gray-500 mt-2">Avg Score: {weakestSubject.avg}%</p>
            </>
          ) : (
            <p className="text-gray-500">No subject data yet.</p>
          )}
        </div>
      </div>

      {/* TOPPERS */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-bold text-lg mb-4">Top Performers</h2>
        {toppers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="p-2">Rank</th>
                  <th className="p-2">Student</th>
                  <th className="p-2">Exam</th>
                  <th className="p-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {toppers.map((t, i) => (
                  <tr key={t.uid + i} className="border-t">
                    <td className="p-2 font-bold">{i + 1}</td>
                    <td className="p-2">{t.name}</td>
                    <td className="p-2">{t.exam}</td>
                    <td className="p-2 font-semibold">{t.score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No attempt data yet.</p>
        )}
      </div>

      {/* SUBJECT PERFORMANCE */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-bold text-lg mb-4">Subject-wise Average Score</h2>
        {subjectPerformance.length > 0 ? (
          <div className="space-y-4">
            {subjectPerformance.map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between mb-1">
                  <span>{s.subject}</span>
                  <span className="font-semibold">{s.avg}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-blue-600 h-2 rounded"
                    style={{ width: `${Math.min(100, s.avg)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No subject-wise data yet.</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PermissionRoute requiredPermission="dashboard">
      <DashboardPageContent />
    </PermissionRoute>
  );
}
