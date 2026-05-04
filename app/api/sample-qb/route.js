export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminQuestionDb } from "@/lib/firebaseAdminQuestionDb";

const DEFAULT_BATCH = 10;
const MAX_SCAN = 1200;
const MAX_SUBJECT_SCAN = 400;

function normalizeQuestion(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    path: doc.ref.path,
    subject: String(data.subject || "").trim() || "General",
    topic: String(data.topic || "").trim() || "General",
    text: String(data.text || data.question || "").trim(),
    options: Array.isArray(data.options) ? data.options.slice(0, 4) : [],
  };
}

function pickRandom(items, count) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.max(0, count));
}

export async function GET(request) {
  try {
    const db = getAdminQuestionDb();
    if (!db) {
      return NextResponse.json(
        { error: "Question DB is not configured on server." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const subject = String(searchParams.get("subject") || "").trim();
    const perSubject = Math.min(
      20,
      Math.max(1, Number(searchParams.get("limit") || DEFAULT_BATCH))
    );
    const exclude = String(searchParams.get("exclude") || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const excludeSet = new Set(exclude);

    if (subject) {
      const snap = await db
        .collectionGroup("questions")
        .where("subject", "==", subject)
        .limit(MAX_SUBJECT_SCAN)
        .get();

      const candidates = snap.docs
        .map(normalizeQuestion)
        .filter((q) => q.text && !excludeSet.has(q.path));
      const picked = pickRandom(candidates, perSubject);

      return NextResponse.json({
        subject,
        questions: picked,
        hasMore: candidates.length > picked.length,
      });
    }

    const allSnap = await db.collectionGroup("questions").limit(MAX_SCAN).get();
    const grouped = new Map();

    allSnap.docs.forEach((d) => {
      const q = normalizeQuestion(d);
      if (!q.text) return;
      if (!grouped.has(q.subject)) grouped.set(q.subject, []);
      grouped.get(q.subject).push(q);
    });

    const subjects = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));
    const result = subjects.map((subj) => {
      const all = grouped.get(subj) || [];
      const picked = pickRandom(all, perSubject);
      return {
        subject: subj,
        questions: picked,
        hasMore: all.length > picked.length,
      };
    });

    return NextResponse.json({ subjects: result });
  } catch (error) {
    console.error("Sample QB API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load sample question bank" },
      { status: 500 }
    );
  }
}
