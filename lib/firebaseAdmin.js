import admin from "firebase-admin";

const FALLBACK_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "interjee-mains";

function initFallbackApp() {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: FALLBACK_PROJECT_ID });
  }
}

function normalizePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return rawKey;

  let key = rawKey.trim();

  // Remove wrapping quotes if present.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Convert escaped newlines first.
  key = key.replace(/\\n/g, "\n");

  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";

  // Handle one-line PEM values by reconstructing line breaks.
  if (
    key.includes(beginMarker) &&
    key.includes(endMarker) &&
    !key.includes("\n")
  ) {
    const body = key
      .replace(beginMarker, "")
      .replace(endMarker, "")
      .replace(/\s+/g, "");

    const chunkedBody = body.match(/.{1,64}/g)?.join("\n") || body;
    key = `${beginMarker}\n${chunkedBody}\n${endMarker}`;
  }

  return key;
}

function isLikelyPemKey(key) {
  if (!key || typeof key !== "string") return false;
  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";
  if (!key.includes(beginMarker) || !key.includes(endMarker)) return false;
  const body = key
    .replace(beginMarker, "")
    .replace(endMarker, "")
    .replace(/\s+/g, "");
  // Base64-ish body with reasonable minimum length.
  return /^[A-Za-z0-9+/=]+$/.test(body) && body.length > 128;
}

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase Admin credentials not found. Some admin operations may fail.");
      initFallbackApp();
    } else {
      const formattedPrivateKey = normalizePrivateKey(privateKey);

      if (!isLikelyPemKey(formattedPrivateKey)) {
        console.warn("Firebase Admin private key appears invalid PEM; using fallback init.");
        initFallbackApp();
      } else {
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
          // Avoid noisy repeated hard errors across build workers; fallback keeps app usable.
          console.warn("Firebase Admin cert init failed; using fallback init.");
          initFallbackApp();
        }
      }
    }
  } catch (error) {
    console.warn("Firebase Admin initialization error; using fallback init.");
    // Initialize with default credentials as fallback
    try {
      initFallbackApp();
    } catch (fallbackError) {
      console.error("Firebase Admin fallback initialization failed.");
    }
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
