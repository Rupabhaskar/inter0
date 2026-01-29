"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import Link from "next/link";
import { ArrowLeft, Upload, FileText } from "lucide-react";

export default function CollegeDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentCount, setStudentCount] = useState(0);

  // Limits (editable)
  const [maxStudents, setMaxStudents] = useState("");
  const [maxCollegeUsers, setMaxCollegeUsers] = useState("");
  const [amountPerStudent, setAmountPerStudent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Record payment / proof upload
  const [paymentAmount, setPaymentAmount] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofFileKey, setProofFileKey] = useState(0);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofMessage, setProofMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    async function fetchCollege() {
      setLoading(true);
      setError("");
      try {
        const snap = await getDoc(doc(db, "users", id));
        if (!snap.exists()) {
          setError("College not found.");
          setCollege(null);
          return;
        }
        const data = snap.data();
        if (data.role !== "collegeAdmin") {
          setError("Not a college admin.");
          setCollege(null);
          return;
        }
        setCollege({ id: snap.id, ...data });
        setMaxStudents(data.maxStudents != null ? String(data.maxStudents) : "");
        setMaxCollegeUsers(data.maxCollegeUsers != null ? String(data.maxCollegeUsers) : "");
        setAmountPerStudent(data.amountPerStudent != null ? String(data.amountPerStudent) : "");
      } catch (err) {
        console.error(err);
        setError("Failed to load college.");
      } finally {
        setLoading(false);
      }
    }
    fetchCollege();
  }, [id]);

  // Fetch student count for this college
  useEffect(() => {
    if (!id) return;
    async function fetchStudentCount() {
      try {
        const q = query(
          collection(db, "students"),
          where("collegeAdminUid", "==", id)
        );
        const snap = await getDocs(q);
        setStudentCount(snap.size);
      } catch {
        setStudentCount(0);
      }
    }
    fetchStudentCount();
  }, [id]);

  const handleSaveLimits = async (e) => {
    e.preventDefault();
    if (!id || !college) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const studentsNum = maxStudents.trim() === "" ? null : parseInt(maxStudents, 10);
      const usersNum = maxCollegeUsers.trim() === "" ? null : parseInt(maxCollegeUsers, 10);
      const amountNum = amountPerStudent.trim() === "" ? null : parseFloat(amountPerStudent);
      if (studentsNum != null && (isNaN(studentsNum) || studentsNum < 0)) {
        setSaveMessage("Please enter a valid number for students.");
        setSaving(false);
        return;
      }
      if (usersNum != null && (isNaN(usersNum) || usersNum < 0)) {
        setSaveMessage("Please enter a valid number for college users.");
        setSaving(false);
        return;
      }
      if (amountNum != null && (isNaN(amountNum) || amountNum < 0)) {
        setSaveMessage("Please enter a valid amount per student.");
        setSaving(false);
        return;
      }
      const updates = {
        maxStudents: studentsNum,
        maxCollegeUsers: usersNum,
        amountPerStudent: amountNum,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "users", id), updates);
      setCollege((prev) => prev ? { ...prev, ...updates } : null);
      setSaveMessage("Limits saved successfully.");
    } catch (err) {
      console.error(err);
      setSaveMessage(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!id || !college) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setProofMessage("Please enter a valid amount.");
      return;
    }
    if (!proofFile) {
      setProofMessage("Please select a proof file (image or PDF).");
      return;
    }
    setUploadingProof(true);
    setProofMessage("");
    try {
      const path = `college-payments/${id}/${Date.now()}_${proofFile.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, proofFile);
      const proofUrl = await getDownloadURL(storageRef);

      const payments = Array.isArray(college.payments) ? [...college.payments] : [];
      const newPayment = {
        amount: amount,
        proofUrl,
        fileName: proofFile.name,
        uploadedAt: new Date().toISOString(),
      };
      payments.push(newPayment);
      const currentReceived = typeof college.receivedAmount === "number" ? college.receivedAmount : 0;
      const newReceived = currentReceived + amount;

      await updateDoc(doc(db, "users", id), {
        payments,
        receivedAmount: newReceived,
        updatedAt: serverTimestamp(),
      });
      setCollege((prev) => prev ? { ...prev, payments, receivedAmount: newReceived } : null);
      setPaymentAmount("");
      setProofFile(null);
      setProofFileKey((k) => k + 1);
      setProofMessage("Proof uploaded. Received amount updated.");
    } catch (err) {
      console.error(err);
      setProofMessage(err.message || "Upload failed.");
    } finally {
      setUploadingProof(false);
    }
  };

  const collegeName = college?.collegeName || college?.name || college?.email || "Unknown";
  const amountPerStudentNum = college?.amountPerStudent != null ? Number(college.amountPerStudent) : 0;
  const studentsAllowed = college?.maxStudents != null ? Number(college.maxStudents) : 0;
  const totalAmount = studentsAllowed * amountPerStudentNum;
  const receivedAmount = typeof college?.receivedAmount === "number" ? college.receivedAmount : 0;
  const pendingAmount = Math.max(0, totalAmount - receivedAmount);
  const payments = Array.isArray(college?.payments) ? college.payments : [];

  return (
    <div className="space-y-6">
      <Link
        href="/superadmin/dashboard"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : college ? (
        <>
          <div className="bg-white p-6 rounded-xl shadow">
            <h1 className="text-2xl font-bold text-gray-800">
              This is college page of {collegeName}
            </h1>
            <p className="text-gray-600 mt-2">
              College admin details and more content can be added here.
            </p>
            {college.email && (
              <p className="text-sm text-gray-500 mt-2">Email: {college.email}</p>
            )}
          </div>

          {/* Access limits + Amount per student */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Access limits & amount
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Set students/user limits and amount per student. Save to update.
            </p>
            <form onSubmit={handleSaveLimits} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of students allowed
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for no limit.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of college users allowed
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxCollegeUsers}
                  onChange={(e) => setMaxCollegeUsers(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for no limit.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount per student
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amountPerStudent}
                  onChange={(e) => setAmountPerStudent(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Total = Number of students allowed × this amount (e.g. 20 × 1500 = 30,000).</p>
              </div>
              {saveMessage && (
                <p className={`text-sm ${saveMessage.startsWith("Limits saved") ? "text-green-600" : "text-red-600"}`}>
                  {saveMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save limits"}
              </button>
            </form>
            <div className="mt-4 pt-4 border-t text-sm text-gray-600">
              <p>
                <strong>Current:</strong> Students allowed:{" "}
                {college.maxStudents != null ? college.maxStudents : "No limit"} · College users:{" "}
                {college.maxCollegeUsers != null ? college.maxCollegeUsers : "No limit"} · Amount/student:{" "}
                {college.amountPerStudent != null ? college.amountPerStudent : "—"}
              </p>
            </div>
          </div>

          {/* Total & Received amount (after save) */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Amount summary
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Total = Number of students allowed × amount per student ({studentsAllowed} × {amountPerStudentNum.toLocaleString()} = {totalAmount.toLocaleString()}). Received reduces pending.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total amount</p>
                <p className="text-xl font-bold text-gray-800">
                  {totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Received amount</p>
                <p className="text-xl font-bold text-green-700">
                  {receivedAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Pending amount</p>
                <p className="text-xl font-bold text-amber-700">
                  {pendingAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Record payment / Upload proof */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Record payment & upload proof
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter amount received and upload proof. This will add to received amount and reduce pending.
            </p>
            <form onSubmit={handleUploadProof} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount received
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proof file (image or PDF)
                </label>
                <input
                  key={proofFileKey}
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              {proofMessage && (
                <p className={`text-sm ${proofMessage.includes("updated") ? "text-green-600" : "text-red-600"}`}>
                  {proofMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={uploadingProof}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Upload size={18} />
                {uploadingProof ? "Uploading..." : "Upload proof"}
              </button>
            </form>

            {/* List of received payments with proof */}
            {payments.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-semibold text-gray-800 mb-3">Received payments (proofs)</h3>
                <ul className="space-y-2">
                  {payments.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 py-2 border-b last:border-0 text-sm">
                      <span className="font-medium">{Number(p.amount).toLocaleString()}</span>
                      <span className="text-gray-500">
                        {p.uploadedAt ? new Date(p.uploadedAt).toLocaleString() : "—"}
                      </span>
                      <a
                        href={p.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <FileText size={16} />
                        {p.fileName || "Proof"}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-500 mt-2">
                  Total received: <strong>{receivedAmount.toLocaleString()}</strong> (pending: {pendingAmount.toLocaleString()})
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
