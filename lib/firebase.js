// import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: "AIzaSyAqRJ2G5kMLiii1tzoZNE_BDinm_YPz1_Q",
//   authDomain: "interjee-mains.firebaseapp.com",
//   projectId: "interjee-mains",
//   storageBucket: "interjee-mains.firebasestorage.app",
//   messagingSenderId: "596375562764",
//   appId: "1:596375562764:web:44c534971901b73f79dc29",
// };

// const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// export const auth = getAuth(app);
// export const db = getFirestore(app);


import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAqRJ2G5kMLiii1tzoZNE_BDinm_YPz1_Q",
  authDomain: "interjee-mains.firebaseapp.com",
  projectId: "interjee-mains",
  storageBucket: "interjee-mains.firebasestorage.app",
  messagingSenderId: "596375562764",
  appId: "1:596375562764:web:44c534971901b73f79dc29",
};

/**
 * ✅ PRIMARY APP
 * Used for admin login (DO NOT use this to create users)
 */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * ✅ SECONDARY APP
 * Used ONLY for creating users (prevents admin logout)
 */
const secondaryApp = initializeApp(firebaseConfig, "secondary");

/**
 * Auth instances
 */
export const auth = getAuth(app);               // Admin session
export const secondaryAuth = getAuth(secondaryApp); // User creation only

/**
 * Firestore
 */
export const db = getFirestore(app);

/**
 * Storage
 */
export const storage = getStorage(app);
