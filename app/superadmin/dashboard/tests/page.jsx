"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import imageCompression from "browser-image-compression";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    if (!qData.text || qData.correctAnswers.length === 0)
      return alert("Question & correct answer required");

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
      const rawOptions = [
        row["Option A"],
        row["Option B"],
        row["Option C"],
        row["Option D"],
      ];
      const options = rawOptions.filter(
        (x) => x !== undefined && x !== null && (x === 0 || x === "0" || String(x).trim() !== "")
      );

      if (!text || options.length < 2) continue;

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
    });
    setShowForm(true);
  };

  const handleQuestionImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // For new questions, pre-compress and store file to upload after question is created
    if (!editingQuestion) {
      // Pre-compress immediately (runs while user continues editing)
      const { file: compressedFile, previewUrl } = await preCompressImage(file);
      setQData({
        ...qData,
        questionImageFile: compressedFile,
        imageUrl: previewUrl,
      });
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
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">Which are prime numbers?</td>
                  <td className="border border-gray-300 p-2">2</td>
                  <td className="border border-gray-300 p-2">4</td>
                  <td className="border border-gray-300 p-2">3</td>
                  <td className="border border-gray-300 p-2">6</td>
                  <td className="border border-gray-300 p-2">A,C</td>
                  <td className="border border-gray-300 p-2">Math</td>
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
              <li>First row must contain column headers exactly as shown above</li>
              <li>Empty rows or rows with missing Question will be skipped</li>
            </ul>
          </div>
        </div>
      )}

      {showForm && !editingQuestion && (
        <div className="border p-4 rounded mb-6 bg-gray-50">
          <div className="mb-3">
            <input
              className="w-full p-2 border mb-3 rounded"
              placeholder="Question"
              value={qData.text}
              onChange={(e) =>
                setQData({ ...qData, text: e.target.value })
              }
            />

            {/* Subject Selection */}
            <input
              className="w-full p-2 border mb-3 rounded"
              placeholder="Subject/Section (e.g., Physics, Chemistry, Math)"
              value={qData.subject || ""}
              onChange={(e) =>
                setQData({ ...qData, subject: e.target.value })
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
                <p className="font-semibold">{q.text}</p>
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
                {q.subject && <span className="text-blue-600 font-semibold">{q.subject} • </span>}
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
                <input
                  className="w-full p-2 border mb-3 rounded"
                  placeholder="Question"
                  value={qData.text}
                  onChange={(e) =>
                    setQData({ ...qData, text: e.target.value })
                  }
                />
                <input
                  className="w-full p-2 border mb-3 rounded"
                  placeholder="Subject/Section (e.g., Physics, Chemistry, Math)"
                  value={qData.subject || ""}
                  onChange={(e) =>
                    setQData({ ...qData, subject: e.target.value })
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
