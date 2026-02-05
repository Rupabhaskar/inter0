"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, onSnapshot, doc, getDoc, getDocs, query, where, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { questionDb } from "@/lib/firebaseQuestionDb";

export default function LeaderboardPage() {
  const [collegeCode, setCollegeCode] = useState(null);
  const [results, setResults] = useState([]);
  const [enrichedResults, setEnrichedResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTestType, setSelectedTestType] = useState("");
  const [minMarks, setMinMarks] = useState("");
  const [maxMarks, setMaxMarks] = useState("");

  const viewMode = selectedSubject ? "subject" : "overall"; // overall total marks OR subject-wise

  /* ================= COLLEGE CODE (logged-in college admin/user) ================= */

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

  /* ================= LOAD RESULTS: results (collection) → byCollege (doc) → collegeCode (subcollection) ================= */

  useEffect(() => {
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) {
      setResults([]);
      setEnrichedResults([]);
      setLoading(false);
      return;
    }

    const resultsRef = collection(db, "results", "byCollege", code);
    const unsub = onSnapshot(
      resultsRef,
      async (snap) => {
        try {
          const resultsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setResults(resultsData);

          const enriched = [];

          for (const result of resultsData) {
            let studentName = result.studentName || "Unknown";
            let studentClass = result.class || "";
            let testName = "";
            let testSubject = result.subject || "";

            // Enrich student from students/{collegeCode}/ids if name/class missing
            const studentId = result.uid || result.studentId;
            if (studentId && (!result.studentName || result.studentName === "Unknown" || !result.class)) {
              try {
                const idsGroup = collectionGroup(db, "ids");
                const q = query(idsGroup, where("uid", "==", studentId), limit(1));
                const studentSnap = await getDocs(q);
                if (!studentSnap.empty) {
                  const studentData = studentSnap.docs[0].data();
                  studentName = studentData.name || result.studentName || "Unknown";
                  studentClass = studentData.course || studentData.class || result.class || "";
                }
              } catch (err) {
                console.error("Error fetching student:", err);
              }
            }

            // Test name from questionDb: collection(collegeCode).doc(testId)
            if (result.testId) {
              try {
                const testSnap = await getDoc(doc(questionDb, code, result.testId));
                if (testSnap.exists()) {
                  const testData = testSnap.data();
                  testName = testData.name || "";
                  testSubject = testData.subject || testData.name || "";
                }
              } catch (err) {
                console.error("Error fetching test:", err);
              }
            }

            const testType = result.testType || "";
            const overallMarks = result.marks ?? result.score ?? 0;
            const overallTotal = result.total ?? 0;

            enriched.push({
              ...result,
              studentName,
              class: studentClass,
              subject: "Total",
              testName,
              testType,
              marks: overallMarks,
              total: overallTotal,
              rowType: "overall",
            });

            if (result.subjectWise && typeof result.subjectWise === "object") {
              Object.keys(result.subjectWise).forEach((subject) => {
                const subjectData = result.subjectWise[subject];
                enriched.push({
                  ...result,
                  studentName,
                  class: studentClass,
                  subject: subject || "Unknown",
                  testName,
                  testType,
                  marks: subjectData?.score ?? 0,
                  total: subjectData?.total ?? 0,
                  rowType: "subject",
                });
              });
            } else {
              const singleSubject = testSubject || result.subject || "Unknown";
              enriched.push({
                ...result,
                studentName,
                class: studentClass,
                subject: singleSubject,
                testName,
                testType,
                marks: overallMarks,
                total: overallTotal,
                rowType: "subject",
              });
            }
          }

          setEnrichedResults(enriched);
          setLoading(false);
        } catch (error) {
          console.error("Error processing results:", error);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error in onSnapshot:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [collegeCode]);

  /* ================= FILTERED DATA ================= */

  const filteredResults = useMemo(() => {
    return enrichedResults
      .filter((r) => (r.rowType || "overall") === viewMode)
      .filter((r) =>
        selectedClass ? r.class === selectedClass : true
      )
      .filter((r) =>
        selectedSubject ? r.subject === selectedSubject : true
      )
      .filter((r) =>
        selectedTestType ? r.testType === selectedTestType : true
      )
      .filter((r) =>
        minMarks !== "" ? (r.marks ?? 0) >= Number(minMarks) : true
      )
      .filter((r) =>
        maxMarks !== "" ? (r.marks ?? 0) <= Number(maxMarks) : true
      )
      .sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0));
  }, [enrichedResults, viewMode, selectedClass, selectedSubject, selectedTestType, minMarks, maxMarks]);

  /* ================= RANK CALCULATION ================= */

  const rankedResults = useMemo(() => {
    // OVERALL: rank all rows together by total marks
    if (viewMode === "overall") {
      let lastMarks = null;
      let rank = 0;
      return [...filteredResults]
        .sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0))
        .map((r, index) => {
          const currentMarks = r.marks ?? 0;
          if (currentMarks !== lastMarks) {
            rank = index + 1;
            lastMarks = currentMarks;
          }
          return { ...r, rank };
        });
    }

    // SUBJECT: rank within each subject group (usually 1 group because subject selected)
    const subjectGroups = {};
    filteredResults.forEach((r) => {
      const subjectKey = r.subject || "Unknown";
      if (!subjectGroups[subjectKey]) subjectGroups[subjectKey] = [];
      subjectGroups[subjectKey].push(r);
    });

    const ranked = [];
    Object.keys(subjectGroups).sort().forEach((subjectKey) => {
      const subjectResults = [...subjectGroups[subjectKey]].sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0));
      let lastMarks = null;
      let rank = 0;
      subjectResults.forEach((r, index) => {
        const currentMarks = r.marks ?? 0;
        if (currentMarks !== lastMarks) {
          rank = index + 1;
          lastMarks = currentMarks;
        }
        ranked.push({ ...r, rank });
      });
    });

    return ranked.sort((a, b) => {
      if (a.subject !== b.subject) {
        return (a.subject || "").localeCompare(b.subject || "");
      }
      return (a.rank ?? 0) - (b.rank ?? 0);
    });
  }, [filteredResults, viewMode]);

  /* ================= UNIQUE FILTER VALUES ================= */

  const classes = useMemo(() => {
    return [...new Set(enrichedResults.map((r) => r.class).filter((c) => c != null && c !== ""))].sort();
  }, [enrichedResults]);

  const subjects = useMemo(() => {
    const allSubjects = new Set();
    let base = enrichedResults.filter((r) => r.rowType === "subject");

    if (selectedClass) base = base.filter((r) => r.class === selectedClass);
    if (selectedTestType) base = base.filter((r) => r.testType === selectedTestType);

    base.forEach((r) => {
      if (r.subject && r.subject !== "" && r.subject !== "Total") {
        allSubjects.add(r.subject);
      }
    });
    return Array.from(allSubjects).sort();
  }, [enrichedResults, selectedClass, selectedTestType]);

  const testTypes = useMemo(() => {
    return [...new Set(enrichedResults.map((r) => r.testType).filter((t) => t != null && t !== ""))].sort();
  }, [enrichedResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl shadow">

        <h1 className="text-2xl font-bold mb-4">🏆 Rank & Leaderboard</h1>

        {/* ================= FILTERS ================= */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <select
            className="border p-2 rounded"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              // Reset subject when class changes
              setSelectedSubject("");
            }}
          >
            <option value="">All Classes</option>
            {classes.map((c, idx) => (
              <option key={c || `class-${idx}`} value={c}>
                Class {c}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((s, idx) => (
              <option key={s || `subject-${idx}`} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded"
            value={selectedTestType}
            onChange={(e) => setSelectedTestType(e.target.value)}
          >
            <option value="">All Test Types</option>
            {testTypes.map((t, idx) => (
              <option key={t || `testType-${idx}`} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            type="number"
            className="border p-2 rounded"
            placeholder="Min Marks"
            value={minMarks}
            onChange={(e) => setMinMarks(e.target.value)}
          />

          <input
            type="number"
            className="border p-2 rounded"
            placeholder="Max Marks"
            value={maxMarks}
            onChange={(e) => setMaxMarks(e.target.value)}
          />
        </div>

        {/* ================= STATS ================= */}
        <div className="mb-4 text-gray-600">
          Total Students:{" "}
          <span className="font-semibold">{rankedResults.length}</span>
        </div>

        {/* ================= TABLE ================= */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-3 border">Rank</th>
                <th className="p-3 border">Subject</th>
                <th className="p-3 border">Student</th>
                <th className="p-3 border">Class</th>
                <th className="p-3 border">Marks</th>
              </tr>
            </thead>
            <tbody>
              {rankedResults.map((r, idx) => (
                <tr key={`${r.id}-${idx}`} className="hover:bg-gray-50">
                  <td className="p-3 border font-bold">
                    {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : (r.rank || "-")}
                  </td>
                  <td className="p-3 border font-medium text-blue-600">
                    {r.subject || "N/A"}
                  </td>
                  <td className="p-3 border">{r.studentName || "Unknown"}</td>
                  <td className="p-3 border">{r.class ? `Class ${r.class}` : "N/A"}</td>
                  <td className="p-3 border font-semibold">
                    {r.marks ?? 0} / {r.total ?? "?"}
                  </td>
                </tr>
              ))}
              {rankedResults.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center p-4 text-gray-500"
                  >
                    No results found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
