import { NextResponse } from "next/server";
import { getAdminQuestionDb } from "@/lib/firebaseAdminQuestionDb";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

const TIMESTAMP = admin.firestore.FieldValue.serverTimestamp;

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

  for (const topicDoc of topicsSnap.docs) {
    const candidateRef = topicDoc.ref.collection("id").doc(questionId);
    const candidateSnap = await candidateRef.get();
    if (candidateSnap.exists) return candidateRef;
  }

  // Fallback: recover orphan nested docs created before topic-doc initialization.
  // Avoid indexed where() constraints to prevent FAILED_PRECONDITION.
  const orphanSnap = await questionDb.collectionGroup("id").get();
  const prefix = `QuestionBank/${subjectId}/questions/`;
  const exact = orphanSnap.docs.find(
    (d) => d.id === questionId && d.ref.path.startsWith(prefix)
  );
  if (exact) return exact.ref;

  return null;
}

export async function GET(req) {
  try {
    const { questionDb, error } = getQuestionDbOrResponse();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId")?.trim();

    if (subjectId) {
      const legacyOrTopicsSnap = await questionDb
        .collection("QuestionBank")
        .doc(subjectId)
        .collection("questions")
        .get();

      const byId = new Map();
      for (const docSnap of legacyOrTopicsSnap.docs) {
        const nestedIdsSnap = await docSnap.ref.collection("id").get();
        if (!nestedIdsSnap.empty) {
          nestedIdsSnap.docs.forEach((qDoc) => {
            byId.set(qDoc.id, serializeDoc(qDoc));
          });
        } else if (!byId.has(docSnap.id)) {
          // Backward compatibility for legacy path:
          // /QuestionBank/{subject}/questions/{questionId}
          byId.set(docSnap.id, serializeDoc(docSnap));
        }
      }

      // Fallback for orphan nested docs when topic doc does not exist.
      if (byId.size === 0) {
        try {
          const orphanSnap = await questionDb.collectionGroup("id").get();
          const prefix = `QuestionBank/${subjectId}/questions/`;
          orphanSnap.docs.forEach((docSnap) => {
            if (docSnap.ref.path.startsWith(prefix)) {
              byId.set(docSnap.id, serializeDoc(docSnap));
            }
          });
        } catch (err) {
          console.warn("QuestionBank orphan fallback read skipped:", err?.message || err);
        }
      }

      const questions = Array.from(byId.values());
      return NextResponse.json({ questions });
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

