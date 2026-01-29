import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase Admin credentials not found. Some admin operations may fail.");
      // Initialize with default credentials (will use Application Default Credentials if available)
      admin.initializeApp({
        projectId: projectId || "interjee-mains",
      });
    } else {
      // Handle private key formatting - support multiple formats
      let formattedPrivateKey = privateKey;
      
      // Remove surrounding quotes if present
      if ((formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) ||
          (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'"))) {
        formattedPrivateKey = formattedPrivateKey.slice(1, -1);
      }
      
      // Replace escaped newlines with actual newlines
      if (formattedPrivateKey.includes("\\n")) {
        formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, "\n");
      }
      
      // Ensure the key starts and ends correctly
      if (!formattedPrivateKey.includes("BEGIN PRIVATE KEY")) {
        console.warn("Private key format may be incorrect");
      }
      
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: formattedPrivateKey,
          }),
        });
        console.log("Firebase Admin initialized successfully");
      } catch (initError) {
        console.error("Firebase Admin cert initialization error:", initError);
        throw initError;
      }
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    // Initialize with default credentials as fallback
    try {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "interjee-mains",
      });
    } catch (fallbackError) {
      console.error("Firebase Admin fallback initialization failed:", fallbackError);
    }
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
