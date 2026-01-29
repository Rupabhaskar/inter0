import { adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { id, name, phone, course } = await req.json();

    await adminDb.collection("students").doc(id).update({
      name,
      phone,
      course,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
