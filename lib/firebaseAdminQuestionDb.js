/**
 * Firebase Admin for the questions DB project (questionsdb-48bcc).
 * Lazy initialization: no init at module load (avoids build-time errors on Vercel).
 * Call getAdminQuestionDb() only at runtime inside API handlers.
 *
 * Env: QUESTION_DB_PROJECT_ID, QUESTION_DB_CLIENT_EMAIL, QUESTION_DB_PRIVATE_KEY
 * (Private key: single line with literal \n is supported.)
 */
import admin from "firebase-admin";

const QUESTION_DB_APP_NAME = "questionDbAdmin";

/** Cached Firestore instance; set on first successful init (runtime only). */
let _adminQuestionDb = null;

/**
 * Normalize private key from env (Vercel/single-line with \n).
 * - Remove surrounding quotes
 * - Convert literal \n to real newlines
 * - CRLF/CR -> LF, trim lines and whole key
 */
function normalizePrivateKey(privateKey) {
  if (!privateKey || typeof privateKey !== "string") return "";
  let key = privateKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }
  key = key
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
  return key;
}

/**
 * Returns Firestore instance for the Question DB project, or null if not configured / init failed.
 * Initializes only when first called at runtime (never during build).
 * Reuses named app "questionDbAdmin" if already initialized.
 */
export function getAdminQuestionDb() {
  if (_adminQuestionDb !== null) {
    return _adminQuestionDb;
  }

  const projectId = process.env.QUESTION_DB_PROJECT_ID;
  const clientEmail = process.env.QUESTION_DB_CLIENT_EMAIL;
  const rawPrivateKey = process.env.QUESTION_DB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    return null;
  }

  try {
    const existingApp = admin.app(QUESTION_DB_APP_NAME);
    _adminQuestionDb = admin.firestore(existingApp);
    return _adminQuestionDb;
  } catch {
    // App not initialized yet
  }

  const privateKey = normalizePrivateKey(rawPrivateKey);
  if (!privateKey || !privateKey.includes("BEGIN PRIVATE KEY")) {
    return null;
  }

  try {
    admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      QUESTION_DB_APP_NAME
    );
    _adminQuestionDb = admin.firestore(admin.app(QUESTION_DB_APP_NAME));
    return _adminQuestionDb;
  } catch (err) {
    if (err?.code === "app/duplicate-app" || err?.message?.includes("already exists")) {
      try {
        _adminQuestionDb = admin.firestore(admin.app(QUESTION_DB_APP_NAME));
        return _adminQuestionDb;
      } catch {
        // fall through to null
      }
    } else {
      console.error("Firebase Admin Question DB init error:", err);
    }
    return null;
  }
}
