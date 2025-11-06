// Use Firebase v10 modular SDKs from CDN (works on GitHub Pages)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile,
  GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Your config (from you)
const firebaseConfig = {
  apiKey: "AIzaSyDdbIV-UlM7r-h3e8agXcj7dtfJkuBFmpw",
  authDomain: "fenwanovels-project.firebaseapp.com",
  projectId: "fenwanovels-project",
  storageBucket: "fenwanovels-project.firebasestorage.app",
  messagingSenderId: "207330391263",
  appId: "1:207330391263:web:e1cf10459c6109c055e56a",
  measurementId: "G-JH15KFZDLG"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile,
  GoogleAuthProvider, signInWithPopup, signOut
};
