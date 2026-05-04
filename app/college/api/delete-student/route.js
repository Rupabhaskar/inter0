import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { id, uid, collegeCode } = await req.json();
    const studentUid = uid || id;
    const code = (collegeCode != null && String(collegeCode).trim() !== "")
      ? String(collegeCode).trim()
      : "_";

    if (!studentUid) {
      return NextResponse.json({ error: "Student uid is required" }, { status: 400 });
    }

    // 1️⃣ Delete Auth user
    await adminAuth.deleteUser(studentUid);

    // 2️⃣ Delete Firestore doc: students/{collegeCode}/ids/{uid}
    await adminDb
      .collection("students")
      .doc(code)
      .collection("ids")
      .doc(studentUid)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
