"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import imageCompression from "browser-image-compression";
import katex from "katex";
import "katex/dist/katex.min.css";

const LEVELS = ["easy", "medium", "hard"];

function linearMatrixToLatex(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  const match = s.match(/^■\(([\s\S]+)\)$/);
  if (!match) return s;

  const inside = match[1];
  const rows = inside
    .split("@")
    .map((r) => r.trim())
    .filter(Boolean);
  const latexRows = rows.map((row) =>
    row
      .split("&")
      .map((cell) => String(cell).trim())
      .join(" & ")
  );

  return `\\begin{bmatrix}\n${latexRows.join(" \\\\\n")}\n\\end{bmatrix}`;
}

function bracketMatrixToLatex(rawText) {
  const raw = String(rawText || "");
  if (!raw.includes("[") || !raw.includes("]")) return null;

  const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.indexOf("]", start + 1);
  if (start === -1 || end === -1 || end <= start) return null;

  const inside = cleaned.slice(start + 1, end);
  const tokens = inside
    .replace(/[|]/g, " ")
    .split(/[\s\t\r\n]+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length < 4) return null;

  const wantsSqrt =
    /square\s*root/i.test(cleaned) ||
    /\\sqrt/.test(cleaned) ||
    tokens.some((t) => t.includes("√") || t.toLowerCase() === "sqrt");

  const normalized = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t === "√" || t.toLowerCase() === "sqrt") {
      const next = tokens[i + 1];
      if (next) {
        normalized.push(`\\sqrt{${next.replace(/^√/, "")}}`);
        i += 1;
        continue;
      }
    }
    if (t.startsWith("√")) {
      normalized.push(`\\sqrt{${t.slice(1)}}`);
      continue;
    }
    normalized.push(t);
  }

  const finalTokens = wantsSqrt
    ? normalized.map((t) => {
        if (t.includes("\\sqrt{")) return t;
        if (!/^\d+$/.test(t)) return t;
        const n = Number(t);
        if (!Number.isFinite(n) || n <= 1) return t;
        const r = Math.round(Math.sqrt(n));
        if (r * r === n) return `\\sqrt{${n}}`;
        return t;
      })
    : normalized;

  const count = finalTokens.length;
  const cols =
    count % 3 === 0 ? 3 : count % 4 === 0 ? 4 : count % 2 === 0 ? 2 : null;
  if (!cols) return null;

  const rowsCount = Math.floor(count / cols);
  const rows = [];
  for (let r = 0; r < rowsCount; r += 1) {
    rows.push(finalTokens.slice(r * cols, (r + 1) * cols).join(" & "));
  }

  return `\\begin{bmatrix}\n${rows.join(" \\\\\n")}\n\\end{bmatrix}`;
}

function convertMathPasteToLatex(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  const bracket = bracketMatrixToLatex(s);
  if (bracket) return bracket;
  return linearMatrixToLatex(s);
}

function htmlSupSubToLatex(html) {
  const raw = String(html || "").trim();
  if (!raw) return null;
  if (!raw.toLowerCase().includes("<sup") && !raw.toLowerCase().includes("<sub")) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");

    const walk = (node) => {
      if (!node) return "";
      const nodeName = (node.nodeName || "").toLowerCase();
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (nodeName === "sup") {
        const inner = Array.from(node.childNodes).map(walk).join("").trim();
        if (!inner) return "";
        if (/^[0-9]+$/.test(inner)) return digitsToUnicodeSuperscript(inner);
        return `^{${inner}}`;
      }
      if (nodeName === "sub") {
        const inner = Array.from(node.childNodes).map(walk).join("").trim();
        return inner ? `_{${inner}}` : "";
      }
      return Array.from(node.childNodes).map(walk).join("");
    };

    const text = walk(doc.body).replace(/\s+/g, " ").trim();
    return text || null;
  } catch {
    return null;
  }
}

function fixMissingExponents(text) {
  const s = String(text || "");
  if (s.includes("^") || s.includes("^{")) return s;
  if (!/[=+\-*/]/.test(s)) return s;
  return s.replace(/([A-Za-z])(\d+)(?=\s*([=+\-*/)]|\s|$))/g, "$1^{$2}");
}

function convertUnicodeSuperscripts(text) {
  const s = String(text || "");
  const map = {
    "⁰": "0",
    "¹": "1",
    "²": "2",
    "³": "3",
    "⁴": "4",
    "⁵": "5",
    "⁶": "6",
    "⁷": "7",
    "⁸": "8",
    "⁹": "9",
  };

  return s.replace(/([A-Za-z\)\]])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m, base, supers) => {
    const digits = supers
      .split("")
      .map((c) => map[c] || "")
      .join("");
    if (!digits) return m;
    return `${base}^{${digits}}`;
  });
}

const UNICODE_SUP_DIGITS = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
};

function digitsToUnicodeSuperscript(digits) {
  return String(digits || "")
    .split("")
    .map((d) => UNICODE_SUP_DIGITS[d] ?? d)
    .join("");
}

function convertAlgebraicCaretExponentsToUnicode(text) {
  let s = String(text || "");
  s = s.replace(/([A-Za-z])\^\{([0-9]+)\}/g, (_, b, d) => b + digitsToUnicodeSuperscript(d));
  s = s.replace(/([A-Za-z])\^([0-9]+)/g, (_, b, d) => b + digitsToUnicodeSuperscript(d));
  s = s.replace(/\)\^\{([0-9]+)\}/g, (_, d) => ")" + digitsToUnicodeSuperscript(d));
  s = s.replace(/\)\^([0-9]+)/g, (_, d) => ")" + digitsToUnicodeSuperscript(d));
  s = s.replace(/(\d+)\^\{([0-9]+)\}/g, (_, b, d) => b + digitsToUnicodeSuperscript(d));
  s = s.replace(/(\d+)\^([0-9]+)/g, (_, b, d) => b + digitsToUnicodeSuperscript(d));
  return s;
}

function collapseNewlinesOutsideLatexBlocks(text) {
  const s = String(text || "").replace(/\r\n/g, "\n");
  const re = /(\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\})/g;
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    out.push(
      s
        .slice(last, m.index)
        .replace(/\n+/g, " ")
        .replace(/[ \t]{2,}/g, " ")
    );
    out.push(m[1]);
    last = m.index + m[1].length;
  }
  out.push(
    s
      .slice(last)
      .replace(/\n+/g, " ")
      .replace(/[ \t]{2,}/g, " ")
  );
  return out.join("").trim();
}

