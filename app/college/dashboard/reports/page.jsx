"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { questionDb } from "@/lib/firebaseQuestionDb";
import PermissionRoute from "@/components/PermissionRoute";
import { Download, Search, Users, User } from "lucide-react";

function downloadCSV(filename, rows, headers) {
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const line = (arr) => arr.map(escape).join(",");
  const content = [line(headers), ...rows.map((r) => line(headers.map((h) => r[h])))].join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ReportsContent() {
  const [collegeCode, setCollegeCode] = useState(null);

  const [studentIdInput, setStudentIdInput] = useState("");
  const [student, setStudent] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");

  const [classWiseData, setClassWiseData] = useState([]);
  const [classWiseLoading, setClassWiseLoading] = useState(false);

  const [allResults, setAllResults] = useState([]);
  const [testsMap, setTestsMap] = useState({});
  const [classesList, setClassesList] = useState([]);
  const [classIdToUids, setClassIdToUids] = useState({});

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

  /* Load results, tests, classes, classMembers, students – all scoped to this college */
  useEffect(() => {
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) {
      setAllResults([]);
      setTestsMap({});
      setClassesList([]);
      setClassIdToUids({});
      return;
    }

    const load = async () => {
      const [resultsSnap, testsSnap, classesSnap, membersSnap, studentsSnap] = await Promise.all([
        getDocs(collection(db, "results", "byCollege", code)),
        getDocs(collection(questionDb, code)),
        getDocs(collection(db, "classes", code, "items")),
        getDocs(query(collection(db, "classMembers"), where("collegeCode", "==", code))),
        getDocs(collection(db, "students", code, "ids")),
      ]);
      const results = resultsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllResults(results);
      const tests = {};
      testsSnap.docs.forEach((d) => {
        tests[d.id] = d.data();
      });
      setTestsMap(tests);
      const classes = classesSnap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
      setClassesList(classes);
      const studentIdToUid = {};
      studentsSnap.docs.forEach((d) => {
        const uid = (d.data() && d.data().uid) || d.id;
        if (uid) studentIdToUid[d.id] = uid;
      });
      const classIdToUidsMap = {};
      membersSnap.docs.forEach((d) => {
        const { classId, studentId } = d.data();
        if (!classId || !studentId) return;
        const uid = studentIdToUid[studentId] || studentId;
        if (!classIdToUidsMap[classId]) classIdToUidsMap[classId] = new Set();
        classIdToUidsMap[classId].add(uid);
      });
      setClassIdToUids(classIdToUidsMap);
    };
    load();
  }, [collegeCode]);

  /* Class-based comparison: use classes from manage/classes + classMembers (scoped to college) */
  const loadClassWise = useCallback(async () => {
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) {
      setClassWiseData([]);
      return;
    }

    setClassWiseLoading(true);
    try {
      const results = allResults.length
        ? allResults
        : (await getDocs(collection(db, "results", "byCollege", code))).docs.map((d) => ({ ...d.data() }));
      const classes =
        classesList.length > 0
          ? classesList
          : (await getDocs(collection(db, "classes", code, "items"))).docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
      const classIdsSet = new Set(classes.map((c) => c.id));
      let classIdToUidsMap = Object.keys(classIdToUids).length > 0 ? classIdToUids : {};
      if (Object.keys(classIdToUidsMap).length === 0 && classes.length > 0) {
        const [membersSnap, studentsSnap] = await Promise.all([
          getDocs(query(collection(db, "classMembers"), where("collegeCode", "==", code))),
          getDocs(collection(db, "students", code, "ids")),
        ]);
        const studentIdToUid = {};
        studentsSnap.docs.forEach((d) => {
          const uid = (d.data() && d.data().uid) || d.id;
          if (uid) studentIdToUid[d.id] = uid;
        });
        membersSnap.docs.forEach((d) => {
          const { classId, studentId } = d.data();
          if (!classId || !studentId) return;
          if (!classIdsSet.has(classId)) return;
          const uid = studentIdToUid[studentId];
          if (!uid) return;
          if (!classIdToUidsMap[classId]) classIdToUidsMap[classId] = new Set();
          classIdToUidsMap[classId].add(uid);
        });
        if (membersSnap.docs.length === 0 && classes.length > 0) {
          const legacyMembersSnap = await getDocs(collection(db, "classMembers"));
          legacyMembersSnap.docs.forEach((d) => {
            const { classId, studentId } = d.data();
            if (!classId || !studentId || !classIdsSet.has(classId)) return;
            const uid = studentIdToUid[studentId];
            if (!uid) return;
            if (!classIdToUidsMap[classId]) classIdToUidsMap[classId] = new Set();
            classIdToUidsMap[classId].add(uid);
          });
        }
      }

      const rows = [];
      classes.forEach((cls) => {
        const uids = classIdToUidsMap[cls.id] ? Array.from(classIdToUidsMap[cls.id]) : [];
        const classResults = results.filter((r) => r.uid && uids.includes(r.uid));
        const byTestType = {};
        classResults.forEach((r) => {
          const testType = String(r.testType || "Other").trim() || "Other";
          if (!byTestType[testType]) {
            byTestType[testType] = {
              totalAttempts: 0,
              totalScore: 0,
              totalQuestions: 0,
              uidSet: new Set(),
              subjectScores: {},
              subjectTotals: {},
            };
          }
          const entry = byTestType[testType];
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
        });
        if (Object.keys(byTestType).length > 0) {
          Object.entries(byTestType).forEach(([testType, e]) => {
            const examAvg = e.totalQuestions > 0 ? Math.round((e.totalScore / e.totalQuestions) * 100) : 0;
            const subjectAvgs = {};
            Object.keys(e.subjectScores || {}).forEach((s) => {
              const t = (e.subjectTotals || {})[s] || 0;
              subjectAvgs[s] = t > 0 ? Math.round((e.subjectScores[s] / t) * 100) : 0;
            });
            rows.push({
              classId: cls.id,
              class: cls.name,
              testType,
              totalStudents: e.uidSet.size,
              totalAttempts: e.totalAttempts,
              examAvg,
              subjectAvgs,
            });
          });
        } else {
          rows.push({
            classId: cls.id,
            class: cls.name,
            testType: "—",
            totalStudents: uids.length,
            totalAttempts: 0,
            examAvg: 0,
            subjectAvgs: {},
          });
        }
      });
      setClassWiseData(rows);
    } catch (err) {
      console.error(err);
      setClassWiseData([]);
    } finally {
      setClassWiseLoading(false);
    }
  }, [collegeCode, allResults, classesList, classIdToUids]);

  useEffect(() => {
    if (collegeCode && classesList.length > 0) loadClassWise();
  }, [collegeCode, classesList.length, allResults.length, loadClassWise]);

  /* Student analytics: find student within this college (roll no or doc id), then get results from results/byCollege/{collegeCode} */
  const searchStudent = async () => {
    const input = (studentIdInput || "").trim();
    if (!input) {
      setStudentError("Enter Student ID (Roll No or ID)");
      return;
    }
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) {
      setStudentError("College context not found. Please refresh and try again.");
      return;
    }
    setStudentLoading(true);
    setStudentError("");
    setStudent(null);
    setStudentResults([]);
    try {
      let found = null;
      const idsRef = collection(db, "students", code, "ids");
      const byRoll = query(idsRef, where("rollNumber", "==", input));
      const rollSnap = await getDocs(byRoll);
      if (!rollSnap.empty) {
        const d = rollSnap.docs[0];
        found = { id: d.id, ...d.data() };
      }
      if (!found) {
        const studentDoc = await getDoc(doc(db, "students", code, "ids", input));
        if (studentDoc.exists()) {
          found = { id: studentDoc.id, ...studentDoc.data() };
        }
      }
      if (!found) {
        setStudentError("Student not found with this ID / Roll No in this college.");
        setStudentLoading(false);
        return;
      }
      setStudent(found);
      const uid = found.uid || found.id;
      const resultsRef = collection(db, "results", "byCollege", code);
      const resultsQuery = query(resultsRef, where("uid", "==", uid));
      const resSnap = await getDocs(resultsQuery);
      const results = resSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStudentResults(results);
    } catch (err) {
      console.error(err);
      setStudentError("Failed to load student data");
    } finally {
      setStudentLoading(false);
    }
  };

  /* Student aggregates */
  const studentExamAvg =
    studentResults.length > 0
      ? Math.round(
          (studentResults.reduce((s, r) => s + (r.score ?? 0), 0) /
            studentResults.reduce((s, r) => s + (r.total || 0), 0)) *
            100
        )
      : 0;
  const studentSubjectAvgs = {};
  studentResults.forEach((r) => {
    if (r.subjectWise && typeof r.subjectWise === "object") {
      Object.entries(r.subjectWise).forEach(([subj, data]) => {
        const s = String(subj).trim() || "General";
        if (!studentSubjectAvgs[s]) studentSubjectAvgs[s] = { score: 0, total: 0 };
        studentSubjectAvgs[s].score += data.score ?? 0;
        studentSubjectAvgs[s].total += data.total ?? 0;
      });
    }
  });
  Object.keys(studentSubjectAvgs).forEach((s) => {
    const t = studentSubjectAvgs[s].total;
    studentSubjectAvgs[s] = t > 0 ? Math.round((studentSubjectAvgs[s].score / t) * 100) : 0;
  });

  const studentClass = student?.course || student?.class || "";

  /* Student results grouped by exam type (for table in student section) */
  const studentByExamType = (() => {
    const byTestType = {};
    studentResults.forEach((r) => {
      const testType = String(r.testType || "Other").trim() || "Other";
      if (!byTestType[testType]) {
        byTestType[testType] = { totalAttempts: 0, totalScore: 0, totalQuestions: 0, subjectScores: {}, subjectTotals: {} };
      }
      const e = byTestType[testType];
      e.totalAttempts += 1;
      e.totalScore += (r.score ?? 0);
      e.totalQuestions += (r.total ?? 0);
      if (r.subjectWise && typeof r.subjectWise === "object") {
        Object.entries(r.subjectWise).forEach(([subj, data]) => {
          const s = String(subj).trim() || "General";
          if (!e.subjectScores[s]) e.subjectScores[s] = 0;
          if (!e.subjectTotals[s]) e.subjectTotals[s] = 0;
          e.subjectScores[s] += data.score ?? 0;
          e.subjectTotals[s] += data.total ?? 0;
        });
      }
    });
    return Object.entries(byTestType).map(([testType, e]) => {
      const examAvg = e.totalQuestions > 0 ? Math.round((e.totalScore / e.totalQuestions) * 100) : 0;
      const subjectAvgs = {};
      Object.keys(e.subjectScores || {}).forEach((s) => {
        const t = (e.subjectTotals || {})[s] || 0;
        subjectAvgs[s] = t > 0 ? Math.round((e.subjectScores[s] / t) * 100) : 0;
      });
      return { testType, totalAttempts: e.totalAttempts, examAvg, subjectAvgs };
    });
  })();

  const studentRankInClass =
    studentClass && allResults.length > 0 && student
      ? (() => {
          const sameClassResults = allResults.filter((r) => String(r.class || "").trim() === String(studentClass).trim());
          const uid = student.uid || student.id;
          const byUid = {};
          sameClassResults.forEach((r) => {
            if (!r.uid) return;
            if (!byUid[r.uid]) byUid[r.uid] = [];
            byUid[r.uid].push(r.total ? (r.score ?? 0) / r.total : 0);
          });
          const allAvgs = Object.entries(byUid).map(([u, arr]) => ({
            uid: u,
            avg: arr.reduce((x, y) => x + y, 0) / arr.length,
          }));
          allAvgs.sort((a, b) => b.avg - a.avg);
          const idx = allAvgs.findIndex((a) => a.uid === uid);
          return idx >= 0 ? idx + 1 : null;
        })()
      : null;

  const onDownloadStudentReport = () => {
    if (!student || studentResults.length === 0) return;
    if (studentByExamType.length === 0) {
      const rows = [
        { Metric: "Exam average (%)", Value: studentExamAvg },
        { Metric: "Class", Value: studentClass || "-" },
        { Metric: "Rank in class", Value: studentRankInClass != null ? studentRankInClass : "-" },
        { Metric: "Total attempts", Value: studentResults.length },
        ...Object.entries(studentSubjectAvgs).map(([subj, avg]) => ({ Metric: `Subject: ${subj} (%)`, Value: avg })),
      ];
      downloadCSV(`student-report-${(student.rollNumber || student.id || "student").toString().replace(/\s/g, "-")}.csv`, rows, ["Metric", "Value"]);
      return;
    }
    const subjectKeys = [...new Set(studentByExamType.flatMap((r) => Object.keys(r.subjectAvgs || {})))];
    const headers = ["Exam type", "Attempts", "Exam avg (%)", ...subjectKeys.map((s) => `${s} (%)`)];
    const rows = studentByExamType.map((r) => {
      const row = {
        "Exam type": r.testType,
        Attempts: r.totalAttempts,
        "Exam avg (%)": r.examAvg,
      };
      subjectKeys.forEach((s) => {
        row[`${s} (%)`] = (r.subjectAvgs || {})[s] ?? "";
      });
      return row;
    });
    downloadCSV(
      `student-report-${(student.rollNumber || student.id || "student").toString().replace(/\s/g, "-")}.csv`,
      rows,
      headers
    );
  };

  const onDownloadClassWiseReport = () => {
    const subjectKeys = [...new Set(classWiseData.flatMap((r) => Object.keys(r.subjectAvgs || {})))];
    const allHeaders = ["Class", "Exam Type", "Total Students", "Total Attempts", "Exam Avg (%)", ...subjectKeys.map((s) => `${s} Avg (%)`)];
    const rows = classWiseData.map((r) => {
      const row = {
        Class: r.class,
        "Exam Type": r.testType,
        "Total Students": r.totalStudents,
        "Total Attempts": r.totalAttempts,
        "Exam Avg (%)": r.examAvg,
      };
      subjectKeys.forEach((s) => {
        row[`${s} Avg (%)`] = (r.subjectAvgs || {})[s] ?? "";
      });
      return row;
    });
    downloadCSV("class-wise-report.csv", rows, allHeaders);
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Download & Export Reports
      </h1>
      {collegeCode == null && (
        <p className="text-amber-600 mb-4">Loading college context…</p>
      )}
      {collegeCode !== null && String(collegeCode).trim() === "" && (
        <p className="text-amber-600 mb-4">College not found for your account. Reports are scoped to your college.</p>
      )}

      {/* Student Analytics */}
      <section className="bg-white rounded-xl border shadow-sm p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Student Analytics</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Enter Student ID to view exam average, subject average, and class-wise performance.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={studentIdInput}
            onChange={(e) => setStudentIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchStudent()}
            placeholder="Roll No or Student ID"
            className="border rounded-lg px-4 py-2 w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={searchStudent}
            disabled={studentLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            {studentLoading ? "Searching..." : "Search"}
          </button>
        </div>
        {studentError && (
          <p className="text-red-600 text-sm mb-4">{studentError}</p>
        )}
        {student && (
          <div className="border rounded-lg p-4 bg-gray-50 mb-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              {student.name || student.email || "Student"} {student.rollNumber && `(${student.rollNumber})`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-xs text-gray-500 uppercase">Exam average</div>
                <div className="text-xl font-bold text-blue-600">{studentExamAvg}%</div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-xs text-gray-500 uppercase">Class</div>
                <div className="text-lg font-semibold">{studentClass || "-"}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-xs text-gray-500 uppercase">Rank in class</div>
                <div className="text-lg font-semibold">{studentRankInClass != null ? `#${studentRankInClass}` : "-"}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="text-xs text-gray-500 uppercase">Total attempts</div>
                <div className="text-lg font-semibold">{studentResults.length}</div>
              </div>
            </div>
            {Object.keys(studentSubjectAvgs).length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Subject average (%)</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(studentSubjectAvgs).map(([subj, avg]) => (
                    <span
                      key={subj}
                      className="bg-white border rounded px-3 py-1 text-sm"
                    >
                      {subj}: <strong>{avg}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {studentByExamType.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Exam type comparison</div>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-3">Exam type</th>
                        <th className="p-3">Attempts</th>
                        <th className="p-3">Exam avg (%)</th>
                        {[...new Set(studentByExamType.flatMap((r) => Object.keys(r.subjectAvgs || {})))].map((s) => (
                          <th key={s} className="p-3">{s} (%)</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentByExamType.map((row) => (
                        <tr key={row.testType} className="border-t">
                          <td className="p-3 font-medium">{row.testType}</td>
                          <td className="p-3">{row.totalAttempts}</td>
                          <td className="p-3 font-semibold">{row.examAvg}</td>
                          {[...new Set(studentByExamType.flatMap((r) => Object.keys(r.subjectAvgs || {})))].map((s) => (
                            <td key={s} className="p-3">{(row.subjectAvgs || {})[s] ?? "-"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <button
              onClick={onDownloadStudentReport}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download student report (CSV)
            </button>
          </div>
        )}
      </section>

      {/* Class-based comparison (from Manage > Classes) – exam-wise */}
      <section className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Class-based performance</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Classes from <strong>Manage → Classes</strong>, broken down by <strong>exam type</strong>. Only students added to each class are included. Total students, attempts, exam average, and subject-wise average per class and exam type.
        </p>
        <button
          onClick={loadClassWise}
          disabled={classWiseLoading}
          className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {classWiseLoading ? "Loading..." : "Load class-wise report"}
        </button>
        {classWiseData.length > 0 && (
          <>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3">Class</th>
                    <th className="p-3">Exam type</th>
                    <th className="p-3">Total students</th>
                    <th className="p-3">Total attempts</th>
                    <th className="p-3">Exam avg (%)</th>
                    {[...new Set(classWiseData.flatMap((r) => Object.keys(r.subjectAvgs || {})))].map((s) => (
                      <th key={s} className="p-3">{s} avg (%)</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classWiseData.map((row, idx) => (
                    <tr key={`${row.class}-${row.testType}-${idx}`} className="border-t">
                      <td className="p-3 font-medium">{row.class}</td>
                      <td className="p-3 font-medium">{row.testType}</td>
                      <td className="p-3">{row.totalStudents}</td>
                      <td className="p-3">{row.totalAttempts}</td>
                      <td className="p-3 font-semibold">{row.examAvg}</td>
                      {[...new Set(classWiseData.flatMap((r) => Object.keys(r.subjectAvgs || {})))].map((s) => (
                        <td key={s} className="p-3">{(row.subjectAvgs || {})[s] ?? "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={onDownloadClassWiseReport}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download class-wise report (CSV)
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export default function Reports() {
  return (
    <PermissionRoute requiredPermission="reports">
      <ReportsContent />
    </PermissionRoute>
  );
}
