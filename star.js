// star.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import "./pickers.js";
import { doc, setDoc, getDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// adding log for artists

const artistRef = doc(db, 'users', currentUser.uid, 'artists', band.toLowerCase());

const artistSnap = await getDoc(artistRef);

if (artistSnap.exists()) {
  await setDoc(artistRef, {
    appearances: increment(1),
    sources: ["show"]
  }, { merge: true });
} else {
  await setDoc(artistRef, {
    name: band,
    firstSeen: new Date(),
    appearances: 1,
    sources: ["show"]
  });
}

// -------------------
// Optional Diary + Firestore Form Submission
// -------------------
const form = document.getElementById('add-show-form');
const diaryInput = document.getElementById('diary'); // <textarea id="diary">

onAuthStateChanged(auth, user=>{
  if(!user){
    alert('Please log in to add a show.');
    form.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);
    return;
  }

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const band = document.getElementById('band').value.trim();
    const venue = document.getElementById('venue').value.trim();
    const date = customDateInput.value.trim();
    const diary = diaryInput.value.trim();

    if(!band || !venue || !date) return;

    try{
      const userShowsRef = collection(db, 'users', user.uid, 'shows');
      const showData = {
        band,
        venue,
        date,
        bgImage: bgInput.value || 'blackband.png',
        createdAt: new Date()
      };
      if(diary) showData.diary = diary;

      await addDoc(userShowsRef, showData);
      window.location.href='index.html';
    } catch(err){
      console.error('Error saving show:', err);
      alert('Failed to save show. Please try again.');
    }
  });
});