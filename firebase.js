// firebase.js (ES module) — put at repo root and edit config
// NOTE: install nothing — we load via CDN imports in module form below.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

// TODO: replace the object below with your Firebase project's config
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);

// re-export functions used in login/register pages
export {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
};

// firebase.js
// Replace the config below with your Firebase web app config (from Firebase Console)
// This file uses CDN modular imports (v9). Include this file with <script type="module" src="/firebase.js"></script>

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.31.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.31.0/firebase-auth.js";

const FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTHDOMAIN.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_BUCKET.appspot.com",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID"
};

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Expose what we need globally for other scripts
window._firebase = { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut };

// Utility: sign out (useful for logout link)
window.fenwaSignOut = async function(){
  try {
    await signOut(auth);
    localStorage.removeItem('fenwa_user');
    // optional: redirect to home page
    window.location.href = '/';
  } catch(e){
    console.error('Sign out error', e);
    alert('Sign out failed: ' + e.message);
  }
};
