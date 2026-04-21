// show.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setSelectedDate } from "./pickers.js?v=20260405i"; // function to update date picker
import { goToPage } from "./navigation.js";

// Get show ID from URL
const params = new URLSearchParams(window.location.search);
const showId = params.get("id");

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

  // -------------------
  // LOAD DATA
  // -------------------
  try {
    const snap = await getDoc(showRef);
    if (!snap.exists()) {
      alert("Show not found");
      goToPage("index.html");
      return;
    }

    const data = snap.data();

    // Populate form fields
    bandInput.value = data.band || "";
    venueInput.value = data.venue || "";
    dateInput.value = data.date || "";
    diaryInput.value = data.diary || "";
    bgInput.value = data.bgImage || "blackband.png";
    autoResizeDiary();

    // Load existing guests
    if (data.guests && data.guests.length) {
      data.guests.forEach(g => addArtistRow(artistFields.lastElementChild, g));
      syncFirstBtn();
    }

    // Set date picker correctly
    if (data.date) setSelectedDate(new Date(data.date));

    // Update color picker selection visually
    document.querySelectorAll('.color-circle').forEach(circle => {
      circle.classList.remove('selected');
      if (circle.style.backgroundImage.includes(data.bgImage)) {
        circle.classList.add('selected');
      }
    });

    setPageReady();

  } catch (err) {
    console.error("Load failed:", err);
    alert("Failed to load show data");
    setPageReady();
  }

  // -------------------
  // UPDATE DATA
  // -------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const guests = [...artistFields.querySelectorAll('.artist-input-wrap input')]
        .slice(1)
        .map(i => i.value.trim())
        .filter(Boolean);

      await updateDoc(showRef, {
        band: bandInput.value.trim(),
        venue: venueInput.value.trim(),
        date: dateInput.value.trim(),
        diary: diaryInput.value.trim(),
        bgImage: bgInput.value,
        guests
      });

      goToPage("index.html"); // redirect after save
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update show");
    }
  });

  // -------------------
  // DELETE SHOW
  // -------------------
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this show?")) {
        try {
          await deleteDoc(showRef);
          goToPage("index.html");
        } catch (err) {
          console.error("Delete failed:", err);
          alert("Failed to delete show");
        }
      }
    });
  }
});