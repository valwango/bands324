// moon.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, doc, getDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import "./pickers.js";
import { goToPage } from "./navigation.js";

const form = document.getElementById('add-show-form');
const festivalNameInput = document.getElementById('festival-name');
const customDateInput = document.getElementById('custom-date');
const diaryInput = document.getElementById('diary');
const bgInput = document.getElementById('bgImage');

// Artist input and add button
const artistFields = document.getElementById('artist-fields');
const addArtistBtn = document.getElementById('add-artist-btn');
const firstArtistInput = document.getElementById('band'); // original artist input

let currentUser = null;

// -----------------------------
// Auth check
// -----------------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    alert('Please log in to add a festival.');
    form.querySelectorAll('input,textarea,button').forEach(el => el.disabled = true);
    return;
  }
  currentUser = user;
});

// -----------------------------
// Dynamic Artist Fields
// -----------------------------
// Add new artist field next to the first artist input
addArtistBtn.addEventListener('click', () => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('artist-input-wrap');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.marginBottom = '5px';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Artist';
  input.required = true;
  input.classList.add('star-input', 'artist-input');
  input.style.marginRight = '5px';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '×';
  removeBtn.classList.add('remove-artist-btn');
  removeBtn.addEventListener('click', () => wrapper.remove());

  wrapper.appendChild(input);
  wrapper.appendChild(removeBtn);
  artistFields.appendChild(wrapper);
});

// -----------------------------
// Form Submission
// -----------------------------
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return;

  const festivalName = festivalNameInput.value.trim();
  const date = customDateInput.value.trim();
  const diary = diaryInput.value.trim();
  const bgImage = bgInput.value || 'blacklong.png';

  // Collect all artist inputs including the first one
  const artistInputs = Array.from(artistFields.querySelectorAll('.artist-input'));
  if(firstArtistInput && firstArtistInput.value.trim()) artistInputs.unshift(firstArtistInput);

  const artistArray = artistInputs
    .map(input => input.value.trim())
    .filter(a => a);

  if (!festivalName || !date || artistArray.length === 0) {
    alert('Please fill in festival name, date, and at least one artist.');
    return;
  }

  try {
    // 1️⃣ Add festival
    await addDoc(collection(db, 'users', currentUser.uid, 'festivals'), {
      name: festivalName,
      date,
      artists: artistArray,
      diary: diary || '',
      bgImage,
      createdAt: new Date()
    });

    // 2️⃣ Update unified artist log
    for (const artist of artistArray) {
      const artistRef = doc(db, 'users', currentUser.uid, 'artists', artist.toLowerCase());
      const snap = await getDoc(artistRef);

      if (snap.exists()) {
        await setDoc(artistRef, {
          appearances: increment(1),
          sources: ["festival"]
        }, { merge: true });
      } else {
        await setDoc(artistRef, {
          name: artist,
          firstSeen: new Date(),
          appearances: 1,
          sources: ["festival"]
        });
      }
    }

    // Reset form
    form.reset();

    // Keep the original first artist input
    if(firstArtistInput) firstArtistInput.value = '';
    artistFields.querySelectorAll('.artist-input-wrap').forEach(row => row.remove());

    goToPage("index.html");
  } catch (err) {
    console.error('Error saving festival:', err);
    alert('Failed to save festival. Please try again.');
  }
});