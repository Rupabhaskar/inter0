"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { calculateResult } from "@/lib/calculateResult";
import { questionsData } from "../../data/questions";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const savedRef = useRef(false); // ✅ prevent duplicate save

  useEffect(() => {
    const stored = localStorage.getItem("testResult");

    if (!stored) {
      router.push("/select-test");
      return;
    }

    const { exam, test, answers } = JSON.parse(stored);
    const questions = questionsData?.[exam]?.[test];

    if (!questions) {
      router.push("/select-test");
      return;
    }

    const calculated = calculateResult(questions, answers);
    queueMicrotask(() => setResult(calculated));

    // ⏱ Countdown
    const interval = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);

    // 🔁 Auto redirect
      const redirect = setTimeout(async () => {
        // 🚪 Exit fullscreen if active
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }

        router.push("/select-test");
      }, 10000);


    return () => {
      clearInterval(interval);
      clearTimeout(redirect);
    };
  }, [router]);

  // 💾 Save result to Firebase (ONCE)
  useEffect(() => {
    const saveResult = async () => {
      if (!result || savedRef.current) return;
      savedRef.current = true;

      const user = auth.currentUser;
      if (!user) return;

      // 🔍 Fetch student data
      const studentSnap = await getDoc(
        doc(db, "students", user.uid)
      );

      const studentData = studentSnap.exists() ? studentSnap.data() : {};
      const studentName = studentData.name || "Unknown";
      const studentClass = studentData.course || studentData.class || "";

      const { exam, test } = JSON.parse(localStorage.getItem("testResult"));
      const subject = `${exam} - ${test}`;

      await addDoc(collection(db, "results"), {
        studentId: user.uid,
        studentName,
        class: studentClass,
        subject,
        exam,
        test,
        score: result.score,
        total: result.total * 4,
        marks: result.score, // For compatibility with leaderboard
        correct: result.correct,
        wrong: result.wrong,
        skipped: result.skipped,
        createdAt: serverTimestamp(),
      });
    };

    saveResult();
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Calculating result...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute>
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-lg border text-center w-80 shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Test Result</h2>

        <p className="text-lg">
          Score:{" "}
          <span className="font-bold text-green-600">
            {result.score}
          </span>{" "}
          / {result.total * 4}
        </p>

        <div className="mt-4 space-y-1 text-sm">
          <p className="text-green-600">Correct: {result.correct}</p>
          <p className="text-red-600">Wrong: {result.wrong}</p>
          <p className="text-yellow-600">Skipped: {result.skipped}</p>
        </div>

        <p className="text-sm text-slate-500 mt-6">
          Redirecting in{" "}
          <span className="font-bold text-blue-600">
            {timeLeft}
          </span>{" "}
          seconds...
        </p>
      </div>
    </div>
    </ProtectedRoute>
  );
}
