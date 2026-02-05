"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import imageCompression from "browser-image-compression";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  setDoc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { questionDb } from "@/lib/firebaseQuestionDb";
import { onAuthStateChanged } from "firebase/auth";

/* ================= MAIN PAGE ================= */

export default function Page() {
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [expandedTests, setExpandedTests] = useState(new Set());

  const [testName, setTestName] = useState("");
  const [duration, setDuration] = useState("");
  const [testType, setTestType] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
  const [collegeCode, setCollegeCode] = useState(null);

  /* ================= COLLEGE CODE (for question DB) ================= */

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) {
        setCollegeCode(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.role === "collegeAdmin") {
            setCollegeCode(data.collegeShort ?? null);
          } else if (data.collegeAdminUid) {
            const adminSnap = await getDoc(doc(db, "users", data.collegeAdminUid));
            const adminData = adminSnap.exists() ? adminSnap.data() : {};
            setCollegeCode(adminData.collegeShort ?? null);
          } else {
            setCollegeCode(null);
          }
        } else {
          setCollegeCode(null);
        }
      } catch {
        setCollegeCode(null);
      }
    });
  }, []);

  /* ================= LOAD TESTS (questionDb only – this college) ================= */

  useEffect(() => {
    const code = (collegeCode != null && String(collegeCode).trim() !== "")
      ? String(collegeCode).trim()
      : null;
    if (!code) {
      setTests([]);
      return;
    }
    const testsRef = collection(questionDb, code);
    const unsub = onSnapshot(testsRef, (snap) => {
      setTests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [collegeCode]);

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

  /* ================= TEST CRUD ================= */

  const createTest = async () => {
    if (!testName || !duration || !testType) return alert("Fill all fields");
    const code = (collegeCode != null && String(collegeCode).trim() !== "")
      ? String(collegeCode).trim()
      : null;
    if (!code) return alert("College code not found. Please ensure you are linked to a college.");
    await addDoc(collection(questionDb, code), {
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
    const typeVal = prompt("Edit Test Type (e.g. JEE Mains, JEE Advance, EAMCET)", t.testType || "");
    if (!name || !time || !typeVal) return;
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) return;
    await updateDoc(doc(questionDb, code, t.id), {
      name,
      duration: Number(time),
      testType: typeVal,
    });
  };

  const deleteTest = async (id) => {
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) return;
    const qSnap = await getDocs(collection(questionDb, code, id, "questions"));
    await Promise.all(qSnap.docs.map((d) => deleteDoc(doc(questionDb, code, id, "questions", d.id))));
    await deleteDoc(doc(questionDb, code, id));
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
      const response = await fetch("/college/api/upload-image", {
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

      await fetch("/college/api/upload-image", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Error deleting image:", err);
    }
  };

  /* ================= SAVE QUESTION (questionDb only) ================= */

  const saveQuestion = async () => {
    if (!selectedTest?.id) return;
    if (!qData.text || qData.correctAnswers.length === 0)
      return alert("Question & correct answer required");

    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) return alert("College code not found.");

    let questionId;

    if (editingQuestion) {
      questionId = editingQuestion.id;
    } else {
      const questionsRef = collection(questionDb, code, selectedTest.id, "questions");
      const newQuestionRef = await addDoc(questionsRef, {
        text: qData.text,
        options: qData.options,
        optionImages: [],
        optionImagePublicIds: [],
        correctAnswers: qData.correctAnswers,
        isMultiple: qData.correctAnswers.length > 1,
        imageUrl: "",
        imagePublicId: "",
        subject: qData.subject || "",
      });
      questionId = newQuestionRef.id;
    }

    let finalImageUrl = qData.imageUrl || "";
    let finalImagePublicId = qData.imagePublicId || "";
    const finalOptionImages = [...(qData.optionImages || [])];
    const finalOptionImagePublicIds = [...(qData.optionImagePublicIds || [])];

    if (!editingQuestion) {
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
      doc(questionDb, code, selectedTest.id, "questions", questionId),
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
      const options = [
        row["Option A"],
        row["Option B"],
        row["Option C"],
        row["Option D"],
      ].filter(Boolean);

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

    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) return alert("College code not found.");

    const BATCH_SIZE = 10;
    const questionsRef = collection(questionDb, code, selectedTest.id, "questions");

    for (let i = 0; i < questionsToAdd.length; i += BATCH_SIZE) {
      const batch = questionsToAdd.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((q) => addDoc(questionsRef, q)));
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
          <input
            className="w-full p-2 mb-3 border rounded"
            placeholder="JEE Mains or EAMCET"
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
          />
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
          <h2 className="text-xl font-bold mb-4">Tests</h2>

          {tests.map((t) => {
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
                          onClick={() => deleteTest(t.id)}
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
        </div>

        {/* QUESTIONS */}
        {selectedTest && (
        <QuestionSection
          test={selectedTest}
          collegeCode={collegeCode}
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
  collegeCode,
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

  useEffect(() => {
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
    if (!code) {
      setQuestions([]);
      return;
    }
    const unsub = onSnapshot(
      collection(questionDb, code, test.id, "questions"),
      (snap) => {
        setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsub();
  }, [test.id, collegeCode]);

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

  return (
    <div className="bg-white p-6 rounded-xl shadow md:col-span-3">
      <div className="flex justify-between mb-4">
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
              <li><strong>Correct Answer:</strong> Single answer (e.g., "A") or multiple answers (e.g., "A,C" or "A, C")</li>
              <li><strong>Subject:</strong> Subject/Section name (optional, e.g., Physics, Chemistry, Math)</li>
              <li>First row must contain column headers exactly as shown above</li>
              <li>Empty rows or rows with missing Question will be skipped</li>
            </ul>
          </div>
        </div>
      )}

      {showForm && (
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
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Question Image (Optional)
              </label>
              {qData.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={qData.imageUrl}
                    alt="Question"
                    className="max-w-xs max-h-48 rounded border"
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
              <div className="ml-6 mt-2">
                <label className="block text-sm font-medium mb-1">
                  Option {i + 1} Image (Optional)
                </label>
                {(qData.optionImages && qData.optionImages[i]) ? (
                  <div className="relative inline-block">
                    <img
                      src={qData.optionImages[i]}
                      alt={`Option ${i + 1}`}
                      className="max-w-xs max-h-32 rounded border"
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

      {questions.map((q) => (
        <div key={q.id} className="border p-4 rounded mb-2">
          <div className="flex justify-between">
            <div className="flex-1">
              <p className="font-semibold">{q.text}</p>
              {q.imageUrl && (
                <img
                  src={q.imageUrl}
                  alt="Question"
                  className="max-w-md max-h-48 rounded border mt-2"
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
                      <img
                        src={imgUrl}
                        alt={`Option ${String.fromCharCode(65 + idx)}`}
                        className="max-w-xs max-h-24 rounded border mt-1"
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
                  
                  await Promise.all(deletePromises);
                  const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : null;
                  if (code) {
                    await deleteDoc(doc(questionDb, code, test.id, "questions", q.id));
                  }
                }}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


