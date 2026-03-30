// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAavRMHSoKc9IxmyUb7W_IbLNa-pmVoUVw",
  authDomain: "bands322-98e2b.firebaseapp.com",
  projectId: "bands322-98e2b",
  storageBucket: "bands322-98e2b.firebasestorage.app",
  messagingSenderId: "255200010894",
  appId: "1:255200010894:web:8e08f90861869333129fdf",
  measurementId: "G-Y1XTYDZVH6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);