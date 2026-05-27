// ============================================================
// FIREBASE CONFIGURATION
// Ganti dengan konfigurasi Firebase project kamu sendiri
// Daftar di: https://console.firebase.google.com
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "cloudvault-36285.firebaseapp.com",
  projectId: "cloudvault-36285",
  storageBucket: "cloudvault-36285.firebasestorage.app",
  messagingSenderId: "1032732613397",
  appId: "1:1032732613397:web:..."
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
