"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { collection, collectionGroup, query, where, onSnapshot, doc, getDoc, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { questionDb } from "@/lib/firebaseQuestionDb";

export default function Dashboard() {
  const { user, role } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsByTestType, setStatsByTestType] = useState({});
  const [selectedTestType, setSelectedTestType] = useState("");
  const [testNames, setTestNames] = useState({}); // Map of testId -> testName

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    // Only fetch and display dashboard results for students
    if (role !== "student") {
      queueMicrotask(() => setLoading(false));
      return;
    }

    // Load from localStorage first for instant display
    const loadFromCache = () => {
      try {
        const cached = localStorage.getItem(`dashboard_results_${user.uid}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          const cachedResults = cachedData.results || [];
          const cachedTestNames = cachedData.testNames || {};
          const cachedStats = cachedData.stats || {};
          
          // Check if cache is recent (less than 5 minutes old)
          const cacheAge = cachedData.timestamp ? Date.now() - cachedData.timestamp : Infinity;
          const isRecent = cacheAge < 5 * 60 * 1000; // 5 minutes
          
          if (cachedResults.length > 0) {
            setHistory(cachedResults);
            setTestNames(cachedTestNames);
            if (Object.keys(cachedStats).length > 0) {
              setStatsByTestType(cachedStats);
            }
            setLoading(false);
            return isRecent; // Return true if cache is recent, false if stale
          }
        }
      } catch (err) {
        console.error("Error loading from cache:", err);
      }
      return false;
    };

    // Try to load from cache first
    const hasCache = loadFromCache();

    // Process and cache results (collegeCode used to fetch college test names from questionDb)
    const processResults = async (snapshot, collegeCode) => {
      const results = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Show only results for the logged-in user (by studentId or uid)
        const resultStudentId = data.studentId || data.uid;
        if (!resultStudentId || resultStudentId !== user.uid) {
          return; // Skip if not this user's result
        }

        // Handle different date formats
        let createdAt = new Date(0);
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (data.submittedAt) {
          createdAt = data.submittedAt.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt);
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        }

        // Get exam type - college tests have testType field, JEE tests have exam field
        // If testType exists, use it; otherwise use exam field; if neither, check if it's college (has testId)
        let examType = data.testType || data.exam;
        if (!examType && data.testId) {
          examType = "college";
        }
        if (!examType) {
          examType = "unknown";
        }
        
        // Get test name/subject (testName is stored when saving college results)
        let testName = data.testName || data.test || "";
        let subject = data.subject || "";
        
        // For college tests without subject, use testId or testType
        if (data.testId && !subject) {
          subject = data.testId;
        }

        // Calculate correct answers if not provided
        let correct = data.correct || 0;
        let wrong = data.wrong || 0;
        let skipped = data.skipped || data.unattempted || 0;
        let total = data.total || 0;
        let score = data.score || data.marks || 0;

        // If we have score and total but no correct count, estimate it
        // For JEE: score is typically marks, total is total marks
        // For College: score is correct count, total is question count
        if (total > 0 && correct === 0 && score > 0) {
          // If score looks like a count (reasonable range), use it as correct
          
          if (score <= total && score === Math.floor(score)) {
            correct = score;
            wrong = total - correct - skipped;
          } else {
            // Score might be marks, estimate correct based on typical scoring
            // Assuming 4 marks per question (JEE pattern)
            const marksPerQuestion = total > 0 ? (score / total) : 4;
            if (marksPerQuestion <= 4) {
              correct = Math.round(score / 4);
              wrong = total - correct - skipped;
            }
          }
        }

        // Ensure we have valid numbers
        correct = Math.max(0, correct || 0);
        wrong = Math.max(0, wrong || 0);
        skipped = Math.max(0, skipped || 0);
        total = Math.max(0, total || (correct + wrong + skipped));

        results.push({
          id: docSnap.id,
          date: createdAt.toLocaleDateString(),
          timestamp: createdAt.getTime(),
          exam: data.exam || examType,
          test: testName,
          testId: data.testId || null,
          testSource: data.testSource || null,
          examType: examType,
          score: score,
          total: total,
          correct: correct,
          wrong: wrong,
          skipped: skipped,
          studentName: data.studentName || "Unknown",
          class: data.class || data.course || data.className || "",
          subject: subject || `${data.exam || examType} - ${testName || data.testId || "Test"}`,
        });
      });

      // Sort by timestamp (most recent first)
      results.sort((a, b) => b.timestamp - a.timestamp);

      setHistory(results);

      // Cache bare results in localStorage (names & stats filled later)
      try {
        localStorage.setItem(`dashboard_results_${user.uid}`, JSON.stringify({
          results,
          testNames: {},
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error("Error caching results:", err);
      }

      // Fetch test names: college (questionDb by collegeCode) and JEE/EAMCET (superadminTests / tests)
      const fetchTestNames = async () => {
        const resultsWithTestId = results.filter(r => r.testId);
        if (resultsWithTestId.length === 0) return;
        const testIdToSource = {};
        resultsWithTestId.forEach(r => {
          if (!testIdToSource[r.testId]) testIdToSource[r.testId] = r.testSource || (r.examType === "college" ? "college" : "tests");
        });
        const testIds = Object.keys(testIdToSource);

        // Check cache first
        const cachedTestNames = {};
        testIds.forEach(testId => {
          const cached = localStorage.getItem(`test_name_${testId}`);
          if (cached) {
            try {
              const data = JSON.parse(cached);
              if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
                cachedTestNames[testId] = data.name;
              }
            } catch (e) {}
          }
        });

        // Fetch missing test names from correct source
        const missingIds = testIds.filter(id => !cachedTestNames[id]);
        if (missingIds.length > 0) {
          const testNamePromises = missingIds.map(async (testId) => {
            const source = testIdToSource[testId];
            // College tests: questionDb collection = collegeCode, doc = testId
            if (source === "college" && collegeCode) {
              try {
                const testDoc = await getDoc(doc(questionDb, collegeCode, testId));
                if (testDoc.exists()) {
                  const name = testDoc.data().name || testId;
                  localStorage.setItem(`test_name_${testId}`, JSON.stringify({ name, timestamp: Date.now() }));
                  return { testId, name };
                }
              } catch (err) {
                console.error(`Error fetching college test ${testId}:`, err);
              }
              return { testId, name: testId };
            }
            // JEE / superadmin: main db
            const collectionName = source === "superadminTests" ? "superadminTests" : "tests";
            try {
              const testDoc = await getDoc(doc(db, collectionName, testId));
              if (testDoc.exists()) {
                const name = testDoc.data().name || testId;
                localStorage.setItem(`test_name_${testId}`, JSON.stringify({ name, timestamp: Date.now() }));
                return { testId, name };
              }
            } catch (err) {
              console.error(`Error fetching test ${testId}:`, err);
            }
            if (collectionName === "tests") {
              try {
                const testDoc = await getDoc(doc(db, "superadminTests", testId));
                if (testDoc.exists()) {
                  const name = testDoc.data().name || testId;
                  localStorage.setItem(`test_name_${testId}`, JSON.stringify({ name, timestamp: Date.now() }));
                  return { testId, name };
                }
              } catch (e) {}
            }
            return { testId, name: testId };
          });
          const testNameResults = await Promise.all(testNamePromises);
          testNameResults.forEach(({ testId, name }) => {
            cachedTestNames[testId] = name;
          });
        }

        setTestNames(cachedTestNames);
        
        // Update cache with test names
        try {
          const cached = localStorage.getItem(`dashboard_results_${user.uid}`);
          if (cached) {
            const cachedData = JSON.parse(cached);
            cachedData.testNames = cachedTestNames;
            localStorage.setItem(`dashboard_results_${user.uid}`, JSON.stringify(cachedData));
          }
        } catch (err) {
          console.error("Error updating cache:", err);
        }
      };
      
      await fetchTestNames();

      // Now we have results + test names; return for stats calculation
      return results;
    };

    // Refs to hold latest docs from each source (for merging) and student's college code
    const topLevelDocsRef = { current: [] };
    const collegeDocsRef = { current: [] };
    const collegeCodeRef = { current: null };

    const mergeAndProcess = async () => {
      const mergedDocs = [...topLevelDocsRef.current, ...collegeDocsRef.current];
      const pseudoSnapshot = {
        forEach: (cb) => mergedDocs.forEach((d) => cb(d)),
      };
      const results = await processResults(pseudoSnapshot, collegeCodeRef.current);
      if (results && results.length > 0) {
        const stats = {};
        results.forEach((result) => {
          const examType = result.examType;
          if (!stats[examType]) {
            stats[examType] = { scores: [], correct: 0, total: 0, count: 0 };
          }
          stats[examType].scores.push(result.score);
          const correct = result.correct || 0;
          const total = result.total || 0;
          stats[examType].correct += correct;
          stats[examType].total += total;
          stats[examType].count += 1;
        });
        Object.keys(stats).forEach((examType) => {
          const typeStats = stats[examType];
          typeStats.bestScore = typeStats.scores.length > 0 ? Math.max(...typeStats.scores) : 0;
          typeStats.avgScore = typeStats.scores.length > 0
            ? Math.round(typeStats.scores.reduce((a, b) => a + b, 0) / typeStats.scores.length)
            : 0;
          typeStats.accuracy = typeStats.total > 0 && typeStats.correct >= 0
            ? Math.round((typeStats.correct / typeStats.total) * 100)
            : 0;
        });
        setStatsByTestType(stats);
        try {
          const cached = localStorage.getItem(`dashboard_results_${user.uid}`);
          if (cached) {
            const cachedData = JSON.parse(cached);
            cachedData.stats = stats;
            cachedData.timestamp = Date.now();
            localStorage.setItem(`dashboard_results_${user.uid}`, JSON.stringify(cachedData));
          }
        } catch (err) {
          console.error("Error caching stats:", err);
        }
      }
      setLoading(false);
    };

    let collegeCode = null;
    const setupListeners = (code) => {
      collegeCodeRef.current = code;
      const unsubTop = onSnapshot(
        collection(db, "results"),
        (snapshot) => {
          topLevelDocsRef.current = snapshot.docs || [];
          mergeAndProcess();
        },
        (err) => {
          console.error("Error fetching results:", err);
          setLoading(false);
        }
      );
      if (!code) {
        return () => unsubTop();
      }
      const collegeRef = collection(db, "results", "byCollege", code);
      const collegeQuery = query(collegeRef, where("uid", "==", user.uid));
      const unsubCollege = onSnapshot(
        collegeQuery,
        (snapshot) => {
          collegeDocsRef.current = snapshot.docs || [];
          mergeAndProcess();
        },
        (err) => {
          console.error("Error fetching college results:", err);
          setLoading(false);
        }
      );
      return () => {
        unsubTop();
        unsubCollege();
      };
    };

    const unsubRef = { current: () => {} };
    (async () => {
      try {
        const idsGroup = collectionGroup(db, "ids");
        const studentSnap = await getDocs(
          query(idsGroup, where("uid", "==", user.uid), limit(1))
        );
        if (!studentSnap.empty) {
          const studentDoc = studentSnap.docs[0];
          const data = studentDoc.data();
          collegeCode =
            (data.college != null && String(data.college).trim() !== "")
              ? String(data.college).trim()
              : studentDoc.ref.parent.parent.id;
        }
      } catch (err) {
        console.error("Error fetching student college:", err);
      }
      unsubRef.current = setupListeners(collegeCode);
    })();

    return () => unsubRef.current();
  }, [user, role]);

  // Filter history based on selected test type
  const filteredHistory = useMemo(() => {
    if (!selectedTestType) return history;
    return history.filter((h) => h.examType === selectedTestType);
  }, [history, selectedTestType]);

  // Calculate overall stats (based on filtered history)
  const totalTests = filteredHistory.length;
  const allScores = filteredHistory.map((h) => h.score);
  const avgScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

  const bestScore =
    allScores.length > 0
      ? Math.max(...allScores)
      : 0;

  const totalCorrect = filteredHistory.reduce((sum, h) => sum + (h.correct || 0), 0);
  const totalQuestions = filteredHistory.reduce((sum, h) => sum + (h.total || 0), 0);
  const accuracy =
    totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;

  // Get available test types
  const availableTestTypes = useMemo(() => {
    const types = new Set();
    history.forEach((h) => {
      if (h.examType) types.add(h.examType);
    });
    return Array.from(types).sort();
  }, [history]);

  // Show exam name, never raw id/slug
  const getTestTypeName = (type) => {
    if (!type) return "Unknown";
    const known = {
      "jee-mains": "JEE Mains",
      "jee mains": "JEE Mains",
      "jee-advanced": "JEE Advanced",
      "jee advanced": "JEE Advanced",
      "jee advance": "JEE Advanced",
      "college": "College",
      "eamcet": "EAMCET",
    };
    const lower = String(type).toLowerCase().trim();
    if (known[lower]) return known[lower];
    if (known[type]) return known[type];
    return String(type).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Info Icon */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Dashboard
            </h1>
            <p className="text-slate-500"> 
              Track your performance & improve daily 
            </p>
          </div>
          <InfoTooltip
            content={
              <div className="space-y-2">
                <p className="font-semibold mb-2">Dashboard Information</p>
                <div className="space-y-1 text-sm">
                  <p><strong>Tests Taken:</strong> Total number of tests you&apos;ve completed</p>
                  <p><strong>Average Score:</strong> Your average score across all tests</p>
                  <p><strong>Accuracy:</strong> Percentage of correct answers (Correct/Total × 100)</p>
                  <p><strong>Best Score:</strong> Your highest score across all tests</p>
                </div>
                {Object.keys(statsByTestType).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="font-semibold mb-2">Performance by Test Type:</p>
                    {Object.entries(statsByTestType).map(([type, stats]) => (
                      <div key={type} className="text-sm mb-1">
                        <strong>{getTestTypeName(type)}:</strong> Best: {stats.bestScore}, Avg: {stats.avgScore}, Accuracy: {stats.accuracy}%
                      </div>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Loading your data...</p>
          </div>
        ) : role !== "student" ? (
          <div className="bg-white border rounded-lg p-8 text-center">
            <p className="text-slate-600 mb-4">
              This dashboard is for students. Your test results and stats will appear here when you are signed in as a student.
            </p>
            <Link
              href="/select-test"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Tests
            </Link>
          </div>
        ) : (
          <>
            {/* Test Type Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filter by Test Type
              </label>
              <select
                value={selectedTestType}
                onChange={(e) => setSelectedTestType(e.target.value)}
                className="border border-slate-300 rounded-lg px-4 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Test Types</option>
                {availableTestTypes.map((type) => (
                  <option key={type} value={type}>
                    {getTestTypeName(type)}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <StatCard 
                label="Tests Taken" 
                value={totalTests}
                info="Total number of tests you've completed"
                getTestTypeName={getTestTypeName}
              />
              <StatCard 
                label="Average Score" 
                value={avgScore}
                info={`Average score across all tests. Calculated from ${totalTests} test${totalTests !== 1 ? 's' : ''}`}
                statsByType={statsByTestType}
                statKey="avgScore"
                getTestTypeName={getTestTypeName}
              />
              <StatCard 
                label="Accuracy" 
                value={`${accuracy}%`}
                info={`Overall accuracy: ${totalCorrect} correct out of ${totalQuestions} total questions`}
                statsByType={statsByTestType}
                statKey="accuracy"
                getTestTypeName={getTestTypeName}
              />
              <StatCard 
                label="Best Score" 
                value={bestScore}
                info={`Your highest score across all tests`}
                statsByType={statsByTestType}
                statKey="bestScore"
                getTestTypeName={getTestTypeName}
              />
            </div>

            {/* Recent Tests */}
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="font-semibold mb-4">
                Recent Tests
              </h2>

              {filteredHistory.length === 0 ? (
                <p className="text-slate-500">
                  {selectedTestType 
                    ? `No ${getTestTypeName(selectedTestType)} tests found.`
                    : "No tests attempted yet. Start your first test to see your progress here."}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-2">Date</th>
                      <th>Exam</th>
                      <th>Score</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.slice(0, 10).map((test) => {
                      const examName = getTestTypeName(test.examType);
                      const testNameDisplay = test.test || (test.testId && testNames[test.testId]) || "";
                      const examDisplay = testNameDisplay
                        ? `${examName} – ${testNameDisplay}`
                        : examName;
                      
                      return (
                        <tr
                          key={test.id}
                          className="border-b last:border-none"
                        >
                          <td className="py-2">
                            {test.date}
                          </td>
                          <td className="font-medium">{examDisplay}</td>
                          <td
                            className={`font-semibold ${
                              test.score < 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {test.score}
                          </td>
                          <td className="text-xs text-slate-500">
                            {test.correct || 0}✓ / {test.wrong || 0}✗ / {test.skipped || 0}⊘
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Link
                href="/select-test"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Start New Test
              </Link>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function StatCard({ label, value, info, statsByType, statKey, getTestTypeName }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="bg-white border rounded-lg p-4 relative">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">
            {value}
          </p>
        </div>
        <div 
          className="relative ml-2"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <svg
            className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-help"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {showTooltip && (
            <div className="absolute right-0 top-6 z-50 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
              <p className="mb-1">{info}</p>
              {statsByType && statKey && Object.keys(statsByType).length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <p className="font-semibold mb-1">By Test Type:</p>
                  {Object.entries(statsByType).map(([type, stats]) => {
                    const displayName = getTestTypeName ? getTestTypeName(type) : type;
                    const displayValue = statKey === "accuracy" 
                      ? `${stats[statKey]}%`
                      : stats[statKey];
                    return (
                      <p key={type} className="text-xs">
                        {displayName}: {displayValue}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTooltip({ content }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dashboard information"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {showTooltip && (
        <div className="absolute right-0 top-10 z-50 w-80 p-4 bg-slate-900 text-white text-sm rounded-lg shadow-xl">
          {content}
        </div>
      )}
    </div>
  );
}