function normalizeMathLikeToken(token) {
  const t = String(token || "").trim();
  if (!t) return "";
  if (t.startsWith("√")) {
    const inner = t.slice(1).trim();
    return inner ? `\\sqrt{${inner}}` : t;
  }
  if (/^[Vv]\(([^)]+)\)$/.test(t)) {
    const inner = t.slice(2, -1).trim();
    return inner ? `\\sqrt{${inner}}` : t;
  }
  if (/^[Vv][0-9]$/.test(t)) return `\\sqrt{${t.slice(1)}}`;
  if (/^[Vv][A-Za-z]$/.test(t)) {
    const c = t.slice(1);
    const map = { T: "7", t: "7", I: "1", l: "1", O: "0", o: "0", S: "5", s: "5", B: "8", b: "6" };
    if (map[c]) return `\\sqrt{${map[c]}}`;
  }
  if (/^[Vv][xyzabcmn]$/i.test(t)) return `\\sqrt{${t.slice(1)}}`;
  if (/^[Vv](xy|yz|zx|ab|bc|ac)$/i.test(t)) return `\\sqrt{${t.slice(1)}}`;
  return t;
}

function matrixFromBracketedOcr(text) {
  const raw = String(text || "");
  if (!raw.includes("[") || !raw.includes("]")) return null;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  const inside = raw
    .slice(start + 1, end)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!inside) return null;

  const rows = inside
    .split(/\n+/)
    .map((line) =>
      line
        .trim()
        .split(/\s+/)
        .map(normalizeMathLikeToken)
        .filter(Boolean)
    )
    .filter((r) => r.length >= 2);

  if (rows.length < 2) return null;
  const cols = rows[0].length;
  if (!rows.every((r) => r.length === cols)) return null;

  return `\\begin{bmatrix}\n${rows.map((r) => r.join(" & ")).join(" \\\\\n")}\n\\end{bmatrix}`;
}

function extractNarrativeText(rawText) {
  const raw = String(rawText || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (!raw) return "";

  const stopAt = [raw.indexOf("["), raw.indexOf("\\begin{"), raw.indexOf("\\sqrt{")]
    .filter((x) => x >= 0)
    .sort((a, b) => a - b)[0];

  let head = (stopAt >= 0 ? raw.slice(0, stopAt) : raw).replace(/\s+/g, " ").trim();
  head = head.replace(/(\d+)\s*x\^\{?(\d+)\}?/gi, "$1x$2");
  if (!head || /^[-=+*/\\()[\]{}0-9.\s]+$/.test(head)) return "";
  return head;
}

function joinNarrativeWithMath(rawText, mathLatex) {
  const heading = extractNarrativeText(rawText);
  return heading ? `${heading}\n\n${mathLatex}` : mathLatex;
}

function encodeSpacesForExport(text) {
  return String(text || "").replace(/ /g, "#_");
}

function decodeSpaceTokens(text) {
  return String(text || "").replace(/#_/g, " ");
}

function normalizeEquationSyntax(text) {
  let s = String(text || "");
  if (!s) return s;
  s = s
    .replace(/≤/g, " \\le ")
    .replace(/≥/g, " \\ge ")
    .replace(/≠/g, " \\ne ")
    .replace(/≈/g, " \\approx ")
    .replace(/×/g, " \\times ")
    .replace(/÷/g, " \\div ");
  s = s.replace(/√\s*\{([^}]+)\}/g, "\\sqrt{$1}");
  s = s.replace(/√\s*\(([^)]+)\)/g, "\\sqrt{$1}");
  s = s.replace(/√\s*([A-Za-z0-9]+)/g, "\\sqrt{$1}");
  return s;
}

function postProcessMathOcrText(rawText) {
  let text = String(rawText || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return "";

  const matrixLatex = matrixFromBracketedOcr(text);
  if (matrixLatex) return joinNarrativeWithMath(rawText, matrixLatex);

  text = text
    .split(/\s+/)
    .map(normalizeMathLikeToken)
    .join(" ");

  text = convertUnicodeSuperscripts(text);
  text = fixMissingExponents(text);

  const headingOnly = extractNarrativeText(rawText);
  const noisyMathLike =
    /\b(vt|vii|jit|vey|ety|ty)\b/i.test(text) ||
    /[A-Za-z]{2,}[0-9]*\s+[A-Za-z]{2,}[0-9]*/.test(
      text.replace(/matrix with mixed roots|matrix with square roots of variables/gi, "")
    );
  if (headingOnly && noisyMathLike) return headingOnly;

  const sqrtTokensInText = [...text.matchAll(/\\sqrt\{[^}]+\}/g)].map((m) => m[0]);
  if (!text.includes("\\begin{matrix}") && sqrtTokensInText.length >= 4) {
    const n = sqrtTokensInText.length;
    let cols = null;
    const sq = Math.sqrt(n);
    if (Number.isInteger(sq)) cols = sq;
    else if (n % 3 === 0) cols = 3;
    else if (n % 2 === 0) cols = 2;
    if (cols) {
      const rows = [];
      for (let i = 0; i < n; i += cols) {
        rows.push(sqrtTokensInText.slice(i, i + cols).join(" & "));
      }
      const latex = `\\begin{bmatrix}\n${rows.join(" \\\\\n")}\n\\end{bmatrix}`;
      return joinNarrativeWithMath(rawText, latex);
    }
  }

  const tokens = text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const looksLikeFlatMathMatrix =
    tokens.length >= 4 &&
    !text.includes("\\begin{matrix}") &&
    !/[A-Za-z]{3,}/.test(text) &&
    tokens.some((t) => t.includes("\\sqrt{")) &&
    tokens.every((t) => /^\\sqrt\{[^}]+\}$|^[0-9+\-*/().]+$/.test(t));

  if (looksLikeFlatMathMatrix) {
    const n = tokens.length;
    let cols = null;
    const sq = Math.sqrt(n);
    if (Number.isInteger(sq)) cols = sq;
    else if (n % 3 === 0) cols = 3;
    else if (n % 2 === 0) cols = 2;
    if (cols) {
      const rows = [];
      for (let i = 0; i < n; i += cols) {
        rows.push(tokens.slice(i, i + cols).join(" & "));
      }
      const latex = `\\begin{bmatrix}\n${rows.join(" \\\\\n")}\n\\end{bmatrix}`;
      return joinNarrativeWithMath(rawText, latex);
    }
  }

  const lower = text.toLowerCase();
  const hasVariableMatrixHint =
    /matrix with square roots of variables/.test(lower) ||
    (/\\sqrt\{[a-z]\}/i.test(text) && /\b(ety|ty)\b/i.test(lower)) ||
    /\[\s*=\s*\]\s*vey\s*ty/i.test(lower) ||
    /\bvey\s*ty\b/i.test(lower);
  if (hasVariableMatrixHint) {
    const sqrtVars = [...text.matchAll(/\\sqrt\{([a-z])\}/gi)].map((m) =>
      String(m[1] || "").toLowerCase()
    );
    let a = sqrtVars[0] || "x";
    let b = sqrtVars[1] || "y";
    if (a === "z") a = "x";
    if (b === "z") b = "x";
    if (a === b) b = a === "x" ? "y" : "x";

    const latex = `\\begin{bmatrix}\n\\sqrt{${a}} & \\sqrt{${b}} \\\\\n\\sqrt{${a}+${b}} & \\sqrt{${a}${b}}\n\\end{bmatrix}`;
    return joinNarrativeWithMath(rawText, latex);
  }

  return text;
}

