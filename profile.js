// profile.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Elements
const usernameInput = document.getElementById('username-input');
const emailInput = document.getElementById('email-input');
const saveBtn = document.getElementById('save-profile-btn');
const changePasswordBtn = document.getElementById('change-password-btn');
const passwordModal = document.getElementById('password-modal');
const closePasswordModal = document.getElementById('close-password-modal');
let passwordInput = null;
let submitPasswordBtn = null;

// -------------------
// Auth state
// -------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  // Set initial username
  const username = userDoc.exists() && userDoc.data().username ? userDoc.data().username : (user.displayName || '');
  usernameInput.value = username;
  emailInput.value = user.email;

  // -------------------
  // Save profile changes
  // -------------------
  saveBtn.onclick = async () => {
    const newUsername = usernameInput.value.trim();
    const newEmail = emailInput.value.trim();
    if (!newUsername || !newEmail) return;

    try {
      // Update Firestore
      await setDoc(userDocRef, { username: newUsername }, { merge: true });

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: newUsername });

      // Update email
      if (newEmail !== user.email) {
        await updateEmail(user, newEmail);
      }

      saveBtn.textContent = 'saved!';
      setTimeout(() => { saveBtn.textContent = 'save changes'; }, 1200);
    } catch (err) {
      alert('Error updating profile: ' + err.message);
      console.error(err);
    }
  };

  // -------------------
  // Change password
  // -------------------
  changePasswordBtn.onclick = () => {
    passwordModal.classList.add('open');
    passwordInput = document.getElementById('password-input');
    submitPasswordBtn = document.getElementById('submit-password-btn');
    passwordInput.value = '';
    submitPasswordBtn.textContent = 'submit new password';
  };

  closePasswordModal.onclick = () => {
    passwordModal.classList.remove('open');
  };

  document.getElementById('submit-password-btn').onclick = async () => {
    const newPassword = document.getElementById('password-input').value.trim();
    if (!newPassword) return alert('Please enter a new password.');
    try {
      await updatePassword(user, newPassword);
      submitPasswordBtn.textContent = 'Password Changed!';
      setTimeout(() => { passwordModal.classList.remove('open'); }, 1200);
    } catch (err) {
      alert('Failed to change password: ' + err.message);
      console.error(err);
    }
  };
});