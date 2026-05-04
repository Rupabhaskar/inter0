import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "College admin UID is required" },
        { status: 400 }
      );
    }

    let authDeleted = false;

    try {
      await adminAuth.deleteUser(uid);
      authDeleted = true;
    } catch (authError) {
      if (authError.code === "auth/user-not-found") {
        authDeleted = true;
      } else {
        console.error("Auth deletion error:", authError.message);
      }
    }

    try {
      await adminDb.collection("users").doc(uid).delete();
    } catch (firestoreError) {
      console.error("Firestore deletion error:", firestoreError);
      throw firestoreError;
    }

    return NextResponse.json({
      success: true,
      message: authDeleted
        ? "College admin deleted from Auth and Firestore"
        : "Firestore deleted; Auth user may still exist.",
    });
  } catch (error) {
    console.error("Delete college error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete college admin" },
      { status: 500 }
    );
  }
}