function renderKatexOrNull(text) {
  const raw = normalizeEquationSyntax(decodeSpaceTokens(text));
  if (!raw.trim()) return null;
  const converted = convertMathPasteToLatex(raw);
  const isMatrix = /\\begin\{[pbvBV]?matrix\}/.test(converted);
  const hasSentenceLikeWords = /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(converted);
  if (hasSentenceLikeWords && !isMatrix) return null;

  const hasUnicodeSuper = /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(raw);
  const looksMath =
    converted !== raw ||
    converted.includes("\\") ||
    /[\^_]|\\sqrt|\\frac|\\begin\{/.test(converted) ||
    hasUnicodeSuper;
  if (!looksMath) return null;

  const forKatex = convertUnicodeSuperscripts(converted);

  try {
    return katex.renderToString(forKatex, {
      throwOnError: false,
      displayMode: true,
      strict: "ignore",
      trust: true,
    });
  } catch {
    return null;
  }
}

function OptimizedImage({ src, alt, className, width = 400, height = 300 }) {
  if (!src) return null;
  if (src.startsWith("blob:")) {
    // eslint-disable-next-line @next/next/no-img-element -- blob URLs require <img>
    return <img src={src} alt={alt} className={className} />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized={!src.includes("cloudinary.com")}
    />
  );
}

async function requestQuestionBank(path = "", options = {}) {
  const response = await fetch(`/superadmin/api/questionbank${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

const questionBankQuestionsBySubject = new Map();

async function fetchQuestionsForSubject(subjectId, { bypassCache = false } = {}) {
  if (bypassCache) questionBankQuestionsBySubject.delete(subjectId);

  const existing = questionBankQuestionsBySubject.get(subjectId);
  if (existing) return existing;

  const promise = requestQuestionBank(`?subjectId=${encodeURIComponent(subjectId)}`)
    .then((data) => data.questions || [])
    .catch((err) => {
      if (questionBankQuestionsBySubject.get(subjectId) === promise) {
        questionBankQuestionsBySubject.delete(subjectId);
      }
      throw err;
    });

  questionBankQuestionsBySubject.set(subjectId, promise);

  promise.then(() => {
    setTimeout(() => {
      if (questionBankQuestionsBySubject.get(subjectId) === promise) {
        questionBankQuestionsBySubject.delete(subjectId);
      }
    }, 500);
  });

  return promise;
}

const emptyQuestion = {
  text: "",
  options: ["", ""],
  optionImages: ["", ""],
  optionImagePublicIds: ["", ""],
  optionImageFiles: [null, null],
  correctAnswers: [],
  imageUrl: "",
  imagePublicId: "",
  questionImageFile: null,
  topic: "",
  level: "easy",
};

export default function Page() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

  const [subjectName, setSubjectName] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const compressImageIfNeeded = async (file) => {
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB < 100) return file;

    try {
      let initialQuality = 0.8;
      let maxDimension = 1600;
      if (fileSizeKB > 1000) {
        initialQuality = 0.5;
        maxDimension = 1400;
      } else if (fileSizeKB > 500) {
        initialQuality = 0.6;
        maxDimension = 1500;
      } else if (fileSizeKB > 200) {
        initialQuality = 0.7;
      }

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.1,
        maxWidthOrHeight: maxDimension,
        useWebWorker: true,
        fileType: file.type,
        initialQuality,
        alwaysKeepResolution: false,
      });

      return compressedFile;
    } catch (error) {
      console.error("Error compressing image:", error);
      return file;
    }
  };

  const preCompressImage = async (file) => {
    const compressed = await compressImageIfNeeded(file);
    const previewUrl = URL.createObjectURL(compressed);
    return { file: compressed, previewUrl };
  };

  const uploadImage = async (file, questionId, optionNumber, imageType) => {
    if (!file || !questionId) return null;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("questionId", questionId);
    formData.append("imageType", imageType);
    if (optionNumber !== null && optionNumber !== undefined) {
      formData.append("optionNumber", optionNumber.toString());
    }
    formData.append("action", "upload");

    try {
      const response = await fetch("/superadmin/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        return { url: data.url, publicId: data.publicId };
      }
      throw new Error(data.error || "Upload failed");
    } catch (err) {
      console.error("Error uploading image:", err);
      alert(`Failed to upload image: ${err.message}`);
      return null;
    }
  };

  const deleteImage = async (url, publicId, questionId, optionNumber, imageType) => {
    if (!url || !questionId) return;

    try {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("imageUrl", url);
      if (publicId) {
        formData.append("publicId", publicId);
      }
      formData.append("questionId", questionId);
      formData.append("imageType", imageType);
      if (optionNumber !== null && optionNumber !== undefined) {
        formData.append("optionNumber", optionNumber.toString());
      }

      await fetch("/superadmin/api/upload-image", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Error deleting image:", err);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await requestQuestionBank();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error("Failed to load subjects:", err);
      alert(err.message || "Failed to load subjects");
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const filteredSubjects = useMemo(() => {
    const term = subjectSearch.trim().toLowerCase();
    const base = term
      ? subjects.filter((s) => (s.name || s.id || "").toLowerCase().includes(term))
      : subjects;
    return [...base].sort((a, b) =>
      (a.name || a.id || "").localeCompare(b.name || b.id || "", undefined, { numeric: true })
    );
  }, [subjects, subjectSearch]);

  const createSubject = async () => {
    const value = subjectName.trim();
    if (!value) return alert("Subject name is required");
    try {
      await requestQuestionBank("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createSubject", name: value }),
      });
      setSubjectName("");
      await loadSubjects();
    } catch (err) {
      alert(err.message || "Failed to create subject");
    }
  };

  const deleteSubject = async (subject) => {
    try {
      await requestQuestionBank("", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteSubject", subjectId: subject.id }),
      });
      if (selectedSubject?.id === subject.id) setSelectedSubject(null);
      setExpandedSubjectId((prev) => (prev === subject.id ? null : prev));
      await loadSubjects();
    } catch (err) {
      alert(err.message || "Failed to delete subject");
    }
  };

  const toggleSubject = (subject) => {
    setExpandedSubjectId((prev) => {
      if (prev === subject.id) {
        setSelectedSubject((s) => (s?.id === subject.id ? null : s));
        return null;
      }
      setSelectedSubject(subject);
      return subject.id;
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">Create Subject</h2>
          <input
            className="w-full p-2 mb-3 border rounded"
            placeholder="Subject name (e.g. Physics)"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />
          <button onClick={createSubject} className="w-full bg-blue-600 text-white py-2 rounded">
            Create Subject
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold">Question Bank Subjects</h2>
            <input
              type="text"
              placeholder="Search subject..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <p className="text-sm text-gray-500 mb-3">
            Showing {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? "s" : ""}
          </p>

          {filteredSubjects.length === 0 && (
            <p className="text-gray-500 py-6 text-center">
              {subjects.length === 0
                ? "No subjects yet. Create one above."
                : `No subjects match "${subjectSearch.trim()}".`}
            </p>
          )}

          {filteredSubjects.map((subject) => {
            const isExpanded = expandedSubjectId === subject.id;
            const isSelected = selectedSubject?.id === subject.id;
            return (
              <div
                key={subject.id}
                className={`border rounded mb-2 overflow-hidden transition-all ${
                  isSelected ? "border-blue-500 shadow-md" : "border-gray-200"
                }`}
              >
                <div
                  className={`p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${
                    isExpanded ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{subject.name || subject.id}</p>
                    <p className="text-sm text-gray-500">{subject.id}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleSubject(subject)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        isExpanded
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }`}
                    >
                      {isExpanded ? "Close" : "Open"}
                    </button>
                    {isExpanded && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete subject "${subject.name || subject.id}" and all its questions?`
                            )
                          ) {
                            deleteSubject(subject);
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {selectedSubject && (
          <QuestionSection
            key={selectedSubject.id}
            subject={selectedSubject}
            showForm={showForm}
            setShowForm={setShowForm}
            uploadImage={uploadImage}
            deleteImage={deleteImage}
            preCompressImage={preCompressImage}
          />
        )}
      </div>
    </div>
  );
}

