import { NextResponse } from "next/server";
import { getAdminQuestionDb } from "@/lib/firebaseAdminQuestionDb";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

const TIMESTAMP = admin.firestore.FieldValue.serverTimestamp;
const FieldPath = admin.firestore.FieldPath;

const DEFAULT_QUESTION_PAGE_SIZE = 80;
const MAX_QUESTION_PAGE_SIZE = 250;

function encodeQuestionCursor(lastDocPath) {
  if (!lastDocPath) return null;
  return Buffer.from(JSON.stringify({ p: lastDocPath }), "utf8").toString("base64url");
}

function decodeQuestionCursor(cursorParam) {
  if (!cursorParam) return null;
  try {
    const raw = Buffer.from(cursorParam, "base64url").toString("utf8");
    const obj = JSON.parse(raw);
    return typeof obj?.p === "string" ? obj.p : null;
  } catch {
    return null;
  }
}

function isLegacyQuestionTopDoc(docSnap) {
  const d = docSnap.data() || {};
  if (typeof d.text === "string" && d.text.trim()) return true;
  if (Array.isArray(d.options) && d.options.length >= 2) return true;
  return false;
}

function isTopicHubTopDoc(docSnap) {
  const d = docSnap.data() || {};
  return Boolean(String(d.topic || "").trim()) && !isLegacyQuestionTopDoc(docSnap);
}

async function tryCollectionGroupQuestionPage(questionDb, subjectId, nestedLimit, cursorPath, topicSlug) {
  if (nestedLimit <= 0) {
    return { docs: [], lastPath: null, usedCollectionGroup: true };
  }

  if (topicSlug) {
    let q = questionDb
      .collection("QuestionBank")
      .doc(subjectId)
      .collection("questions")
      .doc(topicSlug)
      .collection("id")
      .orderBy(FieldPath.documentId())
      .limit(nestedLimit);

    if (cursorPath) {
      const cur = await questionDb.doc(cursorPath).get();
      if (cur.exists) q = q.startAfter(cur);
    }
    const snap = await q.get();
    const docs = snap.docs;
    const lastPath = snap.size === nestedLimit ? docs[docs.length - 1].ref.path : null;
    return { docs, lastPath, usedCollectionGroup: true };
  }

  let q = questionDb
    .collectionGroup("id")
    .where("subjectId", "==", subjectId)
    .orderBy(FieldPath.documentId())
    .limit(nestedLimit);

  if (cursorPath) {
    const cur = await questionDb.doc(cursorPath).get();
    if (cur.exists) q = q.startAfter(cur);
  }

  const snap = await q.get();
  const docs = snap.docs;
  const lastPath = snap.size === nestedLimit ? docs[docs.length - 1].ref.path : null;
  return { docs, lastPath, usedCollectionGroup: true };
}

async function loadAllQuestionsLegacyPath(questionDb, subjectId) {
  const questionsRef = questionDb.collection("QuestionBank").doc(subjectId).collection("questions");
  const legacyOrTopicsSnap = await questionsRef.get();
  if (legacyOrTopicsSnap.empty) {
    return { questions: [], topicsMeta: [] };
  }

  const byId = new Map();
  const nestedSnaps = await Promise.all(
    legacyOrTopicsSnap.docs.map((docSnap) => docSnap.ref.collection("id").get())
  );

  legacyOrTopicsSnap.docs.forEach((docSnap, i) => {
    const nestedIdsSnap = nestedSnaps[i];
    if (!nestedIdsSnap.empty) {
      nestedIdsSnap.docs.forEach((qDoc) => {
        byId.set(qDoc.id, serializeDoc(qDoc));
      });
    } else if (!byId.has(docSnap.id)) {
      byId.set(docSnap.id, serializeDoc(docSnap));
    }
  });

  if (byId.size === 0) {
    try {
      const recovery = await questionDb
        .collectionGroup("id")
        .where("subjectId", "==", subjectId)
        .limit(5000)
        .get();
      recovery.docs.forEach((docSnap) => {
        byId.set(docSnap.id, serializeDoc(docSnap));
      });
    } catch (err) {
      console.warn("QuestionBank recovery read skipped:", err?.message || err);
    }
  }

  const sortedTop = [...legacyOrTopicsSnap.docs].sort((a, b) => a.id.localeCompare(b.id));
  const topicsMeta = sortedTop
    .filter((d) => isTopicHubTopDoc(d))
    .map((d) => {
      const data = d.data() || {};
      return { id: d.id, name: String(data.topic || d.id) };
    });

  return { questions: Array.from(byId.values()), topicsMeta };
}

