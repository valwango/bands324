// show.js
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { setSelectedDate } from "./pickers.js?v=20260502s";
import { goToPage } from "./navigation.js";

// Get show ID and type from URL
const params = new URLSearchParams(window.location.search);
const showId = params.get("id");
const entryType = params.get("type"); // 'festival' or null
const isLoadingFestival = entryType === 'festival';

// Form elements
const form = document.getElementById("add-show-form");
const bandInput = document.getElementById("band");
const venueInput = document.getElementById("venue");
const dateInput = document.getElementById("custom-date");
const diaryInput = document.getElementById("diary");
const bgInput = document.getElementById("bgImage");
const deleteBtn = document.getElementById("star-delete");
const loadingEl = document.getElementById("page-loading");
const showContentEl = document.getElementById("show-content");
const artistFields = document.getElementById("artist-fields");

let isFestival = false;
let savedAsFestival = isLoadingFestival;
let showRef = null;
let festivalRef = null;
let currentPrivacy = 'global';

const privacyGlobalBtn = document.getElementById('privacy-global');
const privacyFriendsBtn = document.getElementById('privacy-friends');
const privacySecretBtn = document.getElementById('privacy-secret');
const privacyBtns = [privacyGlobalBtn, privacyFriendsBtn, privacySecretBtn];

function setPrivacy(val) {
  currentPrivacy = val;
  privacyBtns.forEach(btn => {
    if (btn) btn.classList.toggle('privacy-btn--active', btn.id === 'privacy-' + val);
  });
}

if (privacyGlobalBtn) privacyGlobalBtn.addEventListener('click', () => { setPrivacy('global'); scheduleSave(); });
if (privacyFriendsBtn) privacyFriendsBtn.addEventListener('click', () => { setPrivacy('friends'); scheduleSave(); });
if (privacySecretBtn) privacySecretBtn.addEventListener('click', () => { setPrivacy('secret'); scheduleSave(); });
const concertBtn = document.getElementById('is-concert');
const festivalBtn = document.getElementById('is-festival');

function toggleFestivalMode(fest) {
  isFestival = fest;
  const festNameInput = document.getElementById('festival-name');
  const submitBtn = form.querySelector('.star-submit');
  festNameInput.style.display = fest ? '' : 'none';
  if (bandInput) bandInput.required = !fest;
  festNameInput.required = fest;
  if (submitBtn) submitBtn.textContent = fest ? 'update festival' : 'update band';
  if (fest && !festNameInput.value && bandInput) festNameInput.value = bandInput.value;
  if (concertBtn) concertBtn.classList.toggle('type-toggle-btn--active', !fest);
  if (festivalBtn) festivalBtn.classList.toggle('type-toggle-btn--active', fest);
  // toggle + button position and placeholders
  if (fest) {
    firstAddBtn.classList.remove('add-row-btn--right');
    artistFields.classList.add('artist-fields--festival');
  } else {
    firstAddBtn.classList.add('add-row-btn--right');
    artistFields.classList.remove('artist-fields--festival');
  }
  artistFields.querySelectorAll('.artist-input-wrap:not(:first-child) .artist-input').forEach(inp => {
    inp.placeholder = fest ? 'artist' : 'opener / guest';
  });
}

if (concertBtn) concertBtn.addEventListener('click', () => { toggleFestivalMode(false); scheduleSave(); });
if (festivalBtn) festivalBtn.addEventListener('click', () => { toggleFestivalMode(true); scheduleSave(); });

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

// Wire first static row with right-side + button
const firstWrap = artistFields.querySelector('.artist-input-wrap');
const firstAddBtn = makeAddRowBtn(firstWrap);
firstAddBtn.classList.add('add-row-btn--right');
firstWrap.appendChild(firstAddBtn);

function syncFirstBtn() {
  const hasGuests = artistFields.querySelectorAll('.artist-input-wrap').length > 1;
  firstAddBtn.style.display = hasGuests ? 'none' : '';
}

function setPageReady() {
  if (loadingEl) loadingEl.classList.add("is-hidden");
  if (showContentEl) showContentEl.classList.remove("is-hidden");
}

// -------------------
// Photo upload
// -------------------
const starPhotoBtn = document.getElementById('star-photo-btn');
const starPhotoInput = document.getElementById('star-photo-input');
const starPhotoImg = document.getElementById('star-photo-img');
const starDisplay = document.getElementById('star-display');
let currentPhotoUrl = null;
let docRef = null;

function showPhoto(url) {
  currentPhotoUrl = url;
  starPhotoImg.src = url;
  starPhotoImg.style.display = 'block';
  starDisplay.style.display = 'none';
  starPhotoBtn.classList.add('star-photo-add-btn--has-photo');
}

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

if (starPhotoBtn) {
  starPhotoBtn.addEventListener('click', openPhotoPopup);
}
if (starPhotoImg) starPhotoImg.addEventListener('click', openPhotoPopup);
if (photoPopupBackdrop) photoPopupBackdrop.addEventListener('click', closePhotoPopup);
if (photoPopupUpload) photoPopupUpload.addEventListener('click', () => { starPhotoInput && starPhotoInput.click(); });
if (photoPopupPlus) photoPopupPlus.addEventListener('click', () => { starPhotoInput && starPhotoInput.click(); });
if (photoPopupReplace) photoPopupReplace.addEventListener('click', () => { starPhotoInput && starPhotoInput.click(); });
if (photoPopupSubmit) photoPopupSubmit.addEventListener('click', () => {
  if (currentPhotoUrl) {
    showPhoto(currentPhotoUrl);
  }
  closePhotoPopup();
});

if (starPhotoInput) {
  starPhotoInput.addEventListener('change', async () => {
    const file = starPhotoInput.files[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    currentPhotoUrl = localUrl;
    showPopupPreview(localUrl);
    openPhotoPopup();
    const user = auth.currentUser;
    if (!user) return;
    try {
      const storageRef = ref(storage, `users/${user.uid}/shows/${showId}/photo`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      currentPhotoUrl = url;
      showPopupPreview(url);
      await updateDoc(docRef, { photoUrl: url });
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
  });
}

function autoResizeDiary() {
  if (!diaryInput) return;
  diaryInput.style.height = "auto";
  diaryInput.style.height = `${diaryInput.scrollHeight}px`;
}

if (diaryInput) {
  autoResizeDiary();
  diaryInput.addEventListener("input", autoResizeDiary);
}

// -------------------
// Auto-save
// -------------------
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveData, 700);
}

async function saveData() {
  if (!docRef) return;
  const user = auth.currentUser;
  if (!user) return;
  try {
    const venue = venueInput.value.trim();
    const date = dateInput.value.trim();
    const diary = diaryInput.value.trim();
    const bgImage = bgInput.value || 'blackband.png';

    if (isFestival) {
      const festivalName = document.getElementById('festival-name').value.trim();
      const artistArray = [...artistFields.querySelectorAll('.artist-input')]
        .map(i => i.value.trim()).filter(Boolean);
      if (!festivalName) return;
      const festData = { name: festivalName, venue, date, diary, bgImage, artists: artistArray, privacy: currentPrivacy };
      if (savedAsFestival) {
        await updateDoc(festivalRef, festData);
      } else {
        const newRef = await addDoc(collection(db, 'users', user.uid, 'festivals'), { ...festData, createdAt: new Date() });
        await deleteDoc(showRef);
        docRef = newRef;
        festivalRef = newRef;
        savedAsFestival = true;
        history.replaceState(null, '', `?id=${newRef.id}&type=festival`);
      }
    } else {
      const guests = [...artistFields.querySelectorAll('.artist-input-wrap input')]
        .slice(1).map(i => i.value.trim()).filter(Boolean);
      const showData = { band: bandInput.value.trim(), venue, date, diary, bgImage, guests, privacy: currentPrivacy };
      if (!savedAsFestival) {
        await updateDoc(showRef, showData);
      } else {
        const newRef = await addDoc(collection(db, 'users', user.uid, 'shows'), { ...showData, createdAt: new Date() });
        await deleteDoc(festivalRef);
        docRef = newRef;
        showRef = newRef;
        savedAsFestival = false;
        history.replaceState(null, '', `?id=${newRef.id}`);
      }
    }
  } catch (err) {
    console.error('Auto-save failed:', err);
  }
}

// Wait for user auth
onAuthStateChanged(auth, async (user) => {
  if (!user || !showId) {
    goToPage("index.html");
    return;
  }

  const showRef_inner = doc(db, "users", user.uid, "shows", showId);
  const festivalRef_inner = doc(db, "users", user.uid, "festivals", showId);
  showRef = showRef_inner;
  festivalRef = festivalRef_inner;
  docRef = isLoadingFestival ? festivalRef : showRef;

  // -------------------
  // LOAD DATA
  // -------------------
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      alert("Entry not found");
      goToPage("index.html");
      return;
    }

    const data = snap.data();

    if (isLoadingFestival) {
      // Populate festival fields
      toggleFestivalMode(true);
      document.getElementById('festival-name').value = data.name || '';
      venueInput.value = data.venue || '';
      dateInput.value = data.date || '';
      diaryInput.value = data.diary || '';
      bgInput.value = data.bgImage || 'blackband.png';
      // Load artists: first goes in #band input, rest as additional rows
      const artists = data.artists || [];
      if (artists[0]) bandInput.value = artists[0];
      if (artists.length > 1) {
        artists.slice(1).forEach(name => addArtistRow(artistFields.lastElementChild, name));
        syncFirstBtn();
      }
    } else {
      // Populate show fields
      bandInput.value = data.band || "";
      venueInput.value = data.venue || "";
      dateInput.value = data.date || "";
      diaryInput.value = data.diary || "";
      bgInput.value = data.bgImage || "blackband.png";
      if (data.guests && data.guests.length) {
        data.guests.forEach(g => addArtistRow(artistFields.lastElementChild, g));
        syncFirstBtn();
      }
    }

    // Set date picker and color picker
    if (data.date) setSelectedDate(new Date(data.date));
    document.querySelectorAll('.color-circle').forEach(circle => {
      circle.classList.remove('selected');
      const img = circle.style.backgroundImage;
      const match = img.match(/\/([^/]+\.png)/);
      if (match && match[1] === data.bgImage) circle.classList.add('selected');
    });

    setPageReady();
    autoResizeDiary();
    if (data.photoUrl) showPhoto(data.photoUrl);
    setPrivacy(data.privacy || 'global');

    // Wire auto-save listeners
    [bandInput, venueInput, diaryInput].forEach(el => {
      if (el) el.addEventListener('input', scheduleSave);
    });
    const festNameInput = document.getElementById('festival-name');
    if (festNameInput) festNameInput.addEventListener('input', scheduleSave);
    artistFields.addEventListener('input', scheduleSave);
    if (bgInput) bgInput.addEventListener('change', scheduleSave);
    if (dateInput) dateInput.addEventListener('change', scheduleSave);

  } catch (err) {
    console.error("Load failed:", err);
    alert("Failed to load data");
    setPageReady();
  }

  // -------------------
  // PREVENT DEFAULT SUBMIT
  // -------------------
  form.addEventListener("submit", e => e.preventDefault());

  // -------------------
  // DELETE SHOW
  // -------------------
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this entry?")) {
        try {
          await deleteDoc(docRef);
          goToPage("index.html");
        } catch (err) {
          console.error("Delete failed:", err);
          alert("Failed to delete");
        }
      }
    });
  }
});