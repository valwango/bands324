// show.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setSelectedDate } from "./pickers.js?v=20260427g"; // function to update date picker
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
const concertBtn = document.getElementById('is-concert');
const festivalBtn = document.getElementById('is-festival');

function toggleFestivalMode(fest) {
  isFestival = fest;
  const festNameInput = document.getElementById('festival-name');
  const submitBtn = form.querySelector('.star-submit');
  festNameInput.style.display = fest ? '' : 'none';
  if (bandInput) bandInput.required = !fest;
  festNameInput.required = fest;
  submitBtn.textContent = fest ? 'update festival' : 'update band';
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

if (concertBtn) concertBtn.addEventListener('click', () => toggleFestivalMode(false));
if (festivalBtn) festivalBtn.addEventListener('click', () => toggleFestivalMode(true));

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

function autoResizeDiary() {
  if (!diaryInput) return;
  diaryInput.style.height = "auto";
  diaryInput.style.height = `${diaryInput.scrollHeight}px`;
}

if (diaryInput) {
  autoResizeDiary();
  diaryInput.addEventListener("input", autoResizeDiary);
}

// Wait for user auth
onAuthStateChanged(auth, async (user) => {
  if (!user || !showId) {
    goToPage("index.html");
    return;
  }

  const showRef = doc(db, "users", user.uid, "shows", showId);
  const festivalRef = doc(db, "users", user.uid, "festivals", showId);
  const docRef = isLoadingFestival ? festivalRef : showRef;

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
      if (circle.style.backgroundImage.includes(data.bgImage)) circle.classList.add('selected');
    });

    setPageReady();
    autoResizeDiary();

  } catch (err) {
    console.error("Load failed:", err);
    alert("Failed to load data");
    setPageReady();
  }

  // -------------------
  // UPDATE DATA
  // -------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

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
        const festData = { name: festivalName, venue, date, diary, bgImage, artists: artistArray };
        if (isLoadingFestival) {
          // update existing festival
          await updateDoc(festivalRef, festData);
        } else {
          // convert show → festival
          await addDoc(collection(db, 'users', user.uid, 'festivals'), { ...festData, createdAt: new Date() });
          await deleteDoc(showRef);
        }
      } else {
        const guests = [...artistFields.querySelectorAll('.artist-input-wrap input')]
          .slice(1).map(i => i.value.trim()).filter(Boolean);
        const showData = { band: bandInput.value.trim(), venue, date, diary, bgImage, guests };
        if (isLoadingFestival) {
          // convert festival → show
          await addDoc(collection(db, 'users', user.uid, 'shows'), { ...showData, createdAt: new Date() });
          await deleteDoc(festivalRef);
        } else {
          // update existing show
          await updateDoc(showRef, showData);
        }
      }

      goToPage("index.html");
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update");
    }
  });

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