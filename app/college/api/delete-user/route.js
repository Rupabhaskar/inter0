import { adminAuth, adminDb } from "../../../../lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    let authDeleted = false;
    let authErrorOccurred = false;
    
    // 1️⃣ Delete Auth user
    try {
      await adminAuth.deleteUser(uid);
      authDeleted = true;
      console.log("Auth user deleted successfully");
    } catch (authError) {
      authErrorOccurred = true;
      // If user doesn't exist in Auth, that's okay
      if (authError.code === "auth/user-not-found") {
        console.log("Auth user not found (may have been already deleted)");
        authDeleted = true; // Consider it successful if user doesn't exist
      } else if (authError.code === 2 || authError.message?.includes("DECODER") || authError.message?.includes("metadata")) {
        console.error("Auth deletion failed due to Admin SDK config error:", authError.message);
        // Will handle this after Firestore attempt
      } else {
        console.error("Auth deletion error:", authError.message);
      }
    }

    // 2️⃣ Delete Firestore doc (uid is the document ID)
    let firestoreDeleted = false;
    try {
      await adminDb.collection("users").doc(uid).delete();
      firestoreDeleted = true;
      console.log("Firestore document deleted successfully");
    } catch (firestoreError) {
      console.error("Firestore deletion error:", firestoreError);
      // If Firestore deletion fails due to Admin SDK config, return specific error code
      if (firestoreError.code === 2 || firestoreError.message?.includes("DECODER") || firestoreError.message?.includes("metadata")) {
        // If Auth was deleted but Firestore failed, still return error so client can handle Firestore
        return NextResponse.json(
          { 
            error: authDeleted 
              ? "Auth user deleted, but Firestore deletion failed. Client will attempt Firestore deletion."
              : "Firebase Admin credentials error. Both Auth and Firestore deletion failed.",
            code: "ADMIN_CONFIG_ERROR",
            uid: uid, // Return uid so client can delete from Firestore
            authDeleted: authDeleted // Let client know if Auth was deleted
          },
          { status: 500 }
        );
      }
      throw firestoreError;
    }

    // If both succeeded, return success
    if (authDeleted && firestoreDeleted) {
      return NextResponse.json({ success: true, message: "User deleted from both Auth and Firestore" });
    }
    
    // If Auth failed but Firestore succeeded
    if (!authDeleted && firestoreDeleted) {
      return NextResponse.json({ 
        success: true, 
        message: "Firestore deleted, but Auth deletion failed. User may still be able to login.",
        authDeleted: false
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    
    // Provide more helpful error messages
    if (error.code === 2 || error.message?.includes("DECODER") || error.message?.includes("metadata")) {
      return NextResponse.json(
        { 
          error: "Firebase Admin configuration error. Please check your environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID).",
          code: "ADMIN_CONFIG_ERROR"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 400 }
    );
  }
}
