"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Timer from "../../../../components/Timer";
import QuestionCard from "../../../../components/QuestionCard";
import QuestionPalette from "../../../../components/QuestionPalette";
import { questionsData } from "../../../../data/questions";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function TestPage({ params }) {
  const { exam, test } = use(params);
  const router = useRouter();
  const questions = questionsData?.[exam]?.[test];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);




 useEffect(() => {
  // ❌ Disable text selection
  const preventSelect = (e) => e.preventDefault();

  // ❌ Disable right click
  const preventContextMenu = (e) => e.preventDefault();

  // ❌ Disable copy shortcuts
  const preventKeys = (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      ["c", "x", "a", "v"].includes(e.key.toLowerCase())
    ) {
      e.preventDefault();
    }
  };

  document.addEventListener("selectstart", preventSelect);
  document.addEventListener("contextmenu", preventContextMenu);
  document.addEventListener("keydown", preventKeys);

  return () => {
    document.removeEventListener("selectstart", preventSelect);
    document.removeEventListener("contextmenu", preventContextMenu);
    document.removeEventListener("keydown", preventKeys);
  };
}, []);



  // ❌ Redirect if test not found
  useEffect(() => {
    if (!questions) router.push("/select-test");
  }, [questions, router]);

  // 🔐 Fullscreen change detection
  useEffect(() => {
    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);

      if (!active) {
        alert(
          "⚠️ Fullscreen exited.\nThe test is locked until fullscreen is restored."
        );
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (!questions) return null;

  // ▶ MUST be user action
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      alert("Fullscreen permission required to start the test.");
    }
  };

  // 🧾 Submit
  const submitTest = () => {
    localStorage.setItem(
      "testResult",
      JSON.stringify({ exam, test, answers })
    );
    router.push("/result");
  };

  // 🟥 BLOCKED SCREEN (NO FULLSCREEN = NO TEST)
  if (!isFullscreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow text-center max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Fullscreen Required</h1>
          <p className="text-gray-600 mb-6">
            You must be in fullscreen mode to take this test.
          </p>

          <button
            onClick={enterFullscreen}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Enter Fullscreen & Start Test
          </button>
        </div>
      </div>
    );
  }

  // 🟩 TEST SCREEN (ONLY IF FULLSCREEN)
  return (
    <ProtectedRoute>
    <div className="no-select max-w-7xl mx-auto p-6 grid md:grid-cols-4 gap-6">
      {/* MAIN QUESTION AREA */}
      <div className="md:col-span-3 bg-white p-6 border rounded">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold">
            {exam.replace("-", " ").toUpperCase()} –{" "}
            {test.replace("-", " ").toUpperCase()}
          </h2>

          <Timer duration={1800} onExpire={submitTest} />
        </div>

        <QuestionCard
          question={questions[current]}
          selected={answers[current]}
          onSelect={(optIndex) => {
            const updated = [...answers];
            updated[current] = optIndex;
            setAnswers(updated);
          }}
        />

        <div className="flex justify-between mt-6">
          <button
            disabled={current === 0}
            onClick={() => setCurrent(current - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>

          {current === questions.length - 1 ? (
            <button
              onClick={submitTest}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Submit Test
            </button>
          ) : (
            <button
              onClick={() => setCurrent(current + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Save & Next
            </button>
          )}
        </div>
      </div>

      {/* QUESTION PALETTE */}
      <div className="bg-white p-4 border rounded">
        <h3 className="font-semibold mb-3">Question Palette</h3>
        <QuestionPalette
          questions={questions}
          current={current}
          answers={answers}
          setCurrent={setCurrent}
        />
      </div>
    </div>
    </ProtectedRoute>
  );
}
