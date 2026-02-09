import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

const TESTS_COLLECTION = "superadminTests";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STUDENT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const allTestsCache = { data: null, fetchedAt: 0 };
const testQuestionsCache = new Map(); // testId -> { test, questions, fetchedAt }
const studentCache = new Map(); // uid -> { collegeCode, studentName, studentClass, fetchedAt }

function testTypeMatchesExam(testType, examSlug) {
  if (!testType || !examSlug) return false;
  const normalized = (t) =>
    String(t)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  const examLabel = examSlug.replace(/-/g, " ");
  const a = normalized(testType);
  const b = normalized(examLabel);
  if (b === "jee advanced") {
    return a.includes("advanced") || a.includes("advance");
  }
  if (b === "jee mains") {
    return (a.includes("jee") || a.includes("mains")) && !a.includes("advanced");
  }
  return a === b || a.includes(b) || b.includes(a);
}

function getCachedStudent(uid) {
  const entry = studentCache.get(uid);
  if (!entry || Date.now() - entry.fetchedAt > STUDENT_CACHE_TTL_MS) return null;
  return entry;
}

function setCachedStudent(uid, collegeCode, studentName, studentClass) {
  studentCache.set(uid, {
    collegeCode,
    studentName,
    studentClass,
    fetchedAt: Date.now(),
  });
}

async function getStudentByUid(uid) {
  const cached = getCachedStudent(uid);
  if (cached) return cached;

  const idsGroup = adminDb.collectionGroup("ids");
  const snapshot = await idsGroup.where("uid", "==", uid).limit(1).get();
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const data = doc.data();
    const collegeCode =
      data.college != null && String(data.college).trim() !== ""
        ? String(data.college).trim()
        : doc.ref.parent.parent.id;
    const studentName = data.name != null ? String(data.name).trim() : "";
    const studentClass =
      data.course != null && String(data.course).trim() !== ""
        ? String(data.course).trim()
        : data.class != null
          ? String(data.class).trim()
          : "";
    setCachedStudent(uid, collegeCode, studentName, studentClass);
    return { collegeCode, studentName, studentClass };
  }

  const legacyRef = adminDb.collection("students");
  const legacySnap = await legacyRef.where("uid", "==", uid).limit(1).get();
  if (!legacySnap.empty) {
    const s = legacySnap.docs[0].data();
    const studentName = s?.name != null ? String(s.name).trim() : "";
    const studentClass = s?.course ?? s?.class ?? "";
    setCachedStudent(uid, null, studentName, studentClass);
    return { collegeCode: null, studentName, studentClass };
  }

  setCachedStudent(uid, null, "", "");
  return { collegeCode: null, studentName: "", studentClass: "" };
}

async function getAllTests() {
  if (
    allTestsCache.data &&
    Date.now() - allTestsCache.fetchedAt <= CACHE_TTL_MS
  ) {
    return allTestsCache.data;
  }
  const snap = await adminDb.collection(TESTS_COLLECTION).get();
  const tests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  allTestsCache.data = tests;
  allTestsCache.fetchedAt = Date.now();
  return tests;
}

function getCachedTestAndQuestions(testId) {
  const entry = testQuestionsCache.get(testId);
  if (!entry || Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return { test: entry.test, questions: entry.questions };
}

function setCachedTestAndQuestions(testId, test, questions) {
  testQuestionsCache.set(testId, { test, questions, fetchedAt: Date.now() });
}

/**
 * GET /api/exam-tests?exam=jee-mains
 *   -> { tests } (filtered by exam)
 * GET /api/exam-tests?testId=xyz
 *   -> { test, questions, studentName, studentClass, collegeCode }
 * Header: Authorization: Bearer <firebaseIdToken>
 */
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    let uid;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const exam = searchParams.get("exam")?.trim() || null;
    const testId = searchParams.get("testId")?.trim() || null;

    // List: filter by exam
    if (!testId) {
      if (!exam) {
        return NextResponse.json(
          { error: "Query parameter 'exam' is required for tests list" },
          { status: 400 }
        );
      }
      const all = await getAllTests();
      const filtered = all.filter((t) => testTypeMatchesExam(t.testType, exam));
      return NextResponse.json({ tests: filtered });
    }

    // Single test + questions + student info
    const cached = getCachedTestAndQuestions(testId);
    let test;
    let questions;

    if (cached) {
      test = cached.test;
      questions = cached.questions;
    } else {
      const testRef = adminDb.collection(TESTS_COLLECTION).doc(testId);
      const questionsRef = testRef.collection("questions");
      const [testSnap, qSnap] = await Promise.all([
        testRef.get(),
        questionsRef.get(),
      ]);
      if (!testSnap.exists) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }
      test = testSnap.data();
      questions = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCachedTestAndQuestions(testId, test, questions);
    }

    const student = await getStudentByUid(uid);
    const studentName = student.studentName || "Student";
    const studentClass = student.studentClass ?? "";
    const collegeCode = student.collegeCode ?? null;

    return NextResponse.json({
      test,
      questions,
      studentName,
      studentClass,
      collegeCode,
    });
  } catch (err) {
    console.error("Exam tests API error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
