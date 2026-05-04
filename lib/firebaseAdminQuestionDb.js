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

const PEM_BEGIN = "-----BEGIN PRIVATE KEY-----";
const PEM_END = "-----END PRIVATE KEY-----";

/**
 * Normalize private key from env (Vercel/single-line with \n).
 * - Remove surrounding quotes, convert literal \n to real newlines
 * - Keep only the first PEM block (drops duplicate keys / trailing junk that breaks ASN.1)
 * - Re-chunk one-line PEM bodies to 64-char lines (same idea as lib/firebaseAdmin.js)
 */
function normalizePrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return "";
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, "\n");

  const b = key.indexOf(PEM_BEGIN);
  const e = key.indexOf(PEM_END);
  if (b !== -1 && e !== -1 && e > b) {
    key = key.slice(b, e + PEM_END.length);
  }

  // Single-line PEM (common in .env): reconstruct standard 64-char lines
  if (key.includes(PEM_BEGIN) && key.includes(PEM_END) && !key.includes("\n")) {
    const body = key
      .replace(PEM_BEGIN, "")
      .replace(PEM_END, "")
      .replace(/\s+/g, "");
    const chunkedBody = body.match(/.{1,64}/g)?.join("\n") || body;
    key = `${PEM_BEGIN}\n${chunkedBody}\n${PEM_END}`;
  } else {
    key = key
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim();
  }
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
  if (!privateKey || !privateKey.includes(PEM_BEGIN)) {
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
