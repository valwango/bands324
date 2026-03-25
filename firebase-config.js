// Firebase configuration and initialization
// 1. Replace the config object with your Firebase project credentials
// 2. Add <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js"></script>
//    and <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js"></script>
//    and <script src="https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js"></script>
//    to your HTML files before this script

const firebaseConfig = {
    apiKey: "AIzaSyAavRMHSoKc9IxmyUb7W_IbLNa-pmVoUVw",
    authDomain: "bands322-98e2b.firebaseapp.com",
    projectId: "bands322-98e2b",
    storageBucket: "bands322-98e2b.firebasestorage.app",
    messagingSenderId: "255200010894",
    appId: "1:255200010894:web:8e08f90861869333129fdf",
    measurementId: "G-Y1XTYDZVH6"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Example: check login state
// auth.onAuthStateChanged(user => {
//   if (user) {
//     // User is signed in
//   } else {
//     // Not signed in
//   }
// });
