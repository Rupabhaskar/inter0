"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import ProtectedRoute from "@/components/ProtectedRoute";

/* ================= CLOUDINARY IMAGE COMPONENT (next/image optimized) ================= */
function CloudinaryImage({ src, alt, type = "question", priority = false }) {
  const [error, setError] = useState(false);
  const width = type === "option" ? 300 : 500;
  const height = type === "option" ? 200 : 300;
  const optimizedSrc = useMemo(() => {
    if (src?.includes("cloudinary.com"))
      return src.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
    return src;
  }, [src, width]);

  if (!src || error) return null;

  const isCloudinary = src.includes("cloudinary.com");
  const sizeClasses =
    type === "option"
      ? "max-w-[200px] max-h-[120px]"
      : "max-w-[400px] max-h-[250px]";

  if (isCloudinary) {
    return (
      <div className={`relative inline-block ${sizeClasses}`}>
        <Image
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          className={`rounded border object-contain w-auto h-auto ${sizeClasses}`}
          priority={priority}
          unoptimized={false}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${sizeClasses}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- dynamic/error state image */}
      <img
        src={src}
        alt={alt}
        className={`rounded border object-contain w-auto h-auto ${sizeClasses}`}
        loading={priority ? "eager" : "lazy"}
        onError={() => setError(true)}
      />
    </div>
  );
}

const TESTS_COLLECTION = "superadminTests";

