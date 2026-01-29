import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { id, uid } = await req.json();

    // 1️⃣ Delete Auth user
    await adminAuth.deleteUser(uid);

    // 2️⃣ Delete Firestore doc
    await adminDb.collection("students").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
