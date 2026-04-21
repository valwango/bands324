// profile.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { goToPage } from "./navigation.js";

// Elements
const usernameInput = document.getElementById('username-input');
const emailInput = document.getElementById('email-input');
const saveBtn = document.getElementById('save-profile-btn');
const changePasswordBtn = document.getElementById('change-password-btn');
const passwordModal = document.getElementById('password-modal');
const closePasswordModal = document.getElementById('close-password-modal');
let passwordInput = null;
let submitPasswordBtn = null;

// -------------------
// Auth state
// -------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    goToPage("login.html");
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  // Set initial username
  const username = userDoc.exists() && userDoc.data().username ? userDoc.data().username : (user.displayName || '');
  usernameInput.value = username;
  emailInput.value = user.email;

  // -------------------
  // Stats
  // -------------------
  const showsSnap = await getDocs(collection(db, "users", user.uid, "shows"));
  const festivalsSnap = await getDocs(collection(db, "users", user.uid, "festivals"));
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  function parseDateStr(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    let mm = parseInt(parts[0], 10), dd = parseInt(parts[1], 10), yy = parseInt(parts[2], 10);
    if (yy < 100) yy += 2000;
    return new Date(yy, mm - 1, dd);
  }

  const allShows = showsSnap.docs.map(d => d.data());
  const allFestivals = festivalsSnap.docs.map(d => d.data());

  const shows = allShows.filter(s => {
    const d = parseDateStr(s.date);
    return d && d < now;
  });

  const festivals = allFestivals.filter(f => {
    const d = parseDateStr(f.date);
    return d && d < now;
  });

  const upcomingCount = allShows.filter(s => {
    const d = parseDateStr(s.date);
    return d && d >= now;
  }).length + allFestivals.filter(f => {
    const d = parseDateStr(f.date);
    return d && d >= now;
  }).length;

  const uniqueArtists = new Set([
    ...shows.map(s => (s.band || '').trim().toLowerCase()).filter(Boolean),
    ...shows.flatMap(s => (s.guests || []).map(g => g.trim().toLowerCase())).filter(Boolean),
    ...festivals.flatMap(f => (f.artists || []).map(a => a.trim().toLowerCase())).filter(Boolean)
  ]);
  const uniqueVenues = new Set([
    ...shows.map(s => (s.venue || '').trim().toLowerCase()).filter(Boolean),
    ...festivals.map(f => (f.venue || '').trim().toLowerCase()).filter(Boolean)
  ]);

  document.getElementById('stat-shows').textContent = shows.length;
  document.getElementById('stat-artists').textContent = uniqueArtists.size;
  document.getElementById('stat-venues').textContent = uniqueVenues.size;
  document.getElementById('stat-festivals').textContent = festivals.length;
  document.getElementById('stat-upcoming').textContent = upcomingCount;

  // Stat lists for modal
  const upcomingShows = allShows.filter(s => { const d = parseDateStr(s.date); return d && d >= now; });
  const upcomingFestivals = allFestivals.filter(f => { const d = parseDateStr(f.date); return d && d >= now; });

  const statLists = {
    'stat-shows':     { title: 'shows', items: shows.map(s => [s.band, s.venue].filter(Boolean).join(' @ ')) },
    'stat-artists':   { title: 'artists', items: [...uniqueArtists] },
    'stat-venues':    { title: 'venues', items: [...uniqueVenues] },
    'stat-festivals': { title: 'festivals', items: festivals.map(f => f.name).filter(Boolean) },
    'stat-upcoming':  { title: 'upcoming', items: [
      ...upcomingShows.map(s => s.band).filter(Boolean),
      ...upcomingFestivals.map(f => f.name).filter(Boolean)
    ]}
  };

  const statModal = document.getElementById('stat-modal');
  const statModalTitle = document.getElementById('stat-modal-title');
  const statModalList = document.getElementById('stat-modal-list');
  document.getElementById('close-stat-modal').onclick = () => statModal.classList.remove('open');
  statModal.addEventListener('click', e => { if (e.target === statModal) statModal.classList.remove('open'); });

  Object.entries(statLists).forEach(([id, { title, items }]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      statModalTitle.textContent = title;
      statModalList.innerHTML = items.length
        ? items.sort().map(i => `<li>${i}</li>`).join('')
        : '<li style="color:var(--muted)">none yet</li>';
      statModal.classList.add('open');
    });
  });

  // -------------------
  // Save profile changes
  // -------------------
  saveBtn.onclick = async () => {
    const newUsername = usernameInput.value.trim();
    const newEmail = emailInput.value.trim();
    if (!newUsername || !newEmail) return;

    try {
      // Update Firestore
      await setDoc(userDocRef, { username: newUsername }, { merge: true });

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: newUsername });

      // Update email
      if (newEmail !== user.email) {
        await updateEmail(user, newEmail);
      }

      saveBtn.textContent = 'saved!';
      setTimeout(() => { saveBtn.textContent = 'save changes'; }, 1200);
    } catch (err) {
      alert('Error updating profile: ' + err.message);
      console.error(err);
    }
  };

  // -------------------
  // Change password
  // -------------------
  changePasswordBtn.onclick = () => {
    passwordModal.classList.add('open');
    passwordInput = document.getElementById('password-input');
    submitPasswordBtn = document.getElementById('submit-password-btn');
    passwordInput.value = '';
    submitPasswordBtn.textContent = 'submit new password';
  };

  closePasswordModal.onclick = () => {
    passwordModal.classList.remove('open');
  };

  document.getElementById('submit-password-btn').onclick = async () => {
    const newPassword = document.getElementById('password-input').value.trim();
    if (!newPassword) return alert('Please enter a new password.');
    try {
      await updatePassword(user, newPassword);
      submitPasswordBtn.textContent = 'Password Changed!';
      setTimeout(() => { passwordModal.classList.remove('open'); }, 1200);
    } catch (err) {
      alert('Failed to change password: ' + err.message);
      console.error(err);
    }
  };
});