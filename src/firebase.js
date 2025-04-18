// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAQkMfhzFx-J23iwFvbMzsrEKjSd8cpmqc",
  authDomain: "reunion-3e25e.firebaseapp.com",
  projectId: "reunion-3e25e",
  storageBucket: "reunion-3e25e.firebasestorage.app",
  messagingSenderId: "270332351556",
  appId: "1:270332351556:web:61ab944009794d93c49811"
};

// Firebase 초기화

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, db, storage, functions };