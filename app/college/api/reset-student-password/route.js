export const runtime = "nodejs";

import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { uid, id, collegeCode } = await req.json();
    const studentUid = uid || id;
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : "_";

    const DEFAULT_PASSWORD = "Sample@123";

    await adminAuth.updateUser(studentUid, {
      password: DEFAULT_PASSWORD,
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