function getQuestionDbOrResponse() {
  const questionDb = getAdminQuestionDb() || adminDb;
  if (!questionDb) {
    return {
      error: NextResponse.json(
        {
          error:
            "QuestionsDB is not configured (QUESTION_DB_* env missing) and main Admin DB fallback is unavailable.",
        },
        { status: 503 }
      ),
      questionDb: null,
    };
  }
  return { questionDb, error: null };
}

function subjectDocIdFromName(subjectName) {
  return String(subjectName || "")
    .trim()
    .toLowerCase()
    .replace(/[\/\\]/g, "-")
    .replace(/\s+/g, "-");
}

function serializeDoc(docSnap) {
  const data = docSnap.data() || {};
  return { id: docSnap.id, ...data };
}

function topicDocIdFromName(topicName) {
  return String(topicName || "")
    .trim()
    .toLowerCase()
    .replace(/[\/\\]/g, "-")
    .replace(/\s+/g, "-");
}

function questionDocRef(questionDb, subjectId, topic, questionId) {
  const topicId = topicDocIdFromName(topic);
  return questionDb
    .collection("QuestionBank")
    .doc(subjectId)
    .collection("questions")
    .doc(topicId)
    .collection("id")
    .doc(questionId);
}

function topicDocRef(questionDb, subjectId, topic) {
  const topicId = topicDocIdFromName(topic);
  return questionDb
    .collection("QuestionBank")
    .doc(subjectId)
    .collection("questions")
    .doc(topicId);
}

function legacyQuestionDocRef(questionDb, subjectId, questionId) {
  return questionDb
    .collection("QuestionBank")
    .doc(subjectId)
    .collection("questions")
    .doc(questionId);
}

async function ensureTopicDoc(questionDb, subjectId, topic) {
  const ref = topicDocRef(questionDb, subjectId, topic);
  await ref.set(
    {
      topic: String(topic || "").trim(),
      updatedAt: TIMESTAMP(),
      createdAt: TIMESTAMP(),
    },
    { merge: true }
  );
}

async function findQuestionDocRef(questionDb, subjectId, questionId) {
  const topicsSnap = await questionDb
    .collection("QuestionBank")
    .doc(subjectId)
    .collection("questions")
    .get();

  const candidates = [];
  for (const topicDoc of topicsSnap.docs) {
    candidates.push(topicDoc.ref.collection("id").doc(questionId));
    if (topicDoc.id === questionId && isLegacyQuestionTopDoc(topicDoc)) {
      candidates.push(topicDoc.ref);
    }
  }

  const candidateSnaps = await Promise.all(candidates.map((ref) => ref.get()));
  for (let i = 0; i < candidateSnaps.length; i += 1) {
    if (candidateSnaps[i].exists) return candidates[i];
  }

  // Bounded lookup for nested docs (avoids scanning the entire "id" collection group).
  try {
    const scoped = await questionDb
      .collectionGroup("id")
      .where("subjectId", "==", subjectId)
      .where(FieldPath.documentId(), "==", questionId)
      .limit(5)
      .get();
    if (!scoped.empty) {
      const prefix = `QuestionBank/${subjectId}/questions/`;
      const hit = scoped.docs.find((d) => d.ref.path.startsWith(prefix));
      if (hit) return hit.ref;
    }
  } catch (err) {
    console.warn("QuestionBank findQuestion scoped collectionGroup skipped:", err?.message || err);
  }

  return null;
}

