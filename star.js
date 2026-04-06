// star.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, doc, setDoc, getDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import "./pickers.js?v=20260405i";
import { goToPage } from "./navigation.js";

// -------------------
// Optional Diary + Firestore Form Submission
// -------------------
const form = document.getElementById('add-show-form');
const diaryInput = document.getElementById('diary'); // <textarea id="diary">
const customDateInput = document.getElementById('custom-date');
const bgInput = document.getElementById('bgImage');
const loadingEl = document.getElementById('page-loading');

function hidePageLoader() {
  if (loadingEl) loadingEl.classList.add('is-hidden');
}

function autoResizeDiary() {
  if (!diaryInput) return;
  diaryInput.style.height = 'auto';
  diaryInput.style.height = `${diaryInput.scrollHeight}px`;
}

if (diaryInput) {
  autoResizeDiary();
  diaryInput.addEventListener('input', autoResizeDiary);
}

onAuthStateChanged(auth, user=>{
  if(!user){
    alert('Please log in to add a show.');
    form.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);
    return;
  }

  hidePageLoader();

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

      // Keep a per-user artist log for show appearances.
      const artistRef = doc(db, 'users', user.uid, 'artists', band.toLowerCase());
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

      autoResizeDiary();
      goToPage("index.html");
    } catch(err){
      console.error('Error saving show:', err);
      alert('Failed to save show. Please try again.');
    }
  });
});