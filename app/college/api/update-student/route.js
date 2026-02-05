import { adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { id, name, phone, course, collegeCode } = await req.json();
    const uid = id;

    const updates = { name, phone, course, updatedAt: new Date() };
    const code = (collegeCode != null && String(collegeCode).trim() !== "") ? String(collegeCode).trim() : "_";

    const studentRef = adminDb.collection("students").doc(code).collection("ids").doc(uid);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      const group = adminDb.collectionGroup("ids");
      const snap = await group.where("uid", "==", uid).limit(1).get();
      if (snap.empty) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }
      await snap.docs[0].ref.update(updates);
    } else {
      await studentRef.update(updates);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
