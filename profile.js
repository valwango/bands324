// profile.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile, verifyBeforeUpdateEmail, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

  // Set initial username (userId and username are the same field)
  const storedUserId = userDoc.exists() && userDoc.data().userId ? userDoc.data().userId : '';
  const storedUsername = userDoc.exists() && userDoc.data().username ? userDoc.data().username : (user.displayName || '');
  usernameInput.value = storedUserId || storedUsername;
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

  const artistCounts = new Map();
  const tallyArtist = name => {
    const key = (name || '').trim().toLowerCase();
    if (key) artistCounts.set(key, (artistCounts.get(key) || 0) + 1);
  };
  shows.forEach(s => {
    tallyArtist(s.band);
    (s.guests || []).forEach(g => tallyArtist(g));
  });
  festivals.forEach(f => (f.artists || []).forEach(a => tallyArtist(a)));
  const uniqueArtists = new Set(artistCounts.keys());

  const venueCounts = new Map();
  const tallyVenue = name => {
    const key = (name || '').trim().toLowerCase();
    if (key) venueCounts.set(key, (venueCounts.get(key) || 0) + 1);
  };
  shows.forEach(s => tallyVenue(s.venue));
  festivals.forEach(f => tallyVenue(f.venue));
  const uniqueVenues = new Set(venueCounts.keys());

  const showCounts = new Map();
  shows.forEach(s => {
    const key = [s.band, s.venue].filter(Boolean).map(v => v.trim().toLowerCase()).join(' @ ');
    if (key) showCounts.set(key, (showCounts.get(key) || 0) + 1);
  });

  const festivalCounts = new Map();
  festivals.forEach(f => {
    const key = (f.name || '').trim().toLowerCase();
    if (key) festivalCounts.set(key, (festivalCounts.get(key) || 0) + 1);
  });

  const upcomingCounts = new Map();

  document.getElementById('stat-shows').textContent = shows.length;
  document.getElementById('stat-artists').textContent = uniqueArtists.size;
  document.getElementById('stat-venues').textContent = uniqueVenues.size;
  document.getElementById('stat-festivals').textContent = festivals.length;
  document.getElementById('stat-upcoming').textContent = upcomingCount;

  // Stat lists for modal
  const upcomingShows = allShows.filter(s => { const d = parseDateStr(s.date); return d && d >= now; });
  const upcomingFestivals = allFestivals.filter(f => { const d = parseDateStr(f.date); return d && d >= now; });
  upcomingShows.forEach(s => {
    const key = [s.band, s.venue].filter(Boolean).map(v => v.trim().toLowerCase()).join(' @ ');
    if (key) upcomingCounts.set(key, (upcomingCounts.get(key) || 0) + 1);
  });
  upcomingFestivals.forEach(f => {
    const key = [f.name, f.venue].filter(Boolean).map(v => v.trim().toLowerCase()).join(' @ ');
    if (key) upcomingCounts.set(key, (upcomingCounts.get(key) || 0) + 1);
  });

  const toCountItems = map => [...map.entries()].map(([name, count]) => ({ name, count }));

  const statLists = {
    'stat-shows':     { title: 'shows', items: toCountItems(showCounts) },
    'stat-artists':   { title: 'artists', items: toCountItems(artistCounts) },
    'stat-venues':    { title: 'venues', items: toCountItems(venueCounts) },
    'stat-festivals': { title: 'festivals', items: toCountItems(festivalCounts) },
    'stat-upcoming':  { title: 'upcoming', items: toCountItems(upcomingCounts) }
  };

  const statModal = document.getElementById('stat-modal');
  const statModalTitle = document.getElementById('stat-modal-title');
  const statModalList = document.getElementById('stat-modal-list');
  document.getElementById('close-stat-modal').onclick = () => statModal.classList.remove('open');
  statModal.addEventListener('click', e => { if (e.target === statModal) statModal.classList.remove('open'); });

  const stripArticle = s => s.replace(/^(the|a|an)\s+/i, '');

  Object.entries(statLists).forEach(([id, { title, items }]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      statModalTitle.textContent = title;
      statModalList.innerHTML = items.length
        ? items
            .sort((a, b) => stripArticle(a.name).localeCompare(stripArticle(b.name)))
            .map(i => `<li style="display:flex;justify-content:space-between;gap:12px">${i.name}${i.count > 1 ? `<span style="opacity:0.5">x${i.count}</span>` : ''}</li>`)
            .join('')
        : '<li style="color:var(--muted)">none yet</li>';
      statModal.classList.add('open');
    });
  });

  // -------------------
  // Save profile changes
  // -------------------
  saveBtn.onclick = async () => {
    const newUser = usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');
    const newEmail = emailInput.value.trim();
    if (!newUser) { alert('username is required'); return; }
    if (newUser.length < 2) { alert('username must be at least 2 characters'); return; }
    if (!newEmail) return;

    try {
      const oldUserId = myUserId;
      if (newUser !== oldUserId) {
        const existingDoc = await getDoc(doc(db, "userIds", newUser));
        if (existingDoc.exists() && existingDoc.data().uid !== user.uid) {
          saveBtn.textContent = 'username taken';
          setTimeout(() => { saveBtn.textContent = 'save changes'; }, 2000);
          return;
        }
        if (oldUserId) await deleteDoc(doc(db, "userIds", oldUserId));
        await setDoc(doc(db, "userIds", newUser), { uid: user.uid });
      }

      await setDoc(userDocRef, { username: newUser, userId: newUser }, { merge: true });
      await updateProfile(user, { displayName: newUser });
      if (newEmail !== user.email) {
        await verifyBeforeUpdateEmail(user, newEmail);
        saveBtn.textContent = 'verification email sent!';
        setTimeout(() => { saveBtn.textContent = 'save changes'; }, 3000);
      } else {
        saveBtn.textContent = 'saved!';
        setTimeout(() => { saveBtn.textContent = 'save changes'; }, 1200);
      }

      myUserId = newUser;
      usernameInput.value = newUser;
      if (userIdDisplay) userIdDisplay.textContent = newUser;
    } catch (err) {
      alert('Error saving: ' + err.message);
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

  // -------------------
  // User ID (provision if missing)
  // -------------------
  let myUserId = userDoc.exists() ? userDoc.data().userId : null;
  if (!myUserId) {
    myUserId = Math.random().toString(36).slice(2, 8);
    await setDoc(userDocRef, { userId: myUserId, username: myUserId }, { merge: true });
    await setDoc(doc(db, "userIds", myUserId), { uid: user.uid });
    usernameInput.value = myUserId;
  }
  const userIdDisplay = document.getElementById('my-user-id');
  if (userIdDisplay) userIdDisplay.textContent = myUserId;

  const copyUserIdBtn = document.getElementById('copy-user-id-btn');
  if (copyUserIdBtn) {
    copyUserIdBtn.onclick = () => {
      navigator.clipboard.writeText(myUserId).then(() => {
        copyUserIdBtn.textContent = 'copied!';
        setTimeout(() => { copyUserIdBtn.textContent = 'copy'; }, 1500);
      });
    };
  }

  const copyLinkBtn = document.getElementById('copy-invite-link-btn');
  if (copyLinkBtn) {
    copyLinkBtn.onclick = () => {
      const link = `${location.origin}${location.pathname.replace('profile.html','index.html')}?addFriend=${myUserId}`;
      navigator.clipboard.writeText(link).then(() => {
        copyLinkBtn.textContent = 'copied!';
        setTimeout(() => { copyLinkBtn.textContent = 'copy invite link'; }, 1500);
      });
    };
  }

  // -------------------
  // Friends — add by user ID
  // -------------------
  const addFriendInput = document.getElementById('add-friend-input');
  const addFriendBtn = document.getElementById('add-friend-btn');
  const addFriendMsg = document.getElementById('add-friend-msg');
  const friendsList = document.getElementById('friends-list');

  async function loadFriends() {
    if (!friendsList) return;
    friendsList.innerHTML = '';
    const snap = await getDocs(collection(db, "users", user.uid, "friends"));
    if (snap.empty) {
      friendsList.innerHTML = '<li class="friends-empty">no friends added yet</li>';
      return;
    }
    for (const d of snap.docs) {
      const data = d.data();
      const li = document.createElement('li');
      li.className = 'friends-item';
      li.textContent = data.username || data.userId || d.id;
      friendsList.appendChild(li);
    }
  }
  loadFriends();

  if (addFriendBtn) {
    addFriendBtn.onclick = async () => {
      const inputId = (addFriendInput.value || '').trim().toLowerCase();
      if (!inputId) return;
      if (inputId === myUserId) {
        addFriendMsg.textContent = "that's you!";
        return;
      }
      addFriendMsg.textContent = '';
      addFriendBtn.disabled = true;
      try {
        const idDoc = await getDoc(doc(db, "userIds", inputId));
        if (!idDoc.exists()) {
          addFriendMsg.textContent = 'user not found';
          addFriendBtn.disabled = false;
          return;
        }
        const friendUid = idDoc.data().uid;
        const friendUserDoc = await getDoc(doc(db, "users", friendUid));
        const friendData = friendUserDoc.exists() ? friendUserDoc.data() : {};
        await setDoc(doc(db, "users", user.uid, "friends", friendUid), {
          userId: inputId,
          username: friendData.username || '',
          uid: friendUid,
        });
        addFriendInput.value = '';
        addFriendMsg.textContent = `added ${friendData.username || inputId}!`;
        loadFriends();
      } catch (err) {
        addFriendMsg.textContent = 'error: ' + err.message;
        console.error(err);
      }
      addFriendBtn.disabled = false;
    };
  }
});