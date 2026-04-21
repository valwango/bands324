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

  // Dynamic guest/opener rows
  const artistFields = document.getElementById('artist-fields');

  function makeAddRowBtn(afterWrapper) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '+';
    btn.classList.add('add-row-btn');
    btn.addEventListener('click', () => addArtistRow(afterWrapper));
    return btn;
  }

  function addArtistRow(afterWrapper, initialValue = '') {
    const wrapper = document.createElement('div');
    wrapper.classList.add('artist-input-wrap');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'opener / guest';
    input.value = initialValue;
    input.classList.add('star-input', 'artist-input');
    input.addEventListener('blur', () => {
      if (!input.value.trim() && artistFields.querySelectorAll('.artist-input-wrap').length > 1) {
        wrapper.remove();
        syncFirstBtn();
      }
    });
    const addBtn = makeAddRowBtn(wrapper);
    wrapper.appendChild(input);
    wrapper.appendChild(addBtn);
    if (afterWrapper && afterWrapper.nextSibling) {
      artistFields.insertBefore(wrapper, afterWrapper.nextSibling);
    } else {
      artistFields.appendChild(wrapper);
    }
    syncFirstBtn();
    input.focus();
  }

  // Wire first static row
  const firstWrap = artistFields.querySelector('.artist-input-wrap');
  const firstAddBtn = makeAddRowBtn(firstWrap);
  firstAddBtn.classList.add('add-row-btn--right');
  firstWrap.appendChild(firstAddBtn);

  function syncFirstBtn() {
    const hasGuests = artistFields.querySelectorAll('.artist-input-wrap').length > 1;
    firstAddBtn.style.display = hasGuests ? 'none' : '';
  }

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const band = document.getElementById('band').value.trim();
    const venue = document.getElementById('venue').value.trim();
    const date = customDateInput.value.trim();
    const diary = diaryInput.value.trim();

    if(!band || !venue || !date) return;

    const guests = [...artistFields.querySelectorAll('.artist-input-wrap input')]
      .slice(1)
      .map(i => i.value.trim())
      .filter(Boolean);

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
      if(guests.length) showData.guests = guests;

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