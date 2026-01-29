export const runtime = "nodejs";

import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { uid, id } = await req.json();

    const DEFAULT_PASSWORD = "Sample@123";

    // 🔐 Reset Firebase Auth password
    await adminAuth.updateUser(uid, {
      password: DEFAULT_PASSWORD,
    });

    // 🔄 Update Firestore flag
    await adminDb.collection("students").doc(id).update({
      defaultPassword: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
