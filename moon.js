// moon.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setSelectedDate } from "./pickers.js?v=20260405i";
import { goToPage } from "./navigation.js";

const params = new URLSearchParams(window.location.search);
const festivalId = params.get('id');
const isEditing = !!festivalId;

const form = document.getElementById('add-show-form');
const festivalNameInput = document.getElementById('festival-name');
const venueInput = document.getElementById('venue');
const customDateInput = document.getElementById('custom-date');
const diaryInput = document.getElementById('diary');
const bgInput = document.getElementById('bgImage');
const loadingEl = document.getElementById('page-loading');
const submitBtn = document.getElementById('submit-btn');
const deleteBtn = document.getElementById('moon-delete');

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

// Artist inputs
const artistFields = document.getElementById('artist-fields');
const firstArtistInput = document.getElementById('band');

function makeAddRowBtn(afterWrapper) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '+';
  btn.classList.add('add-row-btn');
  btn.addEventListener('click', () => {
    addArtistRow(afterWrapper);
  });
  return btn;
}

function addArtistRow(afterWrapper, initialValue = '') {
  const wrapper = document.createElement('div');
  wrapper.classList.add('artist-input-wrap');

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'artist';
  input.value = initialValue;
  input.classList.add('star-input', 'artist-input');

  const addBtn = makeAddRowBtn(wrapper);

  input.addEventListener('blur', () => {
    if (!input.value.trim() && artistFields.querySelectorAll('.artist-input-wrap').length > 1) {
      wrapper.remove();
    }
  });

  wrapper.appendChild(input);
  wrapper.appendChild(addBtn);

  if (afterWrapper && afterWrapper.nextSibling) {
    artistFields.insertBefore(wrapper, afterWrapper.nextSibling);
  } else {
    artistFields.appendChild(wrapper);
  }

  input.focus();
}

// Wire the first static artist input
const firstStaticInput = artistFields ? artistFields.querySelector('.artist-input') : null;
if (firstStaticInput) {
  const firstWrap = firstStaticInput.closest('.artist-input-wrap');
  const firstAddBtn = makeAddRowBtn(firstWrap);
  firstWrap.appendChild(firstAddBtn);
}

let currentUser = null;

// -----------------------------
// Auth check
// -----------------------------
onAuthStateChanged(auth, async user => {
  if (!user) {
    alert('Please log in.');
    form.querySelectorAll('input,textarea,button').forEach(el => el.disabled = true);
    return;
  }
  currentUser = user;

  if (isEditing) {
    // Load existing festival data
    const festRef = doc(db, 'users', user.uid, 'festivals', festivalId);
    try {
      const snap = await getDoc(festRef);
      if (!snap.exists()) {
        alert('Festival not found');
        goToPage('index.html');
        return;
      }
      const data = snap.data();
      festivalNameInput.value = data.name || '';
      customDateInput.value = data.date || '';
      if (venueInput) venueInput.value = data.venue || '';
      diaryInput.value = data.diary || '';
      bgInput.value = data.bgImage || 'blacklong.png';
      autoResizeDiary();

      if (data.date) setSelectedDate(data.date);

      // Populate color picker selection
      document.querySelectorAll('.color-circle').forEach(circle => {
        circle.classList.remove('selected');
        if (circle.style.backgroundImage.includes(data.bgImage)) {
          circle.classList.add('selected');
        }
      });

      // Populate artist rows
      const artists = data.artists || [];
      artistFields.querySelectorAll('.artist-input-wrap').forEach(row => row.remove());
      artists.forEach((name, i) => {
        if (i === 0 && firstStaticInput) {
          // Re-add first static row
          const wrap = document.createElement('div');
          wrap.classList.add('artist-input-wrap');
          const inp = document.createElement('input');
          inp.type = 'text';
          inp.value = name;
          inp.placeholder = '+ artist';
          inp.classList.add('star-input', 'artist-input');
          const addBtn = makeAddRowBtn(wrap);
          addBtn.style.display = name.trim() ? 'block' : 'none';
          inp.addEventListener('input', () => {
            addBtn.style.display = inp.value.trim() ? 'block' : 'none';
          });
          wrap.appendChild(inp);
          wrap.appendChild(addBtn);
          artistFields.appendChild(wrap);
        } else {
          addArtistRow(artistFields.lastElementChild, name);
        }
      });
      // Ensure at least one empty row at the end if all filled
      const lastInput = artistFields.querySelector('.artist-input-wrap:last-child .artist-input');
      if (lastInput && lastInput.value.trim()) addArtistRow(artistFields.lastElementChild);

      if (submitBtn) submitBtn.textContent = 'save changes';
      if (deleteBtn) deleteBtn.style.display = '';
    } catch (err) {
      console.error('Load failed:', err);
    }
  }

  hidePageLoader();
});

// -----------------------------
// Form Submission
// -----------------------------
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return;

  const festivalName = festivalNameInput.value.trim();
  const venue = venueInput ? venueInput.value.trim() : '';
  const date = customDateInput.value.trim();
  const diary = diaryInput.value.trim();
  const bgImage = bgInput.value || 'blacklong.png';

  const artistArray = Array.from(artistFields.querySelectorAll('.artist-input'))
    .map(input => input.value.trim())
    .filter(a => a);

  if (!festivalName || !date) {
    alert('Please fill in festival name and date.');
    return;
  }

  try {
    if (isEditing) {
      const festRef = doc(db, 'users', currentUser.uid, 'festivals', festivalId);
      await updateDoc(festRef, { name: festivalName, venue, date, artists: artistArray, diary, bgImage });
    } else {
      await addDoc(collection(db, 'users', currentUser.uid, 'festivals'), {
        name: festivalName, venue, date, artists: artistArray, diary, bgImage, createdAt: new Date()
      });

      // Update artist log for new entries only
      for (const artist of artistArray) {
        const artistRef = doc(db, 'users', currentUser.uid, 'artists', artist.toLowerCase());
        const snap = await getDoc(artistRef);
        if (snap.exists()) {
          await setDoc(artistRef, { appearances: increment(1), sources: ['festival'] }, { merge: true });
        } else {
          await setDoc(artistRef, { name: artist, firstSeen: new Date(), appearances: 1, sources: ['festival'] });
        }
      }
    }
    goToPage('index.html');
  } catch (err) {
    console.error('Error saving festival:', err);
    alert('Failed to save festival. Please try again.');
  }
});

// -----------------------------
// Delete
// -----------------------------
if (deleteBtn) {
  deleteBtn.addEventListener('click', async () => {
    if (!currentUser || !festivalId) return;
    if (confirm('Delete this festival?')) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'festivals', festivalId));
        goToPage('index.html');
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete festival.');
      }
    }
  });
}