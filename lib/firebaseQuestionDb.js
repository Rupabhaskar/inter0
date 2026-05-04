/**
 * Second Firestore project (questionsdb-48bcc) – used only for tests/questions.
 * Not a collection: this is the Firestore database instance.
 *
 * In this project, collection name = college code (e.g. SCRRC).
 * When student's college code matches a collection name here, that collection holds the tests.
 *
 * Schema: collection(collegeCode).doc(testId) → { name, duration, testType }
 *         collection(collegeCode).doc(testId).collection("questions") → question docs
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseQuestionDbConfig = {
  apiKey: "AIzaSyCQzAG-5TdJnnhXfGVyGxf5JES_WfEDvwg",
  authDomain: "questionsdb-48bcc.firebaseapp.com",
  projectId: "questionsdb-48bcc",
  storageBucket: "questionsdb-48bcc.firebasestorage.app",
  messagingSenderId: "1064258846044",
  appId: "1:1064258846044:web:433c9fdef8d8372107d599",
  measurementId: "G-G8M264RZJM",
};

const questionDbAppName = "questionDb";

const questionDbApp =
  getApps().find((a) => a.name === questionDbAppName) ||
  initializeApp(firebaseQuestionDbConfig, questionDbAppName);

export const questionDb = getFirestore(questionDbApp);
