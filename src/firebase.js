// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged ,GoogleAuthProvider  } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyANztxTFqEwfR_5Tj2u-Dlfj8EZikRAn5o",
  authDomain: "productsmy-ae46e.firebaseapp.com",
  projectId: "productsmy-ae46e",
  storageBucket: "productsmy-ae46e.firebasestorage.app",
  messagingSenderId: "693675074601",
  appId: "1:693675074601:web:291a4f54ebb4fab4626838",
  measurementId: "G-K0RLD0C55N"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

console.log("app.options", app.options); // projectId, apiKey, authDomain 확인
console.log("auth.config", getAuth().config); // 사용 중인 API host 확인 