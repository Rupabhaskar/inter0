"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import imageCompression from "browser-image-compression";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function linearMatrixToLatex(input) {
  const s = String(input || "").trim();
  if (!s) return "";

  // Word/Equation "linear" matrix often looks like: ■(12&50&1@12&1&1@51&1&1)
  // We'll convert it to LaTeX bmatrix.
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

  // Remove zero-width chars frequently produced by copy from PDFs/Word
  const cleaned = raw.replace(/[\u200B-\u200D\uFEFF]/g, "");

  const start = cleaned.indexOf("[");
  const end = cleaned.indexOf("]", start + 1);
  if (start === -1 || end === -1 || end <= start) return null;

  const inside = cleaned.slice(start + 1, end);

  // Tokenize by whitespace, keep sqrt markers if present
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

  // If copy lost the √ symbol entirely but text indicates square roots,
  // restore sqrt for perfect squares > 1 (e.g. 4, 9, 16, 25).
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

  // Infer columns (prefer 3, then 4) based on token count.
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
  if (!raw.toLowerCase().includes("<sup") && !raw.toLowerCase().includes("<sub"))
    return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");

    const walk = (node) => {
      if (!node) return "";
      const nodeName = (node.nodeName || "").toLowerCase();

      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || "";
      }

      if (nodeName === "sup") {
        const inner = Array.from(node.childNodes).map(walk).join("").trim();
        return inner ? `^{${inner}}` : "";
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

  // If it already has explicit LaTeX exponents, leave it alone.
  if (s.includes("^") || s.includes("^{")) return s;

  // Only apply when it looks like an equation/expression (reduce false positives).
  if (!/[=+\-*/]/.test(s)) return s;

  // Convert patterns like B2=A, x10+y2=0 into B^{2}=A, x^{10}+y^{2}=0
  // Skip cases like "H2O" by requiring the digit to be followed by an operator/space/end.
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

function normalizeMathLikeToken(token) {
  const t = String(token || "").trim();
  if (!t) return "";

  if (t.startsWith("√")) {
    const inner = t.slice(1).trim();
    return inner ? `\\sqrt{${inner}}` : t;
  }

  // OCR often reads √ as V/v, but only for short math-like tokens.
  // Avoid converting normal words like "Variables" to sqrt.
  if (/^[Vv]\(([^)]+)\)$/.test(t)) {
    const inner = t.slice(2, -1).trim();
    return inner ? `\\sqrt{${inner}}` : t;
  }
  if (/^[Vv][0-9]$/.test(t)) return `\\sqrt{${t.slice(1)}}`;
  // OCR digit confusion after V (sqrt): T->7, l/I->1, O->0, S->5, B->8
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

  // Keep the sentence/title part before matrix math noise begins.
  const stopAt = [
    raw.indexOf("["),
    raw.indexOf("\\begin{"),
    raw.indexOf("\\sqrt{"),
  ]
    .filter((x) => x >= 0)
    .sort((a, b) => a - b)[0];

  let head = (stopAt >= 0 ? raw.slice(0, stopAt) : raw)
    .replace(/\s+/g, " ")
    .trim();

  // Normalize common OCR heading noise: 3x^{3} -> 3x3
  head = head.replace(/(\d+)\s*x\^\{?(\d+)\}?/gi, "$1x$2");

  // Ignore if it's mostly math/noise.
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

  // Common math unicode symbols -> LaTeX-friendly forms
  s = s
    .replace(/≤/g, " \\le ")
    .replace(/≥/g, " \\ge ")
    .replace(/≠/g, " \\ne ")
    .replace(/≈/g, " \\approx ")
    .replace(/×/g, " \\times ")
    .replace(/÷/g, " \\div ");

  // Convert sqrt unicode patterns: √x, √(x+y), √{xy}
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

  // If OCR gives bracketed matrix with line breaks, rebuild matrix.
  const matrixLatex = matrixFromBracketedOcr(text);
  if (matrixLatex) return joinNarrativeWithMath(rawText, matrixLatex);

  // Basic OCR cleanup; do token-based math conversion only (safer for words).
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

  // If OCR math looks unreliable, prefer clean heading text over wrong equations.
  if (headingOnly && noisyMathLike) {
    return headingOnly;
  }

  // If heading + flat sqrt tokens are mixed together, rebuild matrix from math tokens
  // and keep heading text above it.
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

  // If OCR returns flattened math tokens, rebuild into a matrix automatically.
  // Example: "\sqrt{1} \sqrt{9} 5 16 78 25" -> bmatrix (2x3 or 3x2).
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
    if (Number.isInteger(sq)) {
      cols = sq; // 4->2x2, 9->3x3
    } else if (n % 3 === 0) {
      cols = 3; // prefer 3-column layout in exam-style matrices
    } else if (n % 2 === 0) {
      cols = 2;
    }

    if (cols) {
      const rows = [];
      for (let i = 0; i < n; i += cols) {
        rows.push(tokens.slice(i, i + cols).join(" & "));
      }
      const latex = `\\begin{bmatrix}\n${rows.join(" \\\\\n")}\n\\end{bmatrix}`;
      return joinNarrativeWithMath(rawText, latex);
    }
  }

  // Recovery for common OCR corruption of:
  // [ sqrt(x) sqrt(y); sqrt(x+y) sqrt(xy) ]
  // Example noisy OCR: "\sqrt{z} \sqrt{y} VEty Ty"
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
    // OCR often reads x as z in this pattern.
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

  // Avoid rendering full natural-language sentences in math mode,
  // because KaTeX math mode collapses normal text spaces.
  if (hasSentenceLikeWords && !isMatrix) return null;

  // Only try KaTeX when it looks like math/latex (or was converted).
  const looksMath =
    converted !== raw ||
    converted.includes("\\") ||
    /[\^_]|\\sqrt|\\frac|\\begin\{/.test(converted);

  if (!looksMath) return null;

  try {
    return katex.renderToString(converted, {
      throwOnError: false,
      displayMode: true,
      strict: "ignore",
      trust: true,
    });
  } catch {
    return null;
  }
}

