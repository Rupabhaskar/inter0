/**
 * Firebase Admin for the questions DB project (questionsdb-48bcc).
 * Used server-side to read tests/questions with caching. Optional:
 * set QUESTION_DB_PROJECT_ID, QUESTION_DB_CLIENT_EMAIL, QUESTION_DB_PRIVATE_KEY in env.
 */
import admin from "firebase-admin";

const QUESTION_DB_APP_NAME = "questionDbAdmin";

function getQuestionDbAdmin() {
  const projectId = process.env.QUESTION_DB_PROJECT_ID;
  const clientEmail = process.env.QUESTION_DB_CLIENT_EMAIL;
  const privateKey = process.env.QUESTION_DB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    const existingApp = admin.app(QUESTION_DB_APP_NAME);
    return admin.firestore(existingApp);
  } catch {
    // App not initialized yet
  }

  let formattedPrivateKey = privateKey.trim();
  if (
    (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) ||
    (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'"))
  ) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1).trim();
  }
  // Vercel/env: key is often stored with literal \n (backslash + n) or real newlines
  if (formattedPrivateKey.includes("\\n")) {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, "\n");
  }
  // Normalize line endings and trim each line (avoids "Unparsed DER bytes remain" from stray \r or spaces)
  formattedPrivateKey = formattedPrivateKey
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  try {
    admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      },
      QUESTION_DB_APP_NAME
    );
    return admin.firestore(admin.app(QUESTION_DB_APP_NAME));
  } catch (err) {
    console.error("Firebase Admin Question DB init error:", err);
    return null;
  }
}

export const adminQuestionDb = getQuestionDbAdmin();