export default function ExamTestPage({ params }) {
  const { exam, test: testId } = use(params);
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [visited, setVisited] = useState(new Set());
  const [studentInfo, setStudentInfo] = useState({
    studentName: "",
    studentClass: "",
    collegeCode: null,
  });

  /* ================= LOAD TEST (server cache API + ID token) ================= */
  /* Wait for auth so refresh shows Loading... then Start button instead of blank */
  useEffect(() => {
    if (!testId) {
      setLoading(false);
      router.push("/select-test");
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        setLoading(false);
        router.push("/select-test");
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          `/api/exam-tests?testId=${encodeURIComponent(testId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (res.status === 404) {
            router.push("/select-test");
            return;
          }
          throw new Error(err.error || `API ${res.status}`);
        }
        const data = await res.json();
        if (!data.test || !data.questions?.length) {
          router.push("/select-test");
          return;
        }

        setTest(data.test);
        setQuestions(data.questions);
        setStudentInfo({
          studentName: data.studentName ?? "",
          studentClass: data.studentClass ?? "",
          collegeCode: data.collegeCode ?? null,
        });

        const questionsData = data.questions;
        const firstQ = questionsData[0];
        if (firstQ) {
          const imagesToPreload = [];
          if (firstQ.imageUrl) imagesToPreload.push(firstQ.imageUrl);
          if (firstQ.optionImages) {
            firstQ.optionImages.forEach((img) => {
              if (img) imagesToPreload.push(img);
            });
          }
          imagesToPreload.forEach((src) => {
            if (src?.includes("cloudinary.com")) {
              const optimized = src.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
              const img = new window.Image();
              img.src = optimized;
            }
          });
        }
      } catch (err) {
        console.error(err);
        router.push("/select-test");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [testId, router]);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!started || submitted || timeLeft <= 0 || isPaused) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft, submitted, isPaused]);

  /* ================= AUTO SUBMIT ================= */
  useEffect(() => {
    if (started && timeLeft === 0 && !submitted) submitTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submitTest intentionally excluded
  }, [timeLeft, started, submitted]);

  /* ================= FULLSCREEN DETECT ================= */
  useEffect(() => {
    const onFull = () => {
      const active = Boolean(document.fullscreenElement);
      if (!active && isFullscreen && started && !submitted) setIsPaused(true);
      setIsFullscreen(active);
    };
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, [isFullscreen, started, submitted]);

  /* ================= BLOCK KEYS ================= */
  useEffect(() => {
    const block = (e) => {
      if (
        e.key === "Escape" ||
        e.key === "F11" ||
        (e.altKey && e.key === "Tab") ||
        (e.ctrlKey && ["t", "w", "n", "c", "v", "x"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        alert("⚠️ Test environment locked.");
      }
    };
    const disable = (e) => e.preventDefault();
    window.addEventListener("keydown", block);
    document.addEventListener("contextmenu", disable);
    document.addEventListener("selectstart", disable);
    return () => {
      window.removeEventListener("keydown", block);
      document.removeEventListener("contextmenu", disable);
      document.removeEventListener("selectstart", disable);
    };
  }, []);

  const startTest = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setTimeLeft((test?.duration || 60) * 60);
      setStarted(true);
    } catch {
      alert("Fullscreen permission required");
    }
  };

  const resumeTest = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setIsPaused(false);
    } catch {
      alert("Fullscreen permission required to resume the test");
    }
  };

  /* ================= SUBMIT ================= */
  const submitTest = async () => {
    if (submitted || !test) return;
    setSubmitted(true);

    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    let score = 0;
    const correctCount = [];
    const wrongCount = [];
    const unattempted = [];

    questions.forEach((q, i) => {
      const userAnswer = answers[i];
      const correctAnswers = q.correctAnswers || [q.answer];

      if (
        userAnswer === undefined ||
        (Array.isArray(userAnswer) && userAnswer.length === 0)
      ) {
        unattempted.push(i + 1);
        return;
      }

      if (q.isMultiple) {
        const userArr = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        const correctArr = [...(correctAnswers || [])].sort();
        if (
          userArr.length === correctArr.length &&
          userArr.every((v, idx) => v === correctArr[idx])
        ) {
          score++;
          correctCount.push(i + 1);
        } else wrongCount.push(i + 1);
      } else {
        if (
          userAnswer === (correctAnswers?.[0] ?? q.answer) ||
          userAnswer === q.answer
        ) {
          score++;
          correctCount.push(i + 1);
        } else wrongCount.push(i + 1);
      }
    });

    const formattedAnswers = [];
    for (let i = 0; i < questions.length; i++) {
      const ans = answers[i];
      if (ans === undefined || ans === null) formattedAnswers.push(null);
      else if (Array.isArray(ans))
        formattedAnswers.push(ans.length > 0 ? ans.join(",") : null);
      else formattedAnswers.push(ans);
    }

    const studentName =
      studentInfo.studentName ||
      auth.currentUser?.displayName ||
      auth.currentUser?.email?.split("@")[0] ||
      "Student";
    const studentClass = studentInfo.studentClass ?? "";
    const collegeCode = studentInfo.collegeCode ?? null;

    const subjectWise = {};
    questions.forEach((q, i) => {
      const subject = (q.subject && String(q.subject).trim()) || "General";
      if (!subjectWise[subject]) {
        subjectWise[subject] = {
          score: 0,
          total: 0,
          answered: 0,
          unanswered: 0,
          correct: 0,
          wrong: 0,
          marked: 0,
        };
      }
      const entry = subjectWise[subject];
      entry.total += 1;
      if (markedForReview.has(i)) entry.marked += 1;
      const userAnswer = answers[i];
      const isUnanswered =
        userAnswer === undefined ||
        (Array.isArray(userAnswer) && userAnswer.length === 0);
      if (isUnanswered) {
        entry.unanswered += 1;
        return;
      }
      entry.answered += 1;
      const correctAnswers = q.correctAnswers || [q.answer];
      let isCorrect = false;
      if (q.isMultiple) {
        const userArr = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
        const correctArr = [...(correctAnswers || [])].sort();
        isCorrect =
          userArr.length === correctArr.length &&
          userArr.every((v, idx) => v === correctArr[idx]);
      } else {
        isCorrect =
          userAnswer === correctAnswers?.[0] || userAnswer === q.answer;
      }
      if (isCorrect) {
        entry.score += 1;
        entry.correct += 1;
      } else entry.wrong += 1;
    });

    const resultData = {
      uid: auth.currentUser?.uid,
      studentName,
      class: studentClass,
      testId,
      testSource: TESTS_COLLECTION,
      score,
      total: questions.length,
      answers: formattedAnswers,
      testType: test.testType || "",
      subjectWise,
      submittedAt: new Date(),
    };
    if (collegeCode && String(collegeCode).trim()) {
      const code = String(collegeCode).trim();
      await addDoc(collection(db, "results", "byCollege", code), resultData);
    } else {
      await addDoc(collection(db, "results"), resultData);
    }

    setFinalScore({
      score,
      total: questions.length,
      correct: correctCount.length,
      wrong: wrongCount.length,
      unattempted: unattempted.length,
      percentage: Math.round((score / questions.length) * 100),
      timeTaken: (test.duration || 60) * 60 - timeLeft,
    });
  };

  /* ================= PRELOAD IMAGES ================= */
  useEffect(() => {
    if (!questions.length || !started) return;
    const preloadImages = [];
    for (let i = 1; i <= 2; i++) {
      const nextIdx = current + i;
      if (nextIdx < questions.length) {
        const nextQ = questions[nextIdx];
        if (nextQ.imageUrl) preloadImages.push(nextQ.imageUrl);
        if (nextQ.optionImages)
          nextQ.optionImages.forEach((img) => img && preloadImages.push(img));
      }
    }
    preloadImages.forEach((src) => {
      if (src?.includes("cloudinary.com")) {
        const optimized = src.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
        const img = new window.Image();
        img.src = optimized;
      }
    });
  }, [current, questions, started]);

  /* ================= SUBJECT FILTER ================= */
  const subjects = useMemo(() => {
    const unique = [
      ...new Set(questions.map((q) => q.subject).filter((s) => s && s !== "")),
    ];
    return unique.sort();
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (!selectedSubject) return questions;
    return questions.filter((q) => q.subject === selectedSubject);
  }, [questions, selectedSubject]);

  const getOriginalIndex = (filteredIndex) => {
    if (filteredIndex < 0 || filteredIndex >= filteredQuestions.length) return 0;
    const filteredQ = filteredQuestions[filteredIndex];
    return questions.findIndex((q) => q.id === filteredQ.id);
  };

  useEffect(() => {
    if (selectedSubject && filteredQuestions.length > 0) setCurrent(0);
    else if (!selectedSubject) setCurrent(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset current on subject change only
  }, [selectedSubject]);

  useEffect(() => {
    if (
      filteredQuestions.length > 0 &&
      current >= 0 &&
      current < filteredQuestions.length
    ) {
      const originalIndex = getOriginalIndex(current);
      setVisited((prev) => new Set([...prev, originalIndex]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track visited on current change only
  }, [current]);

  const navigateToSubject = (subject) => {
    setSelectedSubject(subject);
    setCurrent(0);
  };

  const toggleMarkForReview = () => {
    const originalIndex = getOriginalIndex(current);
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(originalIndex)) next.delete(originalIndex);
      else next.add(originalIndex);
      return next;
    });
  };

  const unanswerQuestion = () => {
    const originalIndex = getOriginalIndex(current);
    const a = [...answers];
    a[originalIndex] = undefined;
    setAnswers(a);
  };

  const getQuestionState = (originalIndex) => {
    const isAnswered = answers[originalIndex] !== undefined;
    const isMarked = markedForReview.has(originalIndex);
    const isVisited = visited.has(originalIndex);
    if (isAnswered && isMarked) return "answered-marked";
    if (isMarked) return "marked";
    if (isAnswered) return "answered";
    if (isVisited && !isAnswered) return "unanswered";
    return "not-visited";
  };

  if (loading) return <div className="p-10">Loading...</div>;
  if (!test) return null;

  /* ================= SCORE CARD ================= */
  if (submitted && finalScore) {
    const getGrade = (p) => {
      if (p >= 90) return { grade: "A+", color: "text-green-600", bg: "bg-green-100" };
      if (p >= 80) return { grade: "A", color: "text-green-500", bg: "bg-green-50" };
      if (p >= 70) return { grade: "B+", color: "text-blue-600", bg: "bg-blue-100" };
      if (p >= 60) return { grade: "B", color: "text-blue-500", bg: "bg-blue-50" };
      if (p >= 50) return { grade: "C", color: "text-yellow-600", bg: "bg-yellow-100" };
      if (p >= 40) return { grade: "D", color: "text-orange-500", bg: "bg-orange-50" };
      return { grade: "F", color: "text-red-600", bg: "bg-red-100" };
    };
    const gradeInfo = getGrade(finalScore.percentage);
    const formatTime = (s) =>
      `${Math.floor(s / 60)}m ${s % 60}s`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className={`${gradeInfo.bg} p-6 text-center`}>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Test Completed!</h1>
            <p className="text-gray-600">{test.name}</p>
          </div>
          <div className="flex justify-center -mt-8">
            <div
              className={`w-32 h-32 rounded-full ${gradeInfo.bg} border-4 border-white shadow-lg flex flex-col items-center justify-center`}
            >
              <span className={`text-4xl font-bold ${gradeInfo.color}`}>
                {finalScore.percentage}%
              </span>
              <span className={`text-lg font-semibold ${gradeInfo.color}`}>
                Grade {gradeInfo.grade}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-gray-800">
                {finalScore.score}{" "}
                <span className="text-gray-400 text-xl">/ {finalScore.total}</span>
              </p>
              <p className="text-gray-500">Questions Correct</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{finalScore.correct}</div>
                <div className="text-sm text-green-700">Correct</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{finalScore.wrong}</div>
                <div className="text-sm text-red-700">Wrong</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{finalScore.unattempted}</div>
                <div className="text-sm text-gray-700">Skipped</div>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center justify-between">
              <span className="text-blue-700 font-medium">Time Taken</span>
              <span className="text-blue-600 font-bold">
                {formatTime(finalScore.timeTaken)}
              </span>
            </div>
            <button
              onClick={() => router.push("/select-test")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= FULLSCREEN GATE ================= */
  if (!isFullscreen) {
    if (isPaused && started && !submitted) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded shadow text-center max-w-md">
            <div className="text-6xl mb-4">⏸️</div>
            <h2 className="text-xl font-bold mb-2 text-orange-600">Test Paused</h2>
            <p className="text-gray-600 mb-4">
              You exited fullscreen. Time remaining:{" "}
              <span className="font-bold text-red-600">
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </p>
            <button
              onClick={resumeTest}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Resume Test
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow text-center">
          <h2 className="text-xl font-bold mb-4">Fullscreen Required</h2>
          <p className="text-gray-600 mb-4">{test.name}</p>
          <button
            onClick={startTest}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            Enter Fullscreen & Start Test
          </button>
        </div>
      </div>
    );
  }

  /* ================= TEST UI ================= */
  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
        {subjects.length > 0 && (
          <div className="bg-white border rounded-lg mb-4 p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigateToSubject("")}
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded font-medium text-sm sm:text-base ${
                    !selectedSubject
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <span>All</span>
                    <span className="text-xs font-semibold">{questions.length}</span>
                  </div>
                </button>
                {subjects.map((subj) => {
                  const subjectQuestions = questions.filter((q) => q.subject === subj);
                  const isActive = selectedSubject === subj;
                  return (
                    <button
                      key={subj}
                      onClick={() => navigateToSubject(subj)}
                      className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded font-medium text-sm sm:text-base ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex flex-col items-center min-w-[60px] sm:min-w-[80px]">
                        <span className="font-semibold">{subj}</span>
                        <span className="text-xs font-bold">{subjectQuestions.length}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <span className="text-xs sm:text-sm text-gray-600 font-medium">Time:</span>
                <span className="text-red-600 font-bold text-lg sm:text-xl">
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-3 bg-white p-4 sm:p-6 border rounded">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">{test.name}</h2>
            </div>

            {filteredQuestions.length > 0 ? (
              <>
                <p className="font-medium text-lg">
                  {current + 1}.{" "}
                  {filteredQuestions[current].text ||
                    filteredQuestions[current].question}
                  {filteredQuestions[current].subject && (
                    <span className="ml-2 text-sm text-blue-600 font-normal">
                      ({filteredQuestions[current].subject})
                    </span>
                  )}
                </p>

                {filteredQuestions[current].imageUrl && (
                  <div className="my-4">
                    <CloudinaryImage
                      src={filteredQuestions[current].imageUrl}
                      alt={`Question ${current + 1}`}
                      type="question"
                      priority={true}
                    />
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {filteredQuestions[current].options?.map((opt, i) => {
                    const originalIndex = getOriginalIndex(current);
                    return (
                      <label
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answers[originalIndex] === i
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type={
                            filteredQuestions[current].isMultiple
                              ? "checkbox"
                              : "radio"
                          }
                          name={`question-${current}`}
                          checked={
                            filteredQuestions[current].isMultiple
                              ? (answers[originalIndex] || []).includes(i)
                              : answers[originalIndex] === i
                          }
                          onChange={() => {
                            const a = [...answers];
                            if (filteredQuestions[current].isMultiple) {
                              const currentAnswers = a[originalIndex] || [];
                              if (currentAnswers.includes(i))
                                a[originalIndex] = currentAnswers.filter(
                                  (x) => x !== i
                                );
                              else
                                a[originalIndex] = [...currentAnswers, i];
                            } else a[originalIndex] = i;
                            setAnswers(a);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-700">
                            {String.fromCharCode(65 + i)}.
                          </span>{" "}
                          {opt}
                          {filteredQuestions[current].optionImages?.[i] && (
                            <div className="mt-2">
                              <CloudinaryImage
                                src={
                                  filteredQuestions[current].optionImages[i]
                                }
                                alt={`Option ${String.fromCharCode(65 + i)}`}
                                type="option"
                              />
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 mt-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <button
                    onClick={toggleMarkForReview}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded font-medium text-sm sm:text-base ${
                      markedForReview.has(getOriginalIndex(current))
                        ? "bg-pink-600 text-white"
                        : "bg-white border border-pink-300 text-pink-600 hover:bg-pink-50"
                    }`}
                  >
                    {markedForReview.has(getOriginalIndex(current))
                      ? "✓ Marked"
                      : "Mark for Review"}
                  </button>
                  <button
                    onClick={unanswerQuestion}
                    disabled={answers[getOriginalIndex(current)] === undefined}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    Unanswer
                  </button>
                </div>

                <div className="flex justify-between mt-4 sm:mt-6 gap-2">
                  <button
                    disabled={current === 0}
                    onClick={() => setCurrent(current - 1)}
                    className="px-3 py-2 sm:px-4 sm:py-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm sm:text-base"
                  >
                    ← Prev
                  </button>
                  {current === filteredQuestions.length - 1 ? (
                    <button
                      onClick={submitTest}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded font-medium text-sm sm:text-base"
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrent(current + 1)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded font-medium text-sm sm:text-base"
                    >
                      Next →
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No questions found for the selected subject.
              </div>
            )}
          </div>

          <div className="bg-white p-3 sm:p-4 border rounded shadow-sm sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3">
              Question Palette
              {selectedSubject && (
                <span className="text-xs text-gray-500 block mt-1 font-normal">
                  ({filteredQuestions.length} of {questions.length})
                </span>
              )}
            </h3>
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-600 border border-blue-800 flex-shrink-0" />
                <span className="truncate">Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500 flex-shrink-0" />
                <span className="truncate">Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-pink-500 flex-shrink-0" />
                <span className="truncate">Marked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-purple-500 flex-shrink-0" />
                <span className="truncate">Both</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-500 flex-shrink-0" />
                <span className="truncate">Unanswered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gray-200 border border-gray-300 flex-shrink-0" />
                <span className="truncate">Not Visited</span>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5 sm:gap-2 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
              {filteredQuestions.map((q, i) => {
                const originalIndex = questions.findIndex(
                  (origQ) => origQ.id === q.id
                );
                const state = getQuestionState(originalIndex);
                const isCurrent = current === i;
                let buttonClass =
                  "p-1.5 sm:p-2 rounded text-xs sm:text-sm font-medium border-2 transition-all ";
                if (isCurrent)
                  buttonClass +=
                    "bg-blue-600 text-white border-blue-800 shadow-lg scale-105";
                else {
                  switch (state) {
                    case "answered-marked":
                      buttonClass += "bg-purple-500 text-white border-purple-700";
                      break;
                    case "marked":
                      buttonClass += "bg-pink-500 text-white border-pink-700";
                      break;
                    case "answered":
                      buttonClass += "bg-green-500 text-white border-green-700";
                      break;
                    case "unanswered":
                      buttonClass += "bg-red-500 text-white border-red-700";
                      break;
                    default:
                      buttonClass += "bg-gray-200 text-gray-700 border-gray-300";
                  }
                }
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrent(i)}
                    className={buttonClass}
                    title={`Q${i + 1}${q.subject ? ` - ${q.subject}` : ""} - ${state.replace("-", " ")}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 sm:mt-4 pt-3 border-t">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded text-center">
                  <div className="font-bold text-blue-700 text-sm sm:text-base">
                    {filteredQuestions.length}
                  </div>
                  <div className="text-blue-600">Total</div>
                </div>
                <div className="bg-green-50 p-2 rounded text-center">
                  <div className="font-bold text-green-700 text-sm sm:text-base">
                    {
                      filteredQuestions.filter((q) => {
                        const origIdx = questions.findIndex(
                          (origQ) => origQ.id === q.id
                        );
                        return answers[origIdx] !== undefined;
                      }).length
                    }
                  </div>
                  <div className="text-green-600">Answered</div>
                </div>
                <div className="bg-red-50 p-2 rounded text-center">
                  <div className="font-bold text-red-700 text-sm sm:text-base">
                    {
                      filteredQuestions.filter((q) => {
                        const origIdx = questions.findIndex(
                          (origQ) => origQ.id === q.id
                        );
                        return answers[origIdx] === undefined;
                      }).length
                    }
                  </div>
                  <div className="text-red-600">Unanswered</div>
                </div>
                <div className="bg-pink-50 p-2 rounded text-center">
                  <div className="font-bold text-pink-700 text-sm sm:text-base">
                    {
                      filteredQuestions.filter((q) => {
                        const origIdx = questions.findIndex(
                          (origQ) => origQ.id === q.id
                        );
                        return markedForReview.has(origIdx);
                      }).length
                    }
                  </div>
                  <div className="text-pink-600">Marked</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
