"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { collection, collectionGroup, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SAMPLE_QB_BATCH_SIZE = 10;
const SAMPLE_QB_MAX_SCAN = 1200;
const SAMPLE_QB_MIX_RATIOS = [
  [5, 5],
  [6, 4],
  [4, 6],
  [7, 3],
  [3, 7],
];

function shuffleSampleQB(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function detectExamLabelSampleQB(testType, testName) {
  const value = `${testType || ""} ${testName || ""}`.toLowerCase();
  if (value.includes("eamcet") || value.includes("eapcet")) return "EAMCET";
  if (value.includes("advanced")) return "JEE Advanced";
  if (value.includes("jee") || value.includes("mains")) return "JEE Mains";
  return "General";
}

function normalizeSubjectSampleQB(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return null;
  if (v.includes("chem")) return "Chemistry";
  if (v.includes("phy")) return "Physics";
  if (v.includes("math")) return "Maths";
  return null;
}

function pickBatchSampleQB(pool, prevBatch = []) {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const prevPaths = new Set((prevBatch || []).map((q) => q.path));
  const withoutPrev = pool.filter((q) => !prevPaths.has(q.path));
  const source = withoutPrev.length >= SAMPLE_QB_BATCH_SIZE ? withoutPrev : pool;
  const mains = source.filter((q) => q.examType === "JEE Mains");
  const eamcet = source.filter((q) => q.examType === "EAMCET");
  const others = source.filter((q) => q.examType !== "JEE Mains" && q.examType !== "EAMCET");

  const [mainsReq, eamcetReq] = shuffleSampleQB(SAMPLE_QB_MIX_RATIOS)[0];
  const pickedMains = shuffleSampleQB(mains).slice(0, Math.min(mainsReq, mains.length));
  const pickedEamcet = shuffleSampleQB(eamcet).slice(0, Math.min(eamcetReq, eamcet.length));

  const pickedPaths = new Set([
    ...pickedMains.map((q) => q.path),
    ...pickedEamcet.map((q) => q.path),
  ]);
  const mainsLeft = mains.filter((q) => !pickedPaths.has(q.path));
  const eamcetLeft = eamcet.filter((q) => !pickedPaths.has(q.path));
  const othersLeft = others.filter((q) => !pickedPaths.has(q.path));

  const remaining = SAMPLE_QB_BATCH_SIZE - (pickedMains.length + pickedEamcet.length);
  const filler = shuffleSampleQB([...mainsLeft, ...eamcetLeft, ...othersLeft]).slice(
    0,
    Math.max(0, remaining)
  );

  const combined = [...pickedMains, ...pickedEamcet, ...filler];
  return shuffleSampleQB(combined).slice(0, Math.min(SAMPLE_QB_BATCH_SIZE, source.length));
}

function QuestionCard({ q, index }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-blue-700">Q{index + 1}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
            Topic: {q.topic || "General"}
          </span>
        </div>
      </div>

      <p className="text-slate-900 font-medium whitespace-pre-wrap">{q.text}</p>

      {q.imageUrl ? (
        <Image
          src={q.imageUrl}
          alt={`Question ${index + 1}`}
          width={900}
          height={500}
          unoptimized
          className="mt-3 max-w-full max-h-72 w-auto h-auto rounded border object-contain bg-white"
        />
      ) : null}

      {Array.isArray(q.options) && q.options.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-slate-700">
          {q.options.map((opt, i) => (
            <li key={`${q.path}-opt-${i}`}>
              <span className="font-semibold mr-2">
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
              {Array.isArray(q.optionImages) && q.optionImages[i] ? (
                <Image
                  src={q.optionImages[i]}
                  alt={`Option ${String.fromCharCode(65 + i)} image`}
                  width={640}
                  height={320}
                  unoptimized
                  className="mt-2 max-w-full max-h-40 w-auto h-auto rounded border object-contain bg-white"
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SampleQBPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState({});
  const [subjectBlocks, setSubjectBlocks] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null); // ✅ NEW

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const [questionSnap, superadminTestsSnap] = await Promise.all([
          getDocs(query(collectionGroup(db, "questions"), limit(SAMPLE_QB_MAX_SCAN))),
          getDocs(collection(db, "superadminTests")),
        ]);

        const testMetaMap = new Map(
          superadminTestsSnap.docs.map((d) => [
            `superadminTests/${d.id}`,
            {
              testType: d.data()?.testType || "",
              testName: d.data()?.name || "",
            },
          ])
        );

        const grouped = {};

        questionSnap.docs.forEach((d) => {
          const data = d.data() || {};
          const text = String(data.text || data.question || "").trim();
          if (!text) return;

          const parentTestRef = d.ref.parent.parent;
          const parentCollection = parentTestRef?.parent?.id || "";
          if (parentCollection !== "superadminTests") return;

          const testMeta = parentTestRef ? testMetaMap.get(parentTestRef.path) : null;
          const examType = detectExamLabelSampleQB(testMeta?.testType, testMeta?.testName);

          const topic = String(data.topic || "").trim() || "General";
          const subject = normalizeSubjectSampleQB(data.subject);
          if (!subject) return;

          if (!grouped[subject]) grouped[subject] = [];

          grouped[subject].push({
            id: d.id,
            path: d.ref.path,
            text,
            topic,
            subject,
            examType,
            options: Array.isArray(data.options) ? data.options.slice(0, 4) : [],
            imageUrl: String(data.imageUrl || "").trim(),
            optionImages: Array.isArray(data.optionImages)
              ? data.optionImages.slice(0, 4).map((v) => String(v || "").trim())
              : [],
          });
        });

        const subjectOrder = ["Chemistry", "Physics", "Maths"];
        const blocks = Object.entries(grouped)
          .sort(([a], [b]) => subjectOrder.indexOf(a) - subjectOrder.indexOf(b))
          .map(([subject, list]) => {
            const allQuestions = shuffleSampleQB(list);
            return {
              subject,
              allQuestions,
              visibleQuestions: pickBatchSampleQB(allQuestions),
            };
          });

        if (!cancelled) {
          setSubjectBlocks(blocks);
          if (blocks.length > 0) {
            setSelectedSubject(blocks[0].subject); // ✅ default
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load questions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = (subject) => {
    setLoadingMore((prev) => ({ ...prev, [subject]: true }));

    setSubjectBlocks((prev) =>
      prev.map((block) =>
        block.subject !== subject
          ? block
          : {
              ...block,
              visibleQuestions: pickBatchSampleQB(block.allQuestions, block.visibleQuestions),
            }
      )
    );

    setLoadingMore((prev) => ({ ...prev, [subject]: false }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        <h1 className="text-2xl font-bold mb-4">Sample Question Bank</h1>

        {/* ✅ SUBJECT SELECTOR */}
        <div className="flex flex-wrap gap-2 mb-6">
          {subjectBlocks.map((block) => (
            <button
              key={block.subject}
              onClick={() => setSelectedSubject(block.subject)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                selectedSubject === block.subject
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {block.subject}
            </button>
          ))}
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* ✅ SHOW ONLY SELECTED SUBJECT */}
        {subjectBlocks
          .filter((block) => block.subject === selectedSubject)
          .map((block) => {
            const visible = block.visibleQuestions || [];

            return (
              <div key={block.subject} className="bg-white p-6 rounded-xl border">
                <h2 className="text-xl font-semibold mb-2">{block.subject}</h2>

                <p className="text-sm text-gray-500 mb-4">
                  Showing {visible.length} of {block.allQuestions.length}
                </p>

                <div className="space-y-3">
                  {visible.map((q, idx) => (
                    <QuestionCard key={q.path} q={q} index={idx} />
                  ))}
                </div>

                <button
                  onClick={() => handleLoadMore(block.subject)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  See more questions
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}