// star.js
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, doc, setDoc, getDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import "./pickers.js?v=20260502s";
import { goToPage } from "./navigation.js";

// -------------------
// Optional Diary + Firestore Form Submission
// -------------------
const form = document.getElementById('add-show-form');
const diaryInput = document.getElementById('diary');
const customDateInput = document.getElementById('custom-date');
const bgInput = document.getElementById('bgImage');
const loadingEl = document.getElementById('page-loading');

// Photo upload
const starPhotoBtn = document.getElementById('star-photo-btn');
const starPhotoInput = document.getElementById('star-photo-input');
const starPhotoImg = document.getElementById('star-photo-img');
const starDisplay = document.getElementById('star-display');
let pendingPhotoFile = null;

const photoPopup = document.getElementById('photo-popup');
const photoPopupBackdrop = document.getElementById('photo-popup-backdrop');
const photoPopupUpload = document.getElementById('photo-popup-upload');
const photoPopupReplace = document.getElementById('photo-popup-replace');
const photoPopupSubmit = document.getElementById('photo-popup-submit');
const photoPopupActionsUpload = document.getElementById('photo-popup-actions-upload');
const photoPopupActionsReplace = document.getElementById('photo-popup-actions-replace');
const photoPopupPreview = document.getElementById('photo-popup-preview');
const photoPopupPlus = document.getElementById('photo-popup-plus');

function openPhotoPopup() { if (photoPopup) photoPopup.style.display = 'flex'; }
function closePhotoPopup() { if (photoPopup) photoPopup.style.display = 'none'; }

function showPopupPreview(url) {
  photoPopupPreview.src = url;
  photoPopupPreview.style.display = 'block';
  photoPopupPlus.style.display = 'none';
  photoPopupActionsUpload.style.display = 'none';
  photoPopupActionsReplace.style.display = 'flex';
}

if (starPhotoBtn) starPhotoBtn.addEventListener('click', openPhotoPopup);
if (starPhotoImg) starPhotoImg.addEventListener('click', openPhotoPopup);
if (photoPopupBackdrop) photoPopupBackdrop.addEventListener('click', closePhotoPopup);
if (photoPopupUpload) photoPopupUpload.addEventListener('click', () => { starPhotoInput && starPhotoInput.click(); });
if (photoPopupPlus) photoPopupPlus.addEventListener('click', () => { starPhotoInput && starPhotoInput.click(); });
if (photoPopupReplace) photoPopupReplace.addEventListener('click', () => { starPhotoInput && starPhotoInput.click(); });
if (photoPopupSubmit) photoPopupSubmit.addEventListener('click', () => {
  if (pendingPhotoFile) {
    starPhotoImg.src = photoPopupPreview.src;
    starPhotoImg.style.display = 'block';
    starDisplay.style.display = 'none';
    starPhotoBtn.classList.add('star-photo-add-btn--has-photo');
  }
  closePhotoPopup();
});
if (starPhotoInput) {
  starPhotoInput.addEventListener('change', () => {
    const file = starPhotoInput.files[0];
    if (!file) return;
    pendingPhotoFile = file;
    const url = URL.createObjectURL(file);
    showPopupPreview(url);
    openPhotoPopup();
  });
}

let isFestival = false;
const concertBtn = document.getElementById('is-concert');
const festivalBtn = document.getElementById('is-festival');

function toggleFestivalMode(fest) {
  isFestival = fest;
  const festNameInput = document.getElementById('festival-name');
  const submitBtn = form.querySelector('.star-submit');
  const bandInput = document.getElementById('band');

  festNameInput.style.display = fest ? '' : 'none';
  submitBtn.textContent = fest ? 'add festival' : 'add band';
  if (bandInput) bandInput.required = !fest;
  festNameInput.required = fest;

  if (concertBtn) concertBtn.classList.toggle('type-toggle-btn--active', !fest);
  if (festivalBtn) festivalBtn.classList.toggle('type-toggle-btn--active', fest);

  form.dispatchEvent(new CustomEvent('festivalmode', { detail: fest }));
}

if (concertBtn) concertBtn.addEventListener('click', () => toggleFestivalMode(false));
if (festivalBtn) festivalBtn.addEventListener('click', () => toggleFestivalMode(true));

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
    input.placeholder = isFestival ? 'artist' : 'opener / guest';
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

  function applyFestivalArtistMode(fest) {
    if (fest) {
      firstAddBtn.classList.remove('add-row-btn--right');
      artistFields.classList.add('artist-fields--festival');
    } else {
      firstAddBtn.classList.add('add-row-btn--right');
      artistFields.classList.remove('artist-fields--festival');
    }
  }

  form.addEventListener('festivalmode', e => applyFestivalArtistMode(e.detail));

  form.addEventListener('submit', async e=>{
    e.preventDefault();

    if (isFestival) {
      const festivalName = document.getElementById('festival-name').value.trim();
      const venue = document.getElementById('venue').value.trim();
      const date = customDateInput.value.trim();
      const diary = diaryInput.value.trim();
      const artistArray = [...artistFields.querySelectorAll('.artist-input')]
        .map(i => i.value.trim()).filter(Boolean);

      if (!festivalName || !date) return;

      try {
        const festRef = await addDoc(collection(db, 'users', user.uid, 'festivals'), {
          name: festivalName, venue, date, artists: artistArray, diary,
          bgImage: bgInput.value || 'blackband.png',
          createdAt: new Date()
        });
        if (pendingPhotoFile) {
          const storageRef = ref(storage, `users/${user.uid}/festivals/${festRef.id}/photo`);
          await uploadBytes(storageRef, pendingPhotoFile);
          const url = await getDownloadURL(storageRef);
          await setDoc(doc(db, 'users', user.uid, 'festivals', festRef.id), { photoUrl: url }, { merge: true });
        }
        for (const artist of artistArray) {
          const artistRef = doc(db, 'users', user.uid, 'artists', artist.toLowerCase());
          const snap = await getDoc(artistRef);
          if (snap.exists()) {
            await setDoc(artistRef, { appearances: increment(1), sources: ['festival'] }, { merge: true });
          } else {
            await setDoc(artistRef, { name: artist, firstSeen: new Date(), appearances: 1, sources: ['festival'] });
          }
        }
        goToPage('index.html');
      } catch(err) {
        console.error('Error saving festival:', err);
        alert('Failed to save festival. Please try again.');
      }
      return;
    }

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

      const showRef = await addDoc(userShowsRef, showData);

      if (pendingPhotoFile) {
        const storageRef = ref(storage, `users/${user.uid}/shows/${showRef.id}/photo`);
        await uploadBytes(storageRef, pendingPhotoFile);
        const url = await getDownloadURL(storageRef);
        await setDoc(doc(db, 'users', user.uid, 'shows', showRef.id), { photoUrl: url }, { merge: true });
      }

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