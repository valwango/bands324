// show.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setSelectedDate } from "./pickers.js"; // function to update date picker
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

    // Set date picker correctly
    if (data.date) setSelectedDate(new Date(data.date));

    // Update color picker selection visually
    document.querySelectorAll('.color-circle').forEach(circle => {
      circle.classList.remove('selected');
      if (circle.style.backgroundImage.includes(data.bgImage)) {
        circle.classList.add('selected');
      }
    });

  } catch (err) {
    console.error("Load failed:", err);
    alert("Failed to load show data");
  }

  // -------------------
  // UPDATE DATA
  // -------------------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      await updateDoc(showRef, {
        band: bandInput.value.trim(),
        venue: venueInput.value.trim(),
        date: dateInput.value.trim(),
        diary: diaryInput.value.trim(),
        bgImage: bgInput.value
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