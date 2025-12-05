// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase web config
const firebaseConfig = {
  apiKey: "AIzaSyB7Hm_wBEFR0NBplzNbrKpPZBW7H1xQkDQ",
  authDomain: "truebite-csc.firebaseapp.com",
  projectId: "truebite-csc",
  storageBucket: "truebite-csc.firebasestorage.app",
  messagingSenderId: "1009611252374",
  appId: "1:1009611252374:web:beb99ee5504ad616a5d8b7",
  measurementId: "G-QFBSSG3ZS1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export things the rest of your app will use
export const auth = getAuth(app);
export const db = getFirestore(app);
