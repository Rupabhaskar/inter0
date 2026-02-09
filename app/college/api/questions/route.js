import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { adminQuestionDb } from "@/lib/firebaseAdminQuestionDb";

// In-memory caches to reduce Firestore reads
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for tests/questions
const STUDENT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes for uid -> student info

const testsListCache = new Map(); // key: collegeCode -> { data, fetchedAt }
const testQuestionsCache = new Map(); // key: "collegeCode:testId" -> { test, questions, fetchedAt }
const studentCache = new Map(); // key: uid -> { collegeCode, studentName, studentClass, fetchedAt }

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
  if (snapshot.empty) return null;

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

function getCachedTests(collegeCode) {
  const entry = testsListCache.get(collegeCode);
  if (!entry || Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.data;
}

function setCachedTests(collegeCode, tests) {
  testsListCache.set(collegeCode, { data: tests, fetchedAt: Date.now() });
}

function getCachedTestAndQuestions(collegeCode, testId) {
  const key = `${collegeCode}:${testId}`;
  const entry = testQuestionsCache.get(key);
  if (!entry || Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return { test: entry.test, questions: entry.questions };
}

function setCachedTestAndQuestions(collegeCode, testId, test, questions) {
  testQuestionsCache.set(`${collegeCode}:${testId}`, {
    test,
    questions,
    fetchedAt: Date.now(),
  });
}

/**
 * GET /college/api/questions
 * Query: testId (optional). If omitted, returns tests list for the student's college.
 * Headers: Authorization: Bearer <firebaseIdToken>
 * Response: { tests } or { test, questions, studentName, studentClass, collegeCode }
 */
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    let uid;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const student = await getStudentByUid(uid);
    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId")?.trim() || null;

    // Tests list (no testId)
    if (!testId) {
      const cached = getCachedTests(student.collegeCode);
      let tests = cached;

      if (!tests) {
        if (!adminQuestionDb) {
          return NextResponse.json(
            { error: "Question DB not configured (QUESTION_DB_* env)" },
            { status: 503 }
          );
        }
        const colRef = adminQuestionDb.collection(student.collegeCode);
        const snapshot = await colRef.get();
        tests = snapshot.docs.map((d) => {
          const { name, duration, testType } = d.data();
          return { id: d.id, name, duration, testType };
        });
        setCachedTests(student.collegeCode, tests);
      }

      // Submitted test IDs from main db (one read per request; could be cached separately if needed)
      const resultsRef = adminDb
        .collection("results")
        .doc("byCollege")
        .collection(student.collegeCode);
      const resultsSnap = await resultsRef.where("uid", "==", uid).get();
      const submittedTestIds = resultsSnap.empty
        ? []
        : resultsSnap.docs.map((d) => d.data().testId).filter(Boolean);

      return NextResponse.json({
        tests,
        submittedTestIds,
        fromCache: !!cached,
      });
    }

    // Single test + questions
    const cached = getCachedTestAndQuestions(student.collegeCode, testId);
    if (cached) {
      return NextResponse.json({
        test: cached.test,
        questions: cached.questions,
        studentName: student.studentName,
        studentClass: student.studentClass,
        collegeCode: student.collegeCode,
        fromCache: true,
      });
    }

    if (!adminQuestionDb) {
      return NextResponse.json(
        { error: "Question DB not configured (QUESTION_DB_* env)" },
        { status: 503 }
      );
    }

    const testRef = adminQuestionDb
      .collection(student.collegeCode)
      .doc(testId);
    const questionsRef = testRef.collection("questions");

    const [testSnap, questionsSnap] = await Promise.all([
      testRef.get(),
      questionsRef.get(),
    ]);

    if (!testSnap.exists) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const test = testSnap.data();
    const questions = questionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setCachedTestAndQuestions(student.collegeCode, testId, test, questions);

    return NextResponse.json({
      test,
      questions,
      studentName: student.studentName,
      studentClass: student.studentClass,
      collegeCode: student.collegeCode,
      fromCache: false,
    });
  } catch (err) {
    console.error("Questions API error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