/** Use next/image for http(s) URLs (Cloudinary), <img> for blob previews */
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

/* ================= MAIN PAGE ================= */

export default function Page() {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [expandedTests, setExpandedTests] = useState(new Set());

  const [testName, setTestName] = useState("");
  const [duration, setDuration] = useState("");
  const [testType, setTestType] = useState("");
  const [showTestTypeSuggestions, setShowTestTypeSuggestions] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [testTypeFilter, setTestTypeFilter] = useState(""); // "" = All, "jee", "eamcet"
  const [testNameSearch, setTestNameSearch] = useState("");
  const [testsPage, setTestsPage] = useState(0);

  const TESTS_PAGE_SIZE = 5;

  // Default test type options (shown when user types; e.g. "jee" → JEE Mains, JEE Advance, etc.)
  const DEFAULT_TEST_TYPES = ["JEE Mains", "JEE Advance", "EAMCET"];
  const existingTestTypes = [...new Set(tests.map((t) => t.testType).filter(Boolean))];
  const allTestTypeOptions = [...new Set([...DEFAULT_TEST_TYPES, ...existingTestTypes])];
  const testTypeSuggestions = testType
    ? allTestTypeOptions.filter((opt) => opt.toLowerCase().includes(testType.toLowerCase()))
    : [];

  const emptyQuestion = {
    text: "",
    options: [""],
    optionImages: [""],
    optionImagePublicIds: [""],
    optionImageFiles: [null],
    correctAnswers: [],
    imageUrl: "",
    imagePublicId: "",
    questionImageFile: null,
    subject: "",
    topic: "",
  };

  const [qData, setQData] = useState(emptyQuestion);

  /* ================= LOAD TESTS ================= */

  // Super Admin tests use separate collection: superadminTests
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "superadminTests"), (snap) => {
      setTests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  /* ================= SCROLL TO TOP ================= */

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ================= FILTER TESTS BY TYPE ================= */
  const typeFilteredTests = testTypeFilter
    ? tests.filter((t) => {
        const type = (t.testType || "").toLowerCase();
        if (testTypeFilter === "jee") return type.includes("jee");
        if (testTypeFilter === "eamcet") return type.includes("eamcet");
        return true;
      })
    : tests;

  /* ================= FILTER BY TEST NAME (SEARCH) ================= */
  const filteredTests = testNameSearch.trim()
    ? typeFilteredTests.filter((t) =>
        (t.name || "").toLowerCase().includes(testNameSearch.trim().toLowerCase())
      )
    : typeFilteredTests;

  /* ================= SORT ALPHABETICALLY + PAGINATE ================= */
  const sortedTests = [...filteredTests].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { numeric: true })
  );
  const totalPages = Math.max(1, Math.ceil(sortedTests.length / TESTS_PAGE_SIZE));
  const currentPage = Math.min(testsPage, totalPages - 1);
  const paginatedTests = sortedTests.slice(
    currentPage * TESTS_PAGE_SIZE,
    (currentPage + 1) * TESTS_PAGE_SIZE
  );

  useEffect(() => {
    setTestsPage(0);
  }, [testTypeFilter, testNameSearch]);

  /* ================= TEST CRUD ================= */

  const createTest = async () => {
    if (!testName || !duration || !testType) return alert("Fill all fields");
    await addDoc(collection(db, "superadminTests"), {
      name: testName,
      duration: Number(duration),
      testType: testType,
    });
    setTestName("");
    setDuration("");
    setTestType("");
  };

  const editTest = async (t) => {
    const name = prompt("Edit Test Name", t.name);
    const time = prompt("Edit Duration", t.duration);
    const testType = prompt("Edit Test Type", t.testType || "");
    if (!name || !time || !testType) return;
    await updateDoc(doc(db, "superadminTests", t.id), {
      name,
      duration: Number(time),
      testType,
    });
  };

  const deleteTest = async (id) => {
    await deleteDoc(doc(db, "superadminTests", id));
    if (selectedTest?.id === id) setSelectedTest(null);
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const toggleTest = (testId) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
        if (selectedTest?.id === testId) setSelectedTest(null);
      } else {
        newSet.add(testId);
        const test = tests.find(t => t.id === testId);
        if (test) setSelectedTest(test);
      }
      return newSet;
    });
  };

  /* ================= COMPRESS IMAGE ================= */

  const compressImageIfNeeded = async (file) => {
    const fileSizeKB = file.size / 1024;

    // Skip compression for small files
    if (fileSizeKB < 100) {
      return file;
    }

    try {
      // Calculate optimal quality based on file size (single pass approach)
      // Larger files get more aggressive compression to avoid multiple passes
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

  /* ================= PRE-COMPRESS IMAGE ================= */

  const preCompressImage = async (file) => {
    const compressed = await compressImageIfNeeded(file);
    // Create object URL for preview
    const previewUrl = URL.createObjectURL(compressed);
    return { file: compressed, previewUrl };
  };

  /* ================= UPLOAD IMAGE ================= */

  const uploadImage = async (file, questionId, optionNumber, imageType) => {
    if (!file || !questionId) return null;

    // File is already pre-compressed, upload directly
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
      alert("Failed to upload image: " + err.message);
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

  /* ================= SAVE QUESTION ================= */

  const saveQuestion = async () => {
    if (!selectedTest?.id) return;
    if (!qData.text || !qData.topic || !qData.topic.trim() || qData.correctAnswers.length === 0)
      return alert("Question, topic/chapter & correct answer are required");

    let questionId;

    if (editingQuestion) {
      questionId = editingQuestion.id;
    } else {
      // Create question first to get ID
      const newQuestionRef = await addDoc(
        collection(db, "superadminTests", selectedTest.id, "questions"),
        {
          text: qData.text,
          options: qData.options,
          optionImages: [],
          optionImagePublicIds: [],
          correctAnswers: qData.correctAnswers,
          isMultiple: qData.correctAnswers.length > 1,
          imageUrl: "",
          imagePublicId: "",
          subject: qData.subject || "",
          topic: qData.topic || "",
        }
      );
      questionId = newQuestionRef.id;
    }

    // Initialize final values
    let finalImageUrl = qData.imageUrl || "";
    let finalImagePublicId = qData.imagePublicId || "";
    const finalOptionImages = [...(qData.optionImages || [])];
    const finalOptionImagePublicIds = [...(qData.optionImagePublicIds || [])];

    // Upload all images in parallel (for new questions)
    if (!editingQuestion) {
      const uploadPromises = [];

      // Queue question image upload
      if (qData.questionImageFile) {
        uploadPromises.push(
          uploadImage(qData.questionImageFile, questionId, null, "question")
            .then(result => {
              if (result) {
                finalImageUrl = result.url;
                finalImagePublicId = result.publicId;
              }
            })
        );
      }

      // Queue all option image uploads
      if (qData.optionImageFiles) {
        qData.optionImageFiles.forEach((file, i) => {
          if (file) {
            uploadPromises.push(
              uploadImage(file, questionId, i, "option")
                .then(result => {
                  if (result) {
                    finalOptionImages[i] = result.url;
                    finalOptionImagePublicIds[i] = result.publicId;
                  }
                })
            );
          }
        });
      }

      // Execute all uploads in parallel
      await Promise.all(uploadPromises);
    }

    const payload = {
      text: qData.text,
      options: qData.options,
      optionImages: finalOptionImages,
      optionImagePublicIds: finalOptionImagePublicIds,
      correctAnswers: qData.correctAnswers,
      isMultiple: qData.correctAnswers.length > 1,
      imageUrl: finalImageUrl,
      imagePublicId: finalImagePublicId,
      subject: qData.subject || "",
      topic: qData.topic || "",
    };

    await updateDoc(
      doc(db, "superadminTests", selectedTest.id, "questions", questionId),
      payload
    );

    setQData(emptyQuestion);
    setEditingQuestion(null);
    setShowForm(false);
  };

  /* ================= FILE UPLOAD ================= */

  const handleFileUpload = async (e) => {
    if (!selectedTest?.id) return alert("Select test first");

    const file = e.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const map = { A: 0, B: 1, C: 2, D: 3 };

    // Prepare all valid questions first
    const questionsToAdd = [];
    for (const row of rows) {
      const text = row["Question"];
      const topicCell = row["Topic"] || row["Chapter"] || "";
      const topic = String(topicCell || "").trim();
      const rawOptions = [
        row["Option A"],
        row["Option B"],
        row["Option C"],
        row["Option D"],
      ];
      const options = rawOptions.filter(
        (x) => x !== undefined && x !== null && (x === 0 || x === "0" || String(x).trim() !== "")
      );

      if (!text || options.length < 2 || !topic) continue;

      const correct = String(row["Correct Answer"])
        .toUpperCase()
        .split(",")
        .map((x) => map[x.trim()])
        .filter((x) => x !== undefined);

      if (correct.length === 0) continue;

      questionsToAdd.push({
        text,
        options,
        correctAnswers: correct,
        isMultiple: correct.length > 1,
        subject: row["Subject"] || "",
        topic,
      });
    }

    // Upload all questions in parallel batches
    const BATCH_SIZE = 10;
    const collectionRef = collection(db, "superadminTests", selectedTest.id, "questions");

    for (let i = 0; i < questionsToAdd.length; i += BATCH_SIZE) {
      const batch = questionsToAdd.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(q => addDoc(collectionRef, q)));
    }

    alert("Excel upload complete");
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">

        {/* CREATE TEST */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-4">Create Test</h2>
          <input
            className="w-full p-2 mb-3 border rounded"
            placeholder="Test Name"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
          />
          <div className="relative mb-3">
            <input
              className="w-full p-2 border rounded"
              placeholder="Test type (e.g. JEE, EAMCET)"
              value={testType}
              onChange={(e) => {
                setTestType(e.target.value);
                setShowTestTypeSuggestions(true);
              }}
              onFocus={() => setShowTestTypeSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTestTypeSuggestions(false), 200)}
              autoComplete="off"
            />
            {showTestTypeSuggestions && testTypeSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-auto">
                {testTypeSuggestions.map((opt) => (
                  <li
                    key={opt}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-gray-800 border-b border-gray-100 last:border-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setTestType(opt);
                      setShowTestTypeSuggestions(false);
                    }}
                  >
                    {opt}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input
            className="w-full p-2 mb-3 border rounded"
            type="number"
            placeholder="Duration (minutes)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <button
            onClick={createTest}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Create Test
          </button>
        </div>

        {/* TEST LIST */}
        <div className="bg-white p-6 rounded-xl shadow md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold">Tests</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by test name..."
                value={testNameSearch}
                onChange={(e) => setTestNameSearch(e.target.value)}
                className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-2 flex-wrap">
                <span className="text-sm text-gray-500 self-center">Filter:</span>
              <button
                type="button"
                onClick={() => setTestTypeFilter("")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  !testTypeFilter ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTestTypeFilter("jee")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  testTypeFilter === "jee" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                JEE
              </button>
              <button
                type="button"
                onClick={() => setTestTypeFilter("eamcet")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  testTypeFilter === "eamcet" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                EAMCET
              </button>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Showing {paginatedTests.length} of {sortedTests.length} test{sortedTests.length !== 1 ? "s" : ""}
            {sortedTests.length > TESTS_PAGE_SIZE && (
              <span className="ml-1">
                (page {currentPage + 1} of {totalPages})
              </span>
            )}
          </p>

          {sortedTests.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">
              {tests.length === 0
                ? "No tests yet. Create one above."
                : testNameSearch.trim()
                  ? `No tests match "${testNameSearch.trim()}". Try a different search.`
                  : `No tests match "${testTypeFilter === "jee" ? "JEE" : "EAMCET"}". Try another filter.`}
            </p>
          ) : null}

          {paginatedTests.map((t) => {
            const isExpanded = expandedTests.has(t.id);
            const isSelected = selectedTest?.id === t.id;

            return (
              <div
                key={t.id}
                className={`border rounded mb-2 overflow-hidden transition-all ${
                  isSelected ? "border-blue-500 shadow-md" : "border-gray-200"
                }`}
              >
                <div className={`p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${
                  isExpanded ? "bg-blue-50" : "bg-white"
                }`}>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{t.name}</p>
                    <p className="text-sm text-gray-500">
                      {t.testType && <span className="text-blue-600">{t.testType} • </span>}
                      {t.duration} mins
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleTest(t.id)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        isExpanded
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-green-500 hover:bg-green-600 text-white"
                      }`}
                    >
                      {isExpanded ? (
                        <>
                          <span className="hidden sm:inline">Close</span>
                          <span className="sm:hidden">✕</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Open</span>
                          <span className="sm:hidden">▶</span>
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <>
                        <button
                          onClick={() => editTest(t)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">✏️</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the test "${t.name}"? This cannot be undone.`)) {
                              deleteTest(t.id);
                            }
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">🗑️</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {sortedTests.length > TESTS_PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setTestsPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setTestsPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* QUESTIONS */}
        {selectedTest && (
        <QuestionSection
          test={selectedTest}
          qData={qData}
          setQData={setQData}
          saveQuestion={saveQuestion}
          editingQuestion={editingQuestion}
          setEditingQuestion={setEditingQuestion}
          showForm={showForm}
          setShowForm={setShowForm}
          handleFileUpload={handleFileUpload}
          uploadImage={uploadImage}
          deleteImage={deleteImage}
          preCompressImage={preCompressImage}
        />
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-50 flex items-center justify-center group"
          aria-label="Scroll to top"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 transition-transform group-hover:-translate-y-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ================= QUESTION SECTION ================= */

function QuestionSection({
  test,
  qData,
  setQData,
  saveQuestion,
  editingQuestion,
  setEditingQuestion,
  showForm,
  setShowForm,
  handleFileUpload,
  uploadImage,
  deleteImage,
  preCompressImage,
}) {
  const [questions, setQuestions] = useState([]);
  const [showFormat, setShowFormat] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrError, setOcrError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "superadminTests", test.id, "questions"),
      (snap) => {
        setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, [test.id]);

  const addOption = () =>
    setQData((p) => ({
      ...p,
      options: [...p.options, ""],
      optionImages: [...(p.optionImages || []), ""],
      optionImagePublicIds: [...(p.optionImagePublicIds || []), ""]
    }));

  const updateOption = (i, v) => {
    const opts = [...qData.options];
    opts[i] = v;
    setQData({ ...qData, options: opts });
  };

  const deleteOption = (i) => {
    setQData((p) => ({
      ...p,
      options: p.options.filter((_, x) => x !== i),
      optionImages: (p.optionImages || []).filter((_, x) => x !== i),
      optionImagePublicIds: (p.optionImagePublicIds || []).filter((_, x) => x !== i),
      correctAnswers: p.correctAnswers
        .filter((x) => x !== i)
        .map((x) => (x > i ? x - 1 : x)),
    }));
  };

  const toggleCorrect = (i) => {
    setQData((p) => ({
      ...p,
      correctAnswers: p.correctAnswers.includes(i)
        ? p.correctAnswers.filter((x) => x !== i)
        : [...p.correctAnswers, i],
    }));
  };

  const editQuestion = (q) => {
    setEditingQuestion(q);
    setOcrText("");
    setOcrError("");
    setQData({
      text: q.text,
      options: q.options,
      optionImages: q.optionImages || [],
      optionImagePublicIds: q.optionImagePublicIds || [],
      optionImageFiles: new Array(q.options?.length || 0).fill(null),
      correctAnswers: q.correctAnswers,
      imageUrl: q.imageUrl || "",
      imagePublicId: q.imagePublicId || "",
      questionImageFile: null,
      subject: q.subject || "",
      topic: q.topic || "",
    });
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
    const source = imageSource || qData.questionImageFile || qData.imageUrl;
    if (!source) {
      setOcrError("Upload question image first.");
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

      // Prefer plain text to preserve user spacing/content as-is.
      // Use HTML fallback only when plain text is unavailable.
      const base = paste || htmlLatex;
      let converted = convertMathPasteToLatex(base);
      converted = normalizeEquationSyntax(converted);
      converted = convertUnicodeSuperscripts(converted);
      converted = fixMissingExponents(converted);
      if (converted === base) return;

      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? qData.text.length;
      const end = el.selectionEnd ?? qData.text.length;
      const next =
        qData.text.slice(0, start) + converted + qData.text.slice(end);
      setQData({ ...qData, text: next });
    } catch {
      // If anything goes wrong, let default paste happen.
    }
  };

  const handleQuestionImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrText("");
    setOcrError("");

    // For new questions, pre-compress and store file to upload after question is created
    if (!editingQuestion) {
      // Pre-compress immediately (runs while user continues editing)
      const { file: compressedFile, previewUrl } = await preCompressImage(file);
      setQData({
        ...qData,
        questionImageFile: compressedFile,
        imageUrl: previewUrl,
      });
      void runQuestionImageOcr(compressedFile);
      e.target.value = "";
      return;
    }

    // For editing, compress and upload immediately
    const { file: compressedFile } = await preCompressImage(file);

    if (qData.imageUrl && qData.imageUrl.startsWith("http")) {
      await deleteImage(
        qData.imageUrl,
        qData.imagePublicId,
        editingQuestion.id,
        null,
        "question"
      );
    }

    const result = await uploadImage(compressedFile, editingQuestion.id, null, "question");
    if (result) {
      setQData({
        ...qData,
        imageUrl: result.url,
        imagePublicId: result.publicId,
        questionImageFile: null
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

  const handleOptionImageUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    // Pre-compress immediately
    const { file: compressedFile, previewUrl } = await preCompressImage(file);

    // For new questions, store pre-compressed file to upload after question is created
    if (!editingQuestion) {
      const currentOptionFiles = [...(qData.optionImageFiles || [])];
      currentOptionFiles[index] = compressedFile;
      while (currentOptionFiles.length < qData.options.length) {
        currentOptionFiles.push(null);
      }

      const currentImages = [...(qData.optionImages || [])];
      currentImages[index] = previewUrl;
      while (currentImages.length < qData.options.length) {
        currentImages.push("");
      }

      setQData({
        ...qData,
        optionImages: currentImages,
        optionImageFiles: currentOptionFiles
      });
      e.target.value = "";
      return;
    }

    // For editing, upload immediately (already compressed)
    const currentImages = [...(qData.optionImages || [])];
    const currentImagePublicIds = [...(qData.optionImagePublicIds || [])];

    if (currentImages[index] && currentImages[index].startsWith("http")) {
      await deleteImage(
        currentImages[index],
        currentImagePublicIds[index],
        editingQuestion.id,
        index,
        "option"
      );
    }

    const result = await uploadImage(compressedFile, editingQuestion.id, index, "option");

    if (result) {
      const newImages = [...currentImages];
      const newImagePublicIds = [...currentImagePublicIds];
      newImages[index] = result.url;
      newImagePublicIds[index] = result.publicId;

      while (newImages.length < qData.options.length) {
        newImages.push("");
        newImagePublicIds.push("");
      }

      setQData({
        ...qData,
        optionImages: newImages,
        optionImagePublicIds: newImagePublicIds
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
      await deleteImage(
        qData.imageUrl,
        qData.imagePublicId,
        editingQuestion.id,
        null,
        "question"
      );
    }
    // Revoke object URL if it's a preview
    if (qData.imageUrl && qData.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(qData.imageUrl);
    }
    setOcrText("");
    setOcrError("");
    setQData({ ...qData, imageUrl: "", imagePublicId: "", questionImageFile: null });
  };

  const removeOptionImage = async (index) => {
    const currentImages = [...(qData.optionImages || [])];
    const currentImagePublicIds = [...(qData.optionImagePublicIds || [])];
    const currentFiles = [...(qData.optionImageFiles || [])];

    if (currentImages[index] && editingQuestion && currentImages[index].startsWith("http")) {
      await deleteImage(
        currentImages[index],
        currentImagePublicIds[index],
        editingQuestion.id,
        index,
        "option"
      );
    }

    // Revoke object URL if it's a preview
    if (currentImages[index] && currentImages[index].startsWith("blob:")) {
      URL.revokeObjectURL(currentImages[index]);
    }

    currentImages[index] = "";
    currentImagePublicIds[index] = "";
    currentFiles[index] = null;

    setQData({
      ...qData,
      optionImages: currentImages,
      optionImagePublicIds: currentImagePublicIds,
      optionImageFiles: currentFiles
    });
  };

  const subjectList = [...new Set(questions.map((q) => (q.subject || "").trim()).filter(Boolean))].sort();
  const DUPLICATES_FILTER = "__duplicates__";
  const subjectAndTextToIds = new Map();
  questions.forEach((q) => {
    const subject = (q.subject || "").trim().toLowerCase();
    const text = (q.text || "").trim().toLowerCase();
    if (!text) return;
    const key = `${subject}\n${text}`;
    if (!subjectAndTextToIds.has(key)) subjectAndTextToIds.set(key, []);
    subjectAndTextToIds.get(key).push(q.id);
  });
  const duplicateQuestionIds = new Set(
    [...subjectAndTextToIds.values()].filter((ids) => ids.length > 1).flat()
  );
  const filteredQuestions = !subjectFilter
    ? questions
    : subjectFilter === DUPLICATES_FILTER
      ? questions.filter((q) => duplicateQuestionIds.has(q.id))
      : questions.filter((q) => (q.subject || "").trim() === subjectFilter);

  return (
    <div className="bg-white p-6 rounded-xl shadow md:col-span-3">
      <div className="flex flex-wrap justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold">Questions – {test.name}</h2>

        <div className="flex gap-2">
          <div className="relative">
            <label className="bg-purple-600 text-white px-4 py-2 rounded cursor-pointer">
              Upload Excel
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button
              onClick={() => setShowFormat(!showFormat)}
              className="ml-2 bg-gray-500 text-white px-3 py-2 rounded text-sm"
              title="Show Excel Format"
            >
              📋 Format
            </button>
          </div>

          <button
            onClick={() => {
              setQData({ text: "", options: [""], optionImages: [""], optionImagePublicIds: [""], optionImageFiles: [null], correctAnswers: [], imageUrl: "", imagePublicId: "", questionImageFile: null, subject: "" });
              setEditingQuestion(null);
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* Subject filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label htmlFor="subject-filter" className="text-sm font-medium text-gray-700">
          Subject:
        </label>
        <select
          id="subject-filter"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[180px]"
        >
          <option value="">All subjects</option>
          <option value={DUPLICATES_FILTER}>
            Duplicate questions only ({duplicateQuestionIds.size})
          </option>
          {subjectList.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          Showing {filteredQuestions.length} of {questions.length} question{questions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Excel Format Guide */}
      {showFormat && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-blue-800">Excel Upload Format</h3>
            <button
              onClick={() => setShowFormat(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border border-gray-300 p-2 text-left">Question</th>
                  <th className="border border-gray-300 p-2 text-left">Option A</th>
                  <th className="border border-gray-300 p-2 text-left">Option B</th>
                  <th className="border border-gray-300 p-2 text-left">Option C</th>
                  <th className="border border-gray-300 p-2 text-left">Option D</th>
                  <th className="border border-gray-300 p-2 text-left">Correct Answer</th>
                  <th className="border border-gray-300 p-2 text-left">Subject</th>
                  <th className="border border-gray-300 p-2 text-left">Topic / Chapter</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2">What is 2+2?</td>
                  <td className="border border-gray-300 p-2">3</td>
                  <td className="border border-gray-300 p-2">4</td>
                  <td className="border border-gray-300 p-2">5</td>
                  <td className="border border-gray-300 p-2">6</td>
                  <td className="border border-gray-300 p-2">B</td>
                  <td className="border border-gray-300 p-2">Math</td>
                  <td className="border border-gray-300 p-2">Addition</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">Which are prime numbers?</td>
                  <td className="border border-gray-300 p-2">2</td>
                  <td className="border border-gray-300 p-2">4</td>
                  <td className="border border-gray-300 p-2">3</td>
                  <td className="border border-gray-300 p-2">6</td>
                  <td className="border border-gray-300 p-2">A,C</td>
                  <td className="border border-gray-300 p-2">Math</td>
                  <td className="border border-gray-300 p-2">Prime Numbers</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-sm text-gray-700">
            <p className="font-semibold mb-1">📝 Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Question:</strong> The question text (required)</li>
              <li><strong>Option A, B, C, D:</strong> Answer options (at least 2 required)</li>
              <li><strong>Correct Answer:</strong> Single answer (e.g., &quot;A&quot;) or multiple answers (e.g., &quot;A,C&quot; or &quot;A, C&quot;)</li>
              <li><strong>Subject:</strong> Subject/Section name (optional, e.g., Physics, Chemistry, Math)</li>
              <li><strong>Topic / Chapter:</strong> Topic or chapter name (required; rows without this will be skipped)</li>
              <li>First row must contain column headers exactly as shown above</li>
              <li>Empty rows or rows with missing Question/Topic will be skipped</li>
            </ul>
          </div>
        </div>
      )}

      {showForm && !editingQuestion && (
        <div className="border p-4 rounded mb-6 bg-gray-50">
          <div className="mb-3">
            <textarea
              className="w-full p-2 border mb-3 rounded min-h-[80px] resize-y"
              placeholder="Question (press Enter for new line)"
              value={qData.text}
              onChange={(e) =>
                setQData({ ...qData, text: e.target.value })
              }
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

            {/* Subject Selection */}
            <input
              className="w-full p-2 border mb-3 rounded"
              placeholder="Subject/Section (e.g., Physics, Chemistry, Math)"
              value={qData.subject || ""}
              onChange={(e) =>
                setQData({ ...qData, subject: e.target.value })
              }
            />

            {/* Topic / Chapter */}
            <input
              className="w-full p-2 border mb-3 rounded"
              placeholder="Topic / Chapter name"
              value={qData.topic || ""}
              onChange={(e) =>
                setQData({ ...qData, topic: e.target.value })
              }
            />

            {/* Question Image Upload */}
            <div
              className="mb-3"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleQuestionImageDrop}
              onPaste={handleQuestionImagePaste}
            >
              <label className="block text-sm font-medium mb-1">
                Question Image (Optional)
              </label>
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
                    ✕
                  </button>
                </div>
              ) : (
                <label className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-pointer hover:bg-gray-300">
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQuestionImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="mb-3 rounded border bg-white p-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => runQuestionImageOcr()}
                  disabled={ocrLoading || !qData.imageUrl}
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
                  Upload a question image, then click &quot;Analyze Image Text&quot;.
                </p>
              )}
            </div>
          </div>

          {qData.options.map((o, i) => (
            <div key={i} className="border p-3 rounded mb-2 bg-white">
              <div className="flex gap-2 mb-2 items-center">
                <input
                  type="checkbox"
                  checked={qData.correctAnswers.includes(i)}
                  onChange={() => toggleCorrect(i)}
                />
                <input
                  className="flex-1 p-2 border rounded"
                  value={o}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                <button
                  onClick={() => deleteOption(i)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>

              {/* Option Image Upload */}
              <div
                className="ml-6 mt-2"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => handleOptionImageDrop(e, i)}
                onPaste={(e) => handleOptionImagePaste(e, i)}
              >
                <label className="block text-sm font-medium mb-1">
                  Option {i + 1} Image (Optional)
                </label>
                {(qData.optionImages && qData.optionImages[i]) ? (
                  <div className="relative inline-block">
                    <OptimizedImage
                      src={qData.optionImages[i]}
                      alt={`Option ${i + 1}`}
                      className="max-w-xs max-h-32 rounded border object-contain"
                      width={320}
                      height={128}
                    />
                    <button
                      onClick={() => removeOptionImage(i)}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded cursor-pointer hover:bg-gray-300 text-sm">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleOptionImageUpload(e, i)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={addOption}
            className="bg-gray-700 text-white px-3 py-1 rounded"
          >
            + Add Option
          </button>

          <div className="mt-4 space-x-2">
            <button
              onClick={saveQuestion}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {filteredQuestions.length === 0 && questions.length > 0 && (
        <p className="text-gray-500 py-6 text-center">
          {subjectFilter === DUPLICATES_FILTER
            ? "No duplicate questions found. Each question has unique text."
            : "No questions match the selected subject. Choose \"All subjects\" or another subject."}
        </p>
      )}

      {filteredQuestions.map((q) => (
        <div key={q.id} className="mb-2">
          <div className="border p-4 rounded mb-2 bg-white">
            <div className="flex justify-between">
              <div className="flex-1">
                <p className="font-semibold whitespace-pre-wrap">{q.text}</p>
              {q.imageUrl && (
                <OptimizedImage
                  src={q.imageUrl}
                  alt="Question"
                  className="max-w-md max-h-48 rounded border mt-2 object-contain"
                  width={448}
                  height={192}
                />
              )}
              <div className="mt-2 space-y-1">
                {q.options?.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={`text-sm ${q.correctAnswers?.includes(idx) ? "text-green-600 font-semibold" : "text-gray-600"}`}>
                      {String.fromCharCode(65 + idx)}. {opt}
                    </span>
                    {q.correctAnswers?.includes(idx) && (
                      <span className="text-green-600 text-xs">✓</span>
                    )}
                  </div>
                ))}
                {q.optionImages && q.optionImages.map((imgUrl, idx) =>
                  imgUrl && (
                    <div key={idx} className="ml-4">
                      <span className="text-xs text-gray-500">Option {String.fromCharCode(65 + idx)}:</span>
                      <OptimizedImage
                        src={imgUrl}
                        alt={`Option ${String.fromCharCode(65 + idx)}`}
                        className="max-w-xs max-h-24 rounded border mt-1 object-contain"
                        width={320}
                        height={96}
                      />
                    </div>
                  )
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {q.subject && (
                  <span className="text-blue-600 font-semibold">
                    {q.subject}
                    {q.topic ? " • " : ""}
                  </span>
                )}
                {q.topic && (
                  <span className="text-purple-600 font-semibold">
                    {q.subject ? "" : "Topic: "} {q.topic}{" "}
                  </span>
                )}
                {q.isMultiple ? "Multiple Answer" : "Single Answer"}
              </p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => editQuestion(q)}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                Edit
              </button>
              <button
                onClick={async () => {
                  // Delete all associated images in parallel
                  const deletePromises = [];

                  if (q.imageUrl) {
                    deletePromises.push(
                      deleteImage(q.imageUrl, q.imagePublicId, q.id, null, "question")
                        .catch(err => console.error("Error deleting question image:", err))
                    );
                  }

                  if (q.optionImages && q.optionImagePublicIds) {
                    q.optionImages.forEach((imgUrl, idx) => {
                      if (imgUrl) {
                        deletePromises.push(
                          deleteImage(imgUrl, q.optionImagePublicIds?.[idx], q.id, idx, "option")
                            .catch(err => console.error("Error deleting option image:", err))
                        );
                      }
                    });
                  }

                  // Execute all deletions in parallel, then delete question
                  await Promise.all(deletePromises);
                  await deleteDoc(doc(db, "superadminTests", test.id, "questions", q.id));
                }}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
          </div>

          {/* Edit form: show directly below this question when Edit is clicked */}
          {editingQuestion?.id === q.id && (
            <div className="border p-4 rounded mb-6 bg-gray-50 mt-2">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-gray-800">Edit question</span>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingQuestion(null); }}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Close
                </button>
              </div>
              <div className="mb-3">
                <textarea
                  className="w-full p-2 border mb-3 rounded min-h-[80px] resize-y"
                  placeholder="Question (press Enter for new line)"
                  value={qData.text}
                  onChange={(e) =>
                    setQData({ ...qData, text: e.target.value })
                  }
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
                <input
                  className="w-full p-2 border mb-3 rounded"
                  placeholder="Subject/Section (e.g., Physics, Chemistry, Math)"
                  value={qData.subject || ""}
                  onChange={(e) =>
                    setQData({ ...qData, subject: e.target.value })
                  }
                />
                <input
                  className="w-full p-2 border mb-3 rounded"
                  placeholder="Topic / Chapter name"
                  value={qData.topic || ""}
                  onChange={(e) =>
                    setQData({ ...qData, topic: e.target.value })
                  }
                />
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
                      <OptimizedImage src={qData.imageUrl} alt="Question" className="max-w-xs max-h-48 rounded border object-contain" width={320} height={192} />
                      <button onClick={removeQuestionImage} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
                    </div>
                  ) : (
                    <label className="inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-pointer hover:bg-gray-300">
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleQuestionImageUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="mb-3 rounded border bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => runQuestionImageOcr()}
                      disabled={ocrLoading || !qData.imageUrl}
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
                      Upload a question image, then click &quot;Analyze Image Text&quot;.
                    </p>
                  )}
                </div>
              </div>
              {qData.options.map((o, i) => (
                <div key={i} className="border p-3 rounded mb-2 bg-white">
                  <div className="flex gap-2 mb-2 items-center">
                    <input type="checkbox" checked={qData.correctAnswers.includes(i)} onChange={() => toggleCorrect(i)} />
                    <input className="flex-1 p-2 border rounded" value={o} placeholder={`Option ${i + 1}`} onChange={(e) => updateOption(i, e.target.value)} />
                    <button onClick={() => deleteOption(i)} className="bg-red-500 text-white px-2 py-1 rounded">✕</button>
                  </div>
                  <div
                    className="ml-6 mt-2"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => handleOptionImageDrop(e, i)}
                    onPaste={(e) => handleOptionImagePaste(e, i)}
                  >
                    <label className="block text-sm font-medium mb-1">Option {i + 1} Image (Optional)</label>
                    {(qData.optionImages && qData.optionImages[i]) ? (
                      <div className="relative inline-block">
                        <OptimizedImage src={qData.optionImages[i]} alt={`Option ${i + 1}`} className="max-w-xs max-h-32 rounded border object-contain" width={320} height={128} />
                        <button onClick={() => removeOptionImage(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
                      </div>
                    ) : (
                      <label className="inline-block bg-gray-200 text-gray-700 px-3 py-1 rounded cursor-pointer hover:bg-gray-300 text-sm">
                        Upload Image
                        <input type="file" accept="image/*" onChange={(e) => handleOptionImageUpload(e, i)} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={addOption} className="bg-gray-700 text-white px-3 py-1 rounded">+ Add Option</button>
              <div className="mt-4 flex gap-2">
                <button onClick={saveQuestion} className="bg-green-600 text-white px-4 py-2 rounded">Save</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingQuestion(null); }} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
