export const runtime = "nodejs";

import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";

const FALLBACK_PASSWORD = "Sample@123";

async function getCollegeStudentDefaultPassword(collegeCode) {
  const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : "_";
  const snap = await adminDb.collection("users").where("role", "==", "collegeAdmin").where("collegeShort", "==", code).limit(1).get();
  if (snap.empty) return FALLBACK_PASSWORD;
  const pw = snap.docs[0].data().collegeStudentDefaultPassword;
  return (pw != null && String(pw).trim() !== "") ? String(pw).trim() : FALLBACK_PASSWORD;
}

export async function POST(req) {
  try {
    const { uid, id, collegeCode } = await req.json();
    const studentUid = uid || id;
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : "_";

    const newPassword = await getCollegeStudentDefaultPassword(code);

    await adminAuth.updateUser(studentUid, {
      password: newPassword,
    });

    const studentRef = adminDb.collection("students").doc(code).collection("ids").doc(studentUid);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      const snap = await adminDb.collectionGroup("ids").where("uid", "==", studentUid).limit(1).get();
      if (!snap.empty) {
        await snap.docs[0].ref.update({ defaultPassword: true });
      }
    } else {
      await studentRef.update({ defaultPassword: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