export async function GET(req) {
  try {
    const { questionDb, error } = getQuestionDbOrResponse();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId")?.trim();

    if (subjectId) {
      const questionsRef = questionDb
        .collection("QuestionBank")
        .doc(subjectId)
        .collection("questions");

      const loadAll = searchParams.get("all") === "1";
      if (loadAll) {
        const { questions, topicsMeta } = await loadAllQuestionsLegacyPath(questionDb, subjectId);
        return NextResponse.json({
          questions,
          topicsMeta,
          hasMore: false,
          nextCursor: null,
          full: true,
        });
      }

      const topicSlugParam = searchParams.get("topicId")?.trim();
      const topicSlug = topicSlugParam ? topicDocIdFromName(topicSlugParam) : "";

      let pageSize = DEFAULT_QUESTION_PAGE_SIZE;
      const limitParam = searchParams.get("limit")?.trim();
      if (limitParam) {
        const n = parseInt(limitParam, 10);
        if (Number.isFinite(n) && n > 0) {
          pageSize = Math.min(MAX_QUESTION_PAGE_SIZE, Math.max(1, n));
        }
      }

      const cursorPath = decodeQuestionCursor(searchParams.get("cursor")?.trim());
      const includeLegacy = !cursorPath;

      /** First page only: list topics + legacy rows. Continuation pages must NOT call this — one read per doc under `questions/` and it dwarfs real pagination cost. */
      let topicsMeta = [];
      let legacyQuestions = [];

      if (!cursorPath) {
        const topSnap = await questionsRef.get();
        if (topSnap.empty) {
          return NextResponse.json({
            questions: [],
            topicsMeta: [],
            hasMore: false,
            nextCursor: null,
            full: false,
          });
        }

        const sortedTop = [...topSnap.docs].sort((a, b) => a.id.localeCompare(b.id));
        topicsMeta = sortedTop
          .filter((d) => isTopicHubTopDoc(d))
          .map((d) => {
            const data = d.data() || {};
            return { id: d.id, name: String(data.topic || d.id) };
          });

        legacyQuestions = sortedTop
          .filter((d) => isLegacyQuestionTopDoc(d))
          .map((d) => serializeDoc(d));
      }

      const LEGACY_FIRST_PAGE_CAP = 30;
      const byId = new Map();

      if (includeLegacy) {
        for (const q of legacyQuestions.slice(0, LEGACY_FIRST_PAGE_CAP)) {
          if (q?.id) byId.set(q.id, q);
        }
      }

      const nestedBudget = includeLegacy ? Math.max(0, pageSize - byId.size) : pageSize;

      let nestedDocs = [];
      let nestedLastPath = null;
      let paginatedReadError = null;

      if (nestedBudget > 0) {
        try {
          const topicDocIdForPath = topicSlugParam ? topicSlug : "";
          const res = await tryCollectionGroupQuestionPage(
            questionDb,
            subjectId,
            nestedBudget,
            cursorPath,
            topicDocIdForPath
          );
          nestedDocs = res.docs;
          nestedLastPath = res.lastPath;
        } catch (err) {
          paginatedReadError = err?.message || String(err);
          console.warn("QuestionBank paginated read failed:", paginatedReadError);
        }

        for (const d of nestedDocs) {
          const row = serializeDoc(d);
          if (row?.id) byId.set(row.id, row);
        }
      }

      const questions = Array.from(byId.values());
      const hasMoreNested = Boolean(nestedLastPath);
      const nextCursor = hasMoreNested ? encodeQuestionCursor(nestedLastPath) : null;

      if (paginatedReadError && questions.length === 0) {
        return NextResponse.json(
          {
            error:
              "Could not load questions (index or query error). Create the Firestore composite index for collection group `id` on (subjectId, __name__), or use ?all=1 for a one-off full read.",
            detail: paginatedReadError,
            topicsMeta,
          },
          { status: 503 }
        );
      }

      return NextResponse.json({
        questions,
        topicsMeta,
        hasMore: hasMoreNested,
        nextCursor,
        full: false,
        ...(paginatedReadError ? { warn: paginatedReadError } : {}),
      });
    }

    const subjectsSnap = await questionDb.collection("QuestionBank").get();
    const subjects = subjectsSnap.docs.map(serializeDoc);
    return NextResponse.json({ subjects });
  } catch (err) {
    console.error("QuestionBank GET error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { questionDb, error } = getQuestionDbOrResponse();
    if (error) return error;

    const body = await req.json();
    const action = body?.action;

    if (action === "createSubject") {
      const name = String(body?.name || "").trim();
      const subjectId = subjectDocIdFromName(name);
      if (!name || !subjectId) {
        return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
      }

      await questionDb
        .collection("QuestionBank")
        .doc(subjectId)
        .set(
          {
            name,
            createdAt: TIMESTAMP(),
            updatedAt: TIMESTAMP(),
          },
          { merge: true }
        );
      return NextResponse.json({ success: true, subjectId });
    }

    if (action === "createQuestion") {
      const subjectId = String(body?.subjectId || "").trim();
      const payload = body?.payload || {};
      const topic = String(payload?.topic || "").trim();
      if (!subjectId) {
        return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
      }
      if (!topic) {
        return NextResponse.json({ error: "topic is required" }, { status: 400 });
      }

      const questionId = questionDb.collection("_tmp").doc().id;
      const ref = questionDocRef(questionDb, subjectId, topic, questionId);

      await ensureTopicDoc(questionDb, subjectId, topic);
      await ref.set({
        ...payload,
        subjectId,
        topic,
        createdAt: TIMESTAMP(),
        updatedAt: TIMESTAMP(),
      });
      await legacyQuestionDocRef(questionDb, subjectId, questionId).set(
        {
          ...payload,
          subjectId,
          topic,
          createdAt: TIMESTAMP(),
          updatedAt: TIMESTAMP(),
        },
        { merge: true }
      );

      return NextResponse.json({ success: true, questionId });
    }

    if (action === "bulkCreateQuestions") {
      const subjectId = String(body?.subjectId || "").trim();
      const questions = Array.isArray(body?.questions) ? body.questions : [];
      if (!subjectId) {
        return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
      }
      if (!questions.length) {
        return NextResponse.json({ success: true, created: 0 });
      }

      const BATCH_SIZE = 20;
      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questionDb.batch();
        const chunk = questions.slice(i, i + BATCH_SIZE);
        chunk.forEach((q) => {
          const topic = String(q?.topic || "").trim();
          if (!topic) return;
          const questionId = questionDb.collection("_tmp").doc().id;
          const topicRef = topicDocRef(questionDb, subjectId, topic);
          const docRef = questionDocRef(questionDb, subjectId, topic, questionId);
          batch.set(
            topicRef,
            {
              topic,
              createdAt: TIMESTAMP(),
              updatedAt: TIMESTAMP(),
            },
            { merge: true }
          );
          batch.set(docRef, {
            ...q,
            subjectId,
            topic,
            createdAt: TIMESTAMP(),
            updatedAt: TIMESTAMP(),
          });
          batch.set(
            legacyQuestionDocRef(questionDb, subjectId, questionId),
            {
              ...q,
              subjectId,
              topic,
              createdAt: TIMESTAMP(),
              updatedAt: TIMESTAMP(),
            },
            { merge: true }
          );
        });
        await batch.commit();
      }

      return NextResponse.json({ success: true, created: questions.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("QuestionBank POST error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { questionDb, error } = getQuestionDbOrResponse();
    if (error) return error;

    const body = await req.json();
    const action = body?.action;
    if (action !== "updateQuestion") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const subjectId = String(body?.subjectId || "").trim();
    const questionId = String(body?.questionId || "").trim();
    const payload = body?.payload || {};
    if (!subjectId || !questionId) {
      return NextResponse.json({ error: "subjectId and questionId are required" }, { status: 400 });
    }

    const existingRef = await findQuestionDocRef(questionDb, subjectId, questionId);
    if (!existingRef) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const existingSnap = await existingRef.get();
    const existingData = existingSnap.data() || {};
    const nextTopic = String(payload?.topic || existingData?.topic || "").trim();
    if (!nextTopic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const currentTopicId = existingRef.parent?.parent?.id || "";
    const nextTopicId = topicDocIdFromName(nextTopic);
    const needsMove = currentTopicId !== nextTopicId;

    if (needsMove) {
      const movedRef = questionDocRef(questionDb, subjectId, nextTopic, questionId);
      await ensureTopicDoc(questionDb, subjectId, nextTopic);
      await movedRef.set({
        ...existingData,
        ...payload,
        subjectId,
        topic: nextTopic,
        updatedAt: TIMESTAMP(),
      });
      await existingRef.delete();
    } else {
      await existingRef.update({
        ...payload,
        subjectId,
        topic: nextTopic,
        updatedAt: TIMESTAMP(),
      });
    }

    await legacyQuestionDocRef(questionDb, subjectId, questionId).set(
      {
        ...payload,
        subjectId,
        topic: nextTopic,
        updatedAt: TIMESTAMP(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("QuestionBank PUT error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { questionDb, error } = getQuestionDbOrResponse();
    if (error) return error;

    const body = await req.json();
    const action = body?.action;

    if (action === "deleteQuestion") {
      const subjectId = String(body?.subjectId || "").trim();
      const questionId = String(body?.questionId || "").trim();
      if (!subjectId || !questionId) {
        return NextResponse.json({ error: "subjectId and questionId are required" }, { status: 400 });
      }

      const ref = await findQuestionDocRef(questionDb, subjectId, questionId);
      if (!ref) {
        const legacyRef = legacyQuestionDocRef(questionDb, subjectId, questionId);
        const legacySnap = await legacyRef.get();
        if (!legacySnap.exists) {
          return NextResponse.json({ error: "Question not found" }, { status: 404 });
        }
        await legacyRef.delete();
        return NextResponse.json({ success: true });
      }
      await ref.delete();
      await legacyQuestionDocRef(questionDb, subjectId, questionId).delete().catch(() => {});

      return NextResponse.json({ success: true });
    }

    if (action === "deleteSubject") {
      const subjectId = String(body?.subjectId || "").trim();
      if (!subjectId) {
        return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
      }

      const questionsRef = questionDb.collection("QuestionBank").doc(subjectId).collection("questions");
      const topicDocsSnap = await questionsRef.get();
      const BATCH_SIZE = 200;

      for (const topicDoc of topicDocsSnap.docs) {
        const idsSnap = await topicDoc.ref.collection("id").get();
        for (let i = 0; i < idsSnap.docs.length; i += BATCH_SIZE) {
          const batch = questionDb.batch();
          idsSnap.docs.slice(i, i + BATCH_SIZE).forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
        }
        await topicDoc.ref.delete();
      }

      await questionDb.collection("QuestionBank").doc(subjectId).delete();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("QuestionBank DELETE error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