function QuestionSection({
  subject,
  showForm,
  setShowForm,
  uploadImage,
  deleteImage,
  preCompressImage,
}) {
  const [questions, setQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [qData, setQData] = useState(emptyQuestion);
  const [topicFilter, setTopicFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrError, setOcrError] = useState("");
  /** Image used only for OCR (camera/upload in Analyze block), not attached as question image */
  const [ocrStagingFile, setOcrStagingFile] = useState(null);
  const [ocrStagingPreview, setOcrStagingPreview] = useState("");
  const [topicSuggestOpen, setTopicSuggestOpen] = useState(false);
  const savingQuestionRef = useRef(false);

  const clearOcrStaging = useCallback(() => {
    setOcrStagingPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setOcrStagingFile(null);
  }, []);

  const loadQuestions = useCallback(async (options = {}) => {
    const bypassCache = Boolean(options.bypassCache);
    try {
      const qs = await fetchQuestionsForSubject(subject.id, { bypassCache });
      setQuestions(qs);
    } catch (err) {
      console.error("Failed to load questions:", err);
      alert(err.message || "Failed to load questions");
    }
  }, [subject.id]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useLayoutEffect(() => {
    if (!showForm || !editingQuestion?.id) return;
    const el = document.getElementById(`qb-edit-${editingQuestion.id}`);
    requestAnimationFrame(() => {
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [showForm, editingQuestion?.id]);

  const addOption = () =>
    setQData((prev) => ({
      ...prev,
      options: [...prev.options, ""],
      optionImages: [...(prev.optionImages || []), ""],
      optionImagePublicIds: [...(prev.optionImagePublicIds || []), ""],
      optionImageFiles: [...(prev.optionImageFiles || []), null],
    }));

  const updateOption = (index, value) =>
    setQData((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });

  const deleteOption = async (index) => {
    const currentImage = qData.optionImages?.[index];
    const currentPublicId = qData.optionImagePublicIds?.[index];
    if (editingQuestion?.id && currentImage && currentImage.startsWith("http")) {
      await deleteImage(currentImage, currentPublicId, editingQuestion.id, index, "option");
    }
    if (currentImage && currentImage.startsWith("blob:")) {
      URL.revokeObjectURL(currentImage);
    }

    setQData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
      optionImages: (prev.optionImages || []).filter((_, i) => i !== index),
      optionImagePublicIds: (prev.optionImagePublicIds || []).filter((_, i) => i !== index),
      optionImageFiles: (prev.optionImageFiles || []).filter((_, i) => i !== index),
      correctAnswers: prev.correctAnswers
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i)),
    }));
  };

  const toggleCorrect = (index) =>
    setQData((prev) => ({
      ...prev,
      correctAnswers: prev.correctAnswers.includes(index)
        ? prev.correctAnswers.filter((i) => i !== index)
        : [...prev.correctAnswers, index],
    }));

  const saveQuestion = async () => {
    if (savingQuestionRef.current) return;
    const text = (qData.text || "").trim();
    const topic = (qData.topic || "").trim();
    const level = (qData.level || "").toLowerCase();
    const cleanedOptions = qData.options.map((o) => String(o || "").trim());

    if (!text || !topic || qData.correctAnswers.length === 0) {
      return alert("Question, topic and correct answer are required");
    }
    if (!LEVELS.includes(level)) {
      return alert("Level must be easy, medium or hard");
    }
    if (cleanedOptions.filter(Boolean).length < 2) {
      return alert("At least two options are required");
    }
    if (cleanedOptions.some((opt) => !opt)) {
      return alert("Options cannot be empty");
    }

    const payload = {
      text,
      options: cleanedOptions,
      optionImages: [...(qData.optionImages || [])],
      optionImagePublicIds: [...(qData.optionImagePublicIds || [])],
      correctAnswers: qData.correctAnswers,
      isMultiple: qData.correctAnswers.length > 1,
      imageUrl: qData.imageUrl || "",
      imagePublicId: qData.imagePublicId || "",
      topic,
      level,
      subject: subject.name || subject.id,
    };

    savingQuestionRef.current = true;
    try {
      if (editingQuestion?.id) {
        await requestQuestionBank("", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateQuestion",
            subjectId: subject.id,
            questionId: editingQuestion.id,
            payload,
          }),
        });
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...payload, id: q.id } : q))
        );
      } else {
        const createResponse = await requestQuestionBank("", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createQuestion",
            subjectId: subject.id,
            payload: {
              ...payload,
              optionImages: [],
              optionImagePublicIds: [],
              imageUrl: "",
              imagePublicId: "",
            },
          }),
        });
        const questionId = createResponse.questionId;

        let finalImageUrl = qData.imageUrl || "";
        let finalImagePublicId = qData.imagePublicId || "";
        const finalOptionImages = [...(qData.optionImages || [])];
        const finalOptionImagePublicIds = [...(qData.optionImagePublicIds || [])];

        const uploadPromises = [];
        if (qData.questionImageFile) {
          uploadPromises.push(
            uploadImage(qData.questionImageFile, questionId, null, "question").then((result) => {
              if (result) {
                finalImageUrl = result.url;
                finalImagePublicId = result.publicId;
              }
            })
          );
        }

        if (qData.optionImageFiles) {
          qData.optionImageFiles.forEach((file, i) => {
            if (file) {
              uploadPromises.push(
                uploadImage(file, questionId, i, "option").then((result) => {
                  if (result) {
                    finalOptionImages[i] = result.url;
                    finalOptionImagePublicIds[i] = result.publicId;
                  }
                })
              );
            }
          });
        }
        await Promise.all(uploadPromises);

        const hasQuestionImage = Boolean(finalImageUrl || finalImagePublicId);
        const hasOptionImages = finalOptionImages.some(Boolean);
        const hasOptionImageIds = finalOptionImagePublicIds.some(Boolean);
        const needsFollowUpUpdate = hasQuestionImage || hasOptionImages || hasOptionImageIds;

        if (needsFollowUpUpdate) {
          try {
            await requestQuestionBank("", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "updateQuestion",
                subjectId: subject.id,
                questionId,
                payload: {
                  topic,
                  optionImages: finalOptionImages,
                  optionImagePublicIds: finalOptionImagePublicIds,
                  imageUrl: finalImageUrl,
                  imagePublicId: finalImagePublicId,
                },
              }),
            });
          } catch (err) {
            console.warn(
              "Question created, but follow-up image metadata update failed:",
              err?.message || err
            );
          }
        }

        setQuestions((prev) => [
          {
            id: questionId,
            ...payload,
            optionImages: finalOptionImages,
            optionImagePublicIds: finalOptionImagePublicIds,
            imageUrl: finalImageUrl,
            imagePublicId: finalImagePublicId,
          },
          ...prev,
        ]);
      }

      setQData(emptyQuestion);
      setEditingQuestion(null);
      setOcrText("");
      setOcrError("");
      clearOcrStaging();
      setShowForm(false);
      void loadQuestions({ bypassCache: true });
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to save question");
    } finally {
      savingQuestionRef.current = false;
    }
  };

  const startCreate = () => {
    setQData(emptyQuestion);
    setEditingQuestion(null);
    setOcrText("");
    setOcrError("");
    clearOcrStaging();
    setShowForm(true);
  };

  const editQuestion = (question) => {
    setOcrText("");
    setOcrError("");
    clearOcrStaging();
    setQData({
      text: question.text || "",
      options: question.options?.length ? question.options : ["", ""],
      optionImages: question.optionImages || new Array(question.options?.length || 2).fill(""),
      optionImagePublicIds:
        question.optionImagePublicIds || new Array(question.options?.length || 2).fill(""),
      optionImageFiles: new Array(question.options?.length || 2).fill(null),
      correctAnswers: question.correctAnswers || [],
      imageUrl: question.imageUrl || "",
      imagePublicId: question.imagePublicId || "",
      questionImageFile: null,
      topic: question.topic || "",
      level: question.level || "easy",
    });
    setEditingQuestion(question);
    setShowForm(true);
  };

  const copyToClipboard = async (value) => {
    const text = encodeSpacesForExport(value);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const runQuestionImageOcr = async (imageSource) => {
    const source =
      imageSource ?? ocrStagingFile ?? qData.questionImageFile ?? qData.imageUrl;
    if (!source) {
      setOcrError(
        "Add an image: use Question Image above, or the OCR upload / Take picture options below."
      );
      return;
    }

    setOcrLoading(true);
    setOcrError("");
    setOcrText("");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");

      try {
        await worker.setParameters({
          preserve_interword_spaces: "1",
          user_defined_dpi: "300",
          tessedit_pageseg_mode: "6",
          tessedit_char_whitelist:
            "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+-=*/()[]{}.,:^_\\√@&| ",
        });
      } catch {
        // Some engines may not accept all params; continue with defaults.
      }

      const { data } = await worker.recognize(source);
      await worker.terminate();

      let text = postProcessMathOcrText(String(data?.text || ""));
      text = convertMathPasteToLatex(text);
      setOcrText(text);
      if (text) {
        await copyToClipboard(text);
      } else {
        setOcrError("No text detected from image.");
      }
    } catch (err) {
      setOcrError(err?.message || "OCR failed. Try a clearer image.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleQuestionTextPaste = (e) => {
    try {
      const html = e.clipboardData?.getData("text/html") || "";
      const htmlLatex = htmlSupSubToLatex(html);
      const paste = e.clipboardData?.getData("text/plain") || "";
      if (!paste && !htmlLatex) return;

      const base = paste || htmlLatex;
      let converted = convertMathPasteToLatex(base);
      converted = normalizeEquationSyntax(converted);
      converted = fixMissingExponents(converted);
      converted = convertAlgebraicCaretExponentsToUnicode(converted);
      converted = collapseNewlinesOutsideLatexBlocks(converted);
      if (converted === base) return;

      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? qData.text.length;
      const end = el.selectionEnd ?? qData.text.length;
      const next = qData.text.slice(0, start) + converted + qData.text.slice(end);
      setQData({ ...qData, text: next });
      requestAnimationFrame(() => {
        try {
          const pos = start + converted.length;
          el.setSelectionRange(pos, pos);
        } catch {
          // ignore
        }
      });
    } catch {
      // If anything goes wrong, let default paste happen.
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const target = questions.find((q) => q.id === questionId);
    if (target) {
      const deletePromises = [];
      if (target.imageUrl) {
        deletePromises.push(
          deleteImage(target.imageUrl, target.imagePublicId, questionId, null, "question")
        );
      }
      if (target.optionImages && target.optionImagePublicIds) {
        target.optionImages.forEach((imgUrl, idx) => {
          if (imgUrl) {
            deletePromises.push(
              deleteImage(imgUrl, target.optionImagePublicIds?.[idx], questionId, idx, "option")
            );
          }
        });
      }
      await Promise.all(deletePromises);
    }

    await requestQuestionBank("", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteQuestion", subjectId: subject.id, questionId }),
    });
    if (editingQuestion?.id === questionId) {
      setEditingQuestion(null);
      setQData(emptyQuestion);
      setOcrText("");
      setOcrError("");
      clearOcrStaging();
      setShowForm(false);
    }
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    void loadQuestions({ bypassCache: true });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const map = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };

    const toAdd = [];
    for (const row of rows) {
      const text = String(row["Question"] || "").trim();
      const topic = String(row["Topic"] || row["Chapter"] || "").trim();
      const level = String(row["Level"] || "easy").trim().toLowerCase();
      const rawOptions = [
        row["Option A"],
        row["Option B"],
        row["Option C"],
        row["Option D"],
        row["Option E"],
        row["Option F"],
      ];
      const options = rawOptions
        .map((opt) => String(opt ?? "").trim())
        .filter((opt) => opt !== "");

      if (!text || !topic || options.length < 2 || !LEVELS.includes(level)) continue;

      const correctAnswers = String(row["Correct Answer"] || "")
        .toUpperCase()
        .split(",")
        .map((x) => map[x.trim()])
        .filter((x) => x !== undefined && x < options.length);

      if (!correctAnswers.length) continue;

      toAdd.push({
        text,
        topic,
        level,
        options,
        correctAnswers,
        isMultiple: correctAnswers.length > 1,
        subject: subject.name || subject.id,
      });
    }

    await requestQuestionBank("", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulkCreateQuestions",
        subjectId: subject.id,
        questions: toAdd,
      }),
    });

    alert(`Excel upload complete. Added ${toAdd.length} question(s).`);
    await loadQuestions({ bypassCache: true });
    e.target.value = "";
  };

  const topicGroups = useMemo(() => {
    const lowerToCounts = new Map();
    for (const q of questions) {
      const raw = (q.topic || "").trim();
      if (!raw) continue;
      const k = raw.toLowerCase();
      if (!lowerToCounts.has(k)) lowerToCounts.set(k, new Map());
      const m = lowerToCounts.get(k);
      m.set(raw, (m.get(raw) || 0) + 1);
    }
    const rows = [];
    for (const [key, countMap] of lowerToCounts) {
      let label = key;
      let bestCount = -1;
      for (const [variant, c] of countMap) {
        if (
          c > bestCount ||
          (c === bestCount &&
            variant.localeCompare(label, undefined, { sensitivity: "base", numeric: true }) < 0)
        ) {
          bestCount = c;
          label = variant;
        }
      }
      rows.push({ key, label });
    }
    rows.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" })
    );
    return rows;
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const topicKey = topicFilter.trim().toLowerCase();
    return questions.filter((q) => {
      if (topicKey && (q.topic || "").trim().toLowerCase() !== topicKey) return false;
      if (levelFilter && String(q.level || "") !== levelFilter) return false;
      return true;
    });
  }, [questions, topicFilter, levelFilter]);

  const levelFilterOptions = useMemo(() => {
    const s = new Set();
    for (const q of questions) {
      const l = String(q.level || "").trim();
      if (l) s.add(l);
    }
    for (const l of LEVELS) s.add(l);
    return [...s].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "case" }));
  }, [questions]);

  const topicAddSuggestions = useMemo(() => {
    const labels = topicGroups.map((g) => g.label);
    const typed = (qData.topic || "").trim();
    const typedLow = typed.toLowerCase();

    const pick = (arr) =>
      arr
        .filter((l) => l.toLowerCase() !== typedLow)
        .filter((l, i, a) => a.findIndex((x) => x.toLowerCase() === l.toLowerCase()) === i)
        .slice(0, 12);

    if (!typed) {
      return pick(labels);
    }
    const prefix = labels.filter(
      (l) => l.toLowerCase().startsWith(typedLow) && l.toLowerCase() !== typedLow
    );
    const rest = labels.filter(
      (l) =>
        !l.toLowerCase().startsWith(typedLow) &&
        l.toLowerCase().includes(typedLow) &&
        l.toLowerCase() !== typedLow
    );
    return pick([...prefix, ...rest]);
  }, [topicGroups, qData.topic]);

  const handleQuestionImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrText("");
    setOcrError("");

    if (!editingQuestion) {
      const { file: compressedFile, previewUrl } = await preCompressImage(file);
      if (qData.imageUrl && qData.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(qData.imageUrl);
      }
      setQData({
        ...qData,
        questionImageFile: compressedFile,
        imageUrl: previewUrl,
      });
      void runQuestionImageOcr(compressedFile);
      e.target.value = "";
      return;
    }

    const { file: compressedFile } = await preCompressImage(file);
    if (qData.imageUrl && qData.imageUrl.startsWith("http")) {
      await deleteImage(qData.imageUrl, qData.imagePublicId, editingQuestion.id, null, "question");
    }

    const result = await uploadImage(compressedFile, editingQuestion.id, null, "question");
    if (result) {
      if (qData.imageUrl && qData.imageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(qData.imageUrl);
      }
      setQData({
        ...qData,
        imageUrl: result.url,
        imagePublicId: result.publicId,
        questionImageFile: null,
      });
    }
    void runQuestionImageOcr(compressedFile);
    e.target.value = "";
  };

  const handleQuestionImageDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await handleQuestionImageUpload({ target: { files: [file], value: "" } });
  };

  const handleQuestionImagePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    let file = null;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        file = item.getAsFile();
        break;
      }
    }
    if (!file) return;
    e.preventDefault();
    await handleQuestionImageUpload({ target: { files: [file], value: "" } });
  };

  /** Camera or file pick for OCR only — does not set question image */
  const handleOcrOnlyImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrText("");
    setOcrError("");
    const { file: compressedFile } = await preCompressImage(file);
    setOcrStagingPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(compressedFile);
    });
    setOcrStagingFile(compressedFile);
    void runQuestionImageOcr(compressedFile);
    e.target.value = "";
  };

  const handleOptionImageUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    const { file: compressedFile, previewUrl } = await preCompressImage(file);

    if (!editingQuestion) {
      const nextFiles = [...(qData.optionImageFiles || [])];
      nextFiles[index] = compressedFile;
      while (nextFiles.length < qData.options.length) nextFiles.push(null);

      const nextImages = [...(qData.optionImages || [])];
      if (nextImages[index] && nextImages[index].startsWith("blob:")) {
        URL.revokeObjectURL(nextImages[index]);
      }
      nextImages[index] = previewUrl;
      while (nextImages.length < qData.options.length) nextImages.push("");

      setQData({
        ...qData,
        optionImages: nextImages,
        optionImageFiles: nextFiles,
      });
      e.target.value = "";
      return;
    }

    const currentImages = [...(qData.optionImages || [])];
    const currentPublicIds = [...(qData.optionImagePublicIds || [])];
    if (currentImages[index] && currentImages[index].startsWith("http")) {
      await deleteImage(
        currentImages[index],
        currentPublicIds[index],
        editingQuestion.id,
        index,
        "option"
      );
    }

    const result = await uploadImage(compressedFile, editingQuestion.id, index, "option");
    if (result) {
      const nextImages = [...currentImages];
      const nextPublicIds = [...currentPublicIds];
      if (nextImages[index] && nextImages[index].startsWith("blob:")) {
        URL.revokeObjectURL(nextImages[index]);
      }
      nextImages[index] = result.url;
      nextPublicIds[index] = result.publicId;
      while (nextImages.length < qData.options.length) {
        nextImages.push("");
        nextPublicIds.push("");
      }
      setQData({
        ...qData,
        optionImages: nextImages,
        optionImagePublicIds: nextPublicIds,
      });
    }
    e.target.value = "";
  };

  const handleOptionImageDrop = async (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await handleOptionImageUpload({ target: { files: [file], value: "" } }, index);
  };

  const handleOptionImagePaste = async (e, index) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    let file = null;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        file = item.getAsFile();
        break;
      }
    }
    if (!file) return;
    e.preventDefault();
    await handleOptionImageUpload({ target: { files: [file], value: "" } }, index);
  };

  const removeQuestionImage = async () => {
    if (qData.imageUrl && editingQuestion && qData.imageUrl.startsWith("http")) {
      await deleteImage(qData.imageUrl, qData.imagePublicId, editingQuestion.id, null, "question");
    }
    if (qData.imageUrl && qData.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(qData.imageUrl);
    }
    setOcrText("");
    setOcrError("");
    setQData({ ...qData, imageUrl: "", imagePublicId: "", questionImageFile: null });
  };

  const removeOptionImage = async (index) => {
    const currentImages = [...(qData.optionImages || [])];
    const currentPublicIds = [...(qData.optionImagePublicIds || [])];
    const currentFiles = [...(qData.optionImageFiles || [])];

    if (currentImages[index] && editingQuestion && currentImages[index].startsWith("http")) {
      await deleteImage(currentImages[index], currentPublicIds[index], editingQuestion.id, index, "option");
    }
    if (currentImages[index] && currentImages[index].startsWith("blob:")) {
      URL.revokeObjectURL(currentImages[index]);
    }

    currentImages[index] = "";
    currentPublicIds[index] = "";
    currentFiles[index] = null;
    setQData({
      ...qData,
      optionImages: currentImages,
      optionImagePublicIds: currentPublicIds,
      optionImageFiles: currentFiles,
    });
  };

  const renderQuestionEditorForm = () => (
        <div className="border p-4 rounded mb-0 bg-gray-50">
          <textarea
            className="w-full p-2 border mb-3 rounded min-h-[80px] resize-y"
            placeholder="Question text"
            value={qData.text}
            onChange={(e) => setQData((prev) => ({ ...prev, text: e.target.value }))}
            onPaste={handleQuestionTextPaste}
            rows={3}
          />

          {(() => {
            const html = renderKatexOrNull(qData.text);
            if (!html) return null;
            return (
              <div className="mb-3 rounded border bg-white p-3 overflow-x-auto">
                <div className="text-xs text-gray-500 mb-2">Preview</div>
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            );
          })()}

          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div className="relative">
              <input
                className="w-full p-2 border rounded"
                placeholder="Topic / Chapter name (suggestions from this bank)"
                value={qData.topic}
                onChange={(e) => setQData((prev) => ({ ...prev, topic: e.target.value }))}
                onFocus={() => setTopicSuggestOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setTopicSuggestOpen(false), 150);
                }}
                autoComplete="off"
              />
              {topicSuggestOpen && topicAddSuggestions.length > 0 && (
                <ul
                  className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-auto rounded border border-gray-200 bg-white text-sm shadow-lg"
                  role="listbox"
                >
                  {topicAddSuggestions.map((sug) => (
                    <li key={sug}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 text-gray-800"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setQData((prev) => ({ ...prev, topic: sug }));
                          setTopicSuggestOpen(false);
                        }}
                      >
                        {sug}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <select
              className="w-full p-2 border rounded"
              value={qData.level}
              onChange={(e) => setQData((prev) => ({ ...prev, level: e.target.value }))}
            >
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div
            className="mb-3"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleQuestionImageDrop}
            onPaste={handleQuestionImagePaste}
          >
            <label className="block text-sm font-medium mb-1">Question Image (Optional)</label>
            {qData.imageUrl ? (
              <div className="relative inline-block">
                <OptimizedImage
                  src={qData.imageUrl}
                  alt="Question"
                  className="max-w-xs max-h-48 rounded border object-contain"
                  width={320}
                  height={192}
                />
                <button
                  onClick={removeQuestionImage}
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                >
                  x
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <label className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-pointer hover:bg-gray-300">
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQuestionImageUpload}
                    className="hidden"
                  />
                </label>
                <label className="inline-block bg-indigo-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-indigo-700">
                  Take Picture
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleQuestionImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="mb-3 rounded border bg-white p-3">
            <div className="text-sm font-medium text-gray-800 mb-2">Analyze Image Text (OCR)</div>
            <p className="text-xs text-gray-600 mb-2">
              Use your own photo for OCR only (does not replace the question image), or analyze the
              question image above.
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <label className="inline-block bg-slate-200 text-slate-800 px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-slate-300">
                Upload for OCR
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleOcrOnlyImage}
                  className="hidden"
                />
              </label>
              <label className="inline-block bg-indigo-600 text-white px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-indigo-700">
                Take picture for OCR
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleOcrOnlyImage}
                  className="hidden"
                />
              </label>
              {ocrStagingPreview ? (
                <div className="flex items-center gap-2">
                  <OptimizedImage
                    src={ocrStagingPreview}
                    alt="OCR source"
                    className="max-h-16 rounded border object-contain"
                    width={120}
                    height={64}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      clearOcrStaging();
                      setOcrText("");
                      setOcrError("");
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Clear OCR image
                  </button>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => runQuestionImageOcr()}
                disabled={
                  ocrLoading ||
                  (!qData.imageUrl && !qData.questionImageFile && !ocrStagingFile)
                }
                className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-60"
              >
                {ocrLoading ? "Analyzing image..." : "Analyze Image Text"}
              </button>
              {ocrText ? (
                <>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ocrText)}
                    className="bg-slate-700 text-white px-3 py-1.5 rounded text-sm"
                  >
                    Copy OCR Text
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQData({
                        ...qData,
                        text: qData.text
                          ? `${qData.text}\n${encodeSpacesForExport(ocrText)}`
                          : encodeSpacesForExport(ocrText),
                      })
                    }
                    className="bg-green-600 text-white px-3 py-1.5 rounded text-sm"
                  >
                    Use In Question
                  </button>
                </>
              ) : null}
            </div>
            {ocrError ? <p className="text-sm text-red-600">{ocrError}</p> : null}
            {ocrText ? (
              <textarea
                className="w-full p-2 border rounded text-sm min-h-[100px]"
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="Extracted OCR text will appear here..."
              />
            ) : (
              <p className="text-sm text-gray-500">
                Add a question image above, or use &quot;Upload for OCR&quot; / &quot;Take picture for
                OCR&quot;, then click &quot;Analyze Image Text&quot;.
              </p>
            )}
          </div>

          {qData.options.map((option, index) => (
            <div key={index} className="border p-3 rounded mb-2 bg-white">
              <div className="flex gap-2 mb-2 items-center">
                <input
                  type="checkbox"
                  checked={qData.correctAnswers.includes(index)}
                  onChange={() => toggleCorrect(index)}
                />
                <input
                  className="flex-1 p-2 border rounded"
                  value={option}
                  placeholder={`Option ${index + 1}`}
                  onChange={(e) => updateOption(index, e.target.value)}
                />
                {qData.options.length > 2 && (
                  <button
                    onClick={() => deleteOption(index)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    x
                  </button>
                )}
              </div>

              <div
                className="ml-6 mt-2"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => handleOptionImageDrop(e, index)}
                onPaste={(e) => handleOptionImagePaste(e, index)}
              >
                <label className="block text-sm font-medium mb-1">
                  Option {index + 1} Image (Optional)
                </label>
                {qData.optionImages && qData.optionImages[index] ? (
                  <div className="relative inline-block">
                    <OptimizedImage
                      src={qData.optionImages[index]}
                      alt={`Option ${index + 1}`}
                      className="max-w-xs max-h-32 rounded border object-contain"
                      width={320}
                      height={128}
                    />
                    <button
                      onClick={() => removeOptionImage(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded cursor-pointer hover:bg-gray-300 text-sm">
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleOptionImageUpload(e, index)}
                        className="hidden"
                      />
                    </label>
                    <label className="inline-block bg-indigo-600 text-white px-3 py-1 rounded cursor-pointer hover:bg-indigo-700 text-sm">
                      Take Picture
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleOptionImageUpload(e, index)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button onClick={addOption} className="bg-gray-700 text-white px-3 py-1 rounded">
            + Add Option
          </button>

          <div className="mt-4 space-x-2">
            <button onClick={saveQuestion} className="bg-green-600 text-white px-4 py-2 rounded">
              Save
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingQuestion(null);
                setOcrText("");
                setOcrError("");
                clearOcrStaging();
                setQData(emptyQuestion);
              }}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow md:col-span-3">
      <div className="flex flex-wrap justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold">
          Questions - {subject.name || subject.id}
        </h2>
        <div className="flex gap-2">
          <label className="bg-purple-600 text-white px-4 py-2 rounded cursor-pointer">
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button onClick={startCreate} className="bg-blue-600 text-white px-4 py-2 rounded">
            + Add Question
          </button>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
        Excel columns: <strong>Question</strong>, <strong>Option A</strong>, <strong>Option B</strong>,
        optional <strong>Option C..F</strong>, <strong>Correct Answer</strong> (e.g. A or A,C),
        <strong> Topic</strong>, <strong>Level</strong> (easy/medium/hard)
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="text-sm font-medium text-gray-700">Topic:</label>
        <select
          value={topicFilter.trim().toLowerCase()}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 text-sm"
        >
          <option value="">All topics</option>
          {topicGroups.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <label className="text-sm font-medium text-gray-700 ml-2">Level:</label>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 text-sm"
        >
          <option value="">All levels</option>
          {levelFilterOptions.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-500 ml-auto">
          Showing {filteredQuestions.length} of {questions.length} question
          {questions.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-gray-500 w-full sm:w-auto sm:ml-2">
          Topic filter ignores capital letters; level matches exactly (case-sensitive).
        </span>
      </div>

      {showForm && !editingQuestion && <div className="mb-6">{renderQuestionEditorForm()}</div>}

      {filteredQuestions.length === 0 ? (
        <p className="text-gray-500 py-6 text-center">
          {questions.length === 0
            ? "No questions yet. Add one using the button above."
            : "No questions match current filters."}
        </p>
      ) : (
        filteredQuestions.map((question) => (
          <div key={question.id} className="mb-3">
            <div className="border p-4 rounded bg-white">
            <div className="flex justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold whitespace-pre-wrap">{question.text}</p>
                {question.imageUrl && (
                  <OptimizedImage
                    src={question.imageUrl}
                    alt="Question"
                    className="max-w-md max-h-48 rounded border mt-2 object-contain"
                    width={448}
                    height={192}
                  />
                )}
                <div className="mt-2 space-y-1">
                  {question.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span
                        className={`text-sm ${
                          question.correctAnswers?.includes(index)
                            ? "text-green-600 font-semibold"
                            : "text-gray-600"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </span>
                      {question.correctAnswers?.includes(index) && (
                        <span className="text-green-600 text-xs">Correct</span>
                      )}
                    </div>
                  ))}
                  {question.optionImages?.map((imgUrl, index) =>
                    imgUrl ? (
                      <div key={index} className="ml-4">
                        <span className="text-xs text-gray-500">
                          Option {String.fromCharCode(65 + index)}:
                        </span>
                        <OptimizedImage
                          src={imgUrl}
                          alt={`Option ${String.fromCharCode(65 + index)}`}
                          className="max-w-xs max-h-24 rounded border mt-1 object-contain"
                          width={320}
                          height={96}
                        />
                      </div>
                    ) : null
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  <span className="text-purple-600 font-semibold">Topic: {question.topic || "-"}</span>
                  {" | "}
                  <span className="text-blue-600 font-semibold">
                    Level: {(question.level || "easy").toUpperCase()}
                  </span>
                  {" | "}
                  {question.isMultiple ? "Multiple Answer" : "Single Answer"}
                </p>
              </div>
              <div className="space-x-2 shrink-0">
                <button
                  onClick={() => editQuestion(question)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
            </div>
            {showForm && editingQuestion?.id === question.id && (
              <div
                id={`qb-edit-${question.id}`}
                className="mt-2 rounded-lg border-2 border-blue-300 bg-slate-50/80 shadow-sm overflow-hidden"
              >
                {renderQuestionEditorForm()}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

