// profile.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile, verifyBeforeUpdateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, query, where, runTransaction, addDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { goToPage } from "./navigation.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) { goToPage("login.html"); return; }

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);
  const userData = userDoc.exists() ? userDoc.data() : {};

  const storedUsername = userData.username || user.displayName || '';
  document.getElementById('display-username').textContent = storedUsername.toUpperCase() || '—';
  document.getElementById('username-input').value = storedUsername;
  document.getElementById('email-input').value = user.email;

  // userId provisioning
  const myUserId = await runTransaction(db, async (transaction) => {
    const freshSnap = await transaction.get(userDocRef);
    const existingId = freshSnap.exists() ? freshSnap.data().userId : null;
    if (existingId && /^\d{6}$/.test(existingId)) return existingId;
    const counterRef = doc(db, "counters", "userCount");
    const counterDoc = await transaction.get(counterRef);
    const nextCount = (counterDoc.exists() ? counterDoc.data().count : 0) + 1;
    const newId = String(nextCount).padStart(6, '0');
    transaction.set(counterRef, { count: nextCount });
    transaction.set(userDocRef, { userId: newId }, { merge: true });
    transaction.set(doc(db, "userIds", newId), { uid: user.uid });
    return newId;
  });
  document.getElementById('my-user-id').textContent = myUserId;
  document.getElementById('my-user-id-friends').textContent = myUserId;

  // Load shows/festivals
  const showsSnap = await getDocs(collection(db, "users", user.uid, "shows"));
  const festivalsSnap = await getDocs(collection(db, "users", user.uid, "festivals"));
  const now = new Date(); now.setHours(0, 0, 0, 0);

  function parseDateStr(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    let mm = parseInt(parts[0], 10), dd = parseInt(parts[1], 10), yy = parseInt(parts[2], 10);
    if (yy < 100) yy += 2000;
    return new Date(yy, mm - 1, dd);
  }

  const showDocs = showsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const festivalDocs = festivalsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const pastShows = showDocs.filter(s => { const d = parseDateStr(s.date); return d && d < now; });
  const pastFestivals = festivalDocs.filter(f => { const d = parseDateStr(f.date); return d && d < now; });
  const upcomingShows = showDocs.filter(s => { const d = parseDateStr(s.date); return d && d >= now; });
  const upcomingFestivals = festivalDocs.filter(f => { const d = parseDateStr(f.date); return d && d >= now; });

  const artistCounts = new Map();
  const tallyArtist = n => { const k = (n || '').trim().toLowerCase(); if (k) artistCounts.set(k, (artistCounts.get(k) || 0) + 1); };
  pastShows.forEach(s => { tallyArtist(s.band); (s.guests || []).forEach(g => tallyArtist(g)); });
  pastFestivals.forEach(f => (f.artists || []).forEach(a => tallyArtist(a)));

  const venueCounts = new Map();
  const tallyVenue = n => { const k = (n || '').trim().toLowerCase(); if (k) venueCounts.set(k, (venueCounts.get(k) || 0) + 1); };
  pastShows.forEach(s => tallyVenue(s.venue));
  pastFestivals.forEach(f => tallyVenue(f.venue));

  const showCounts = new Map();
  pastShows.forEach(s => {
    const k = [s.band, s.venue].filter(Boolean).map(v => v.trim().toLowerCase()).join(' @ ');
    if (k) showCounts.set(k, (showCounts.get(k) || 0) + 1);
  });
  const festivalCounts = new Map();
  pastFestivals.forEach(f => {
    const k = (f.name || '').trim().toLowerCase();
    if (k) festivalCounts.set(k, (festivalCounts.get(k) || 0) + 1);
  });
  const upcomingCounts = new Map();
  upcomingShows.forEach(s => {
    const k = [s.band, s.venue].filter(Boolean).map(v => v.trim().toLowerCase()).join(' @ ');
    if (k) upcomingCounts.set(k, (upcomingCounts.get(k) || 0) + 1);
  });
  upcomingFestivals.forEach(f => {
    const k = [f.name, f.venue].filter(Boolean).map(v => v.trim().toLowerCase()).join(' @ ');
    if (k) upcomingCounts.set(k, (upcomingCounts.get(k) || 0) + 1);
  });

  document.getElementById('stat-shows').textContent = pastShows.length;
  document.getElementById('stat-festivals').textContent = pastFestivals.length;
  document.getElementById('stat-artists').textContent = artistCounts.size;
  document.getElementById('stat-venues').textContent = venueCounts.size;
  document.getElementById('stat-upcoming').textContent = upcomingShows.length + upcomingFestivals.length;

  const friendsSnap = await getDocs(collection(db, "users", user.uid, "friends"));
  document.getElementById('stat-friends').textContent = friendsSnap.docs.length;
  let friendsList = friendsSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

  // Stat modal
  const toCountItems = map => [...map.entries()].map(([name, count]) => ({ name, count }));
  const stripArticle = s => s.replace(/^(the|a|an)\s+/i, '');
  const getStatLists = () => ({
    shows:     { title: 'SHOWS', items: toCountItems(showCounts) },
    festivals: { title: 'FESTIVALS', items: toCountItems(festivalCounts) },
    artists:   { title: 'ARTISTS', items: toCountItems(artistCounts) },
    venues:    { title: 'VENUES', items: toCountItems(venueCounts) },
    upcoming:  { title: 'UPCOMING SHOWS', items: toCountItems(upcomingCounts) },
    friends:   { title: 'FRIENDS', items: friendsList.map(f => ({ name: f.username || f.userId || f.uid, count: 1 })) },
  });

  const statModal = document.getElementById('stat-modal');
  const statModalTitle = document.getElementById('stat-modal-title');
  const statModalList = document.getElementById('stat-modal-list');
  document.getElementById('close-stat-modal').onclick = () => statModal.classList.remove('open');
  statModal.addEventListener('click', e => { if (e.target === statModal) statModal.classList.remove('open'); });

  document.querySelectorAll('.pf-stat-box').forEach(box => {
    box.addEventListener('click', () => {
      const { title, items } = getStatLists()[box.dataset.stat];
      statModalTitle.textContent = title;
      statModalList.innerHTML = items.length
        ? items.sort((a, b) => stripArticle(a.name).localeCompare(stripArticle(b.name)))
            .map(i => `<li style="display:flex;justify-content:space-between;gap:12px">${i.name}${i.count > 1 ? `<span style="opacity:0.5">×${i.count}</span>` : ''}</li>`)
            .join('')
        : '<li class="pf-list-empty">none yet</li>';
      statModal.classList.add('open');
    });
  });

  // Top Shows
  let selectedTopShowIds = [...(userData.topShowIds || [])];

  function renderTopShowsInCard(ids) {
    for (let i = 0; i < 3; i++) {
      const el = document.getElementById(`top-show-${i}`);
      if (!el) continue;
      const show = showDocs.find(s => s.id === ids[i]) || festivalDocs.find(f => f.id === ids[i]);
      el.innerHTML = '';
      el.style.backgroundImage = '';
      if (show) {
        const img = show.photoUrl || show.bgImage;
        if (img) el.style.backgroundImage = `url('${img}')`;
        el.innerHTML = `<span class="pf-top-show-label">${show.band || show.name || ''}</span>`;
      } else {
        el.innerHTML = `<span class="pf-top-show-label" style="opacity:0.3">—</span>`;
      }
    }
  }
  renderTopShowsInCard(selectedTopShowIds);

  function renderTopShowsPicker() {
    const picker = document.getElementById('top-shows-picker');
    if (!picker) return;
    const allItems = [
      ...pastShows.map(s => ({ id: s.id, label: s.band || '?', img: s.photoUrl || s.bgImage })),
      ...pastFestivals.map(f => ({ id: f.id, label: f.name || '?', img: f.photoUrl || f.bgImage }))
    ];
    if (!allItems.length) { picker.innerHTML = '<div class="pf-picker-empty">no shows yet</div>'; return; }
    picker.innerHTML = allItems.map(s => {
      const sel = selectedTopShowIds.includes(s.id);
      return `<div class="pf-picker-item${sel ? ' selected' : ''}" data-id="${s.id}"${s.img ? ` style="background-image:url('${s.img}')"` : ''}>
        <span class="pf-picker-item-label">${s.label}</span>
      </div>`;
    }).join('');
    picker.querySelectorAll('.pf-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (selectedTopShowIds.includes(id)) {
          selectedTopShowIds = selectedTopShowIds.filter(x => x !== id);
        } else {
          if (selectedTopShowIds.length >= 3) selectedTopShowIds.shift();
          selectedTopShowIds.push(id);
        }
        renderTopShowsPicker();
        renderTopShowsInCard(selectedTopShowIds);
      });
    });
  }

  // Settings modal
  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('profile-card').addEventListener('click', () => {
    renderTopShowsPicker();
    settingsModal.classList.add('open');
  });
  document.getElementById('close-settings-modal').onclick = () => settingsModal.classList.remove('open');
  settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.remove('open'); });

  document.getElementById('logout-btn').onclick = async () => {
    await signOut(auth);
    goToPage('login.html');
  };

  function promptReauth() {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById('reauth-modal');
      const input = document.getElementById('reauth-password-input');
      const btn = document.getElementById('reauth-submit-btn');
      const msg = document.getElementById('reauth-msg');
      const closeBtn = document.getElementById('close-reauth-modal');
      input.value = ''; msg.textContent = '';
      modal.classList.add('open');
      const cleanup = () => { modal.classList.remove('open'); btn.onclick = null; closeBtn.onclick = null; };
      closeBtn.onclick = () => { cleanup(); reject(new Error('cancelled')); };
      modal.onclick = e => { if (e.target === modal) { cleanup(); reject(new Error('cancelled')); } };
      btn.onclick = async () => {
        const pw = input.value;
        if (!pw) return;
        btn.disabled = true;
        try {
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pw));
          cleanup(); resolve();
        } catch { msg.textContent = 'incorrect password'; btn.disabled = false; }
      };
    });
  }

  async function doSave() {
    const newUsername = document.getElementById('username-input').value.trim();
    const newEmail = document.getElementById('email-input').value.trim();
    if (!newUsername) { alert('username is required'); return; }
    await setDoc(userDocRef, { username: newUsername, topShowIds: selectedTopShowIds }, { merge: true });
    await updateProfile(user, { displayName: newUsername });
    document.getElementById('display-username').textContent = newUsername.toUpperCase();
    renderTopShowsInCard(selectedTopShowIds);
    const saveBtn = document.getElementById('save-profile-btn');
    if (newEmail !== user.email) {
      await verifyBeforeUpdateEmail(user, newEmail);
      saveBtn.textContent = 'VERIFICATION EMAIL SENT!';
      setTimeout(() => { saveBtn.textContent = 'SAVE'; }, 3000);
    } else {
      saveBtn.textContent = 'SAVED!';
      setTimeout(() => { saveBtn.textContent = 'SAVE'; settingsModal.classList.remove('open'); }, 1200);
    }
  }

  document.getElementById('save-profile-btn').onclick = async () => {
    try { await doSave(); }
    catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        try { await promptReauth(); await doSave(); }
        catch (e) { if (e.message !== 'cancelled') alert('Error: ' + e.message); }
      } else { alert('Error: ' + err.message); }
    }
  };

  const passwordModal = document.getElementById('password-modal');
  document.getElementById('change-password-btn').onclick = () => {
    settingsModal.classList.remove('open');
    passwordModal.classList.add('open');
    document.getElementById('password-input').value = '';
  };
  document.getElementById('close-password-modal').onclick = () => passwordModal.classList.remove('open');
  passwordModal.addEventListener('click', e => { if (e.target === passwordModal) passwordModal.classList.remove('open'); });

  document.getElementById('submit-password-btn').onclick = async () => {
    const newPw = document.getElementById('password-input').value.trim();
    if (!newPw) return;
    const submitBtn = document.getElementById('submit-password-btn');
    try {
      await updatePassword(user, newPw);
      submitBtn.textContent = 'UPDATED!';
      setTimeout(() => { passwordModal.classList.remove('open'); submitBtn.textContent = 'UPDATE PASSWORD'; }, 1200);
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        passwordModal.classList.remove('open');
        try { await promptReauth(); await updatePassword(user, newPw); }
        catch (e) { if (e.message !== 'cancelled') alert('Error: ' + e.message); }
      } else { alert('Error: ' + err.message); }
    }
  };

  // Friends modal
  const friendsModal = document.getElementById('friends-modal');
  document.getElementById('add-friends-btn').onclick = async () => {
    friendsModal.classList.add('open');
    await loadFriendsModal();
  };
  document.getElementById('close-friends-modal').onclick = () => friendsModal.classList.remove('open');
  friendsModal.addEventListener('click', e => { if (e.target === friendsModal) friendsModal.classList.remove('open'); });

  document.getElementById('copy-user-id-btn').onclick = () => {
    navigator.clipboard.writeText(myUserId).then(() => {
      const btn = document.getElementById('copy-user-id-btn');
      btn.textContent = 'COPIED!';
      setTimeout(() => { btn.textContent = 'COPY'; }, 1500);
    });
  };

  async function loadFriendsModal() {
    const fSnap = await getDocs(collection(db, "users", user.uid, "friends"));
    friendsList = fSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
    document.getElementById('stat-friends').textContent = fSnap.docs.length;
    const fListEl = document.getElementById('friends-list');
    fListEl.innerHTML = fSnap.empty
      ? '<li class="pf-list-empty">no friends yet</li>'
      : fSnap.docs.map(d => `<li class="pf-list-item">${d.data().username || d.data().userId || d.id}</li>`).join('');

    const pendingSnap = await getDocs(query(
      collection(db, "friendRequests"),
      where("toUid", "==", user.uid),
      where("status", "==", "pending")
    ));
    const pendingEl = document.getElementById('pending-list');
    pendingEl.innerHTML = '';
    if (pendingSnap.empty) {
      pendingEl.innerHTML = '<li class="pf-list-empty">no pending requests</li>';
    } else {
      for (const reqDoc of pendingSnap.docs) {
        const r = reqDoc.data();
        const li = document.createElement('li');
        li.className = 'pf-list-item pf-pending-item';
        li.innerHTML = `<span>${r.fromUsername || r.fromUserId}</span>
          <button class="pf-tiny-btn" data-accept="${reqDoc.id}" data-from-uid="${r.fromUid}" data-from-username="${r.fromUsername || ''}" data-from-userid="${r.fromUserId || ''}">ACCEPT</button>
          <button class="pf-tiny-btn pf-tiny-btn--decline" data-decline="${reqDoc.id}">DECLINE</button>`;
        pendingEl.appendChild(li);
      }
      pendingEl.querySelectorAll('[data-accept]').forEach(btn => {
        btn.onclick = async () => {
          const fromUid = btn.dataset.fromUid;
          const fromUsername = btn.dataset.fromUsername;
          const fromUserId = btn.dataset.fromUserid;
          await setDoc(doc(db, "users", user.uid, "friends", fromUid), { uid: fromUid, username: fromUsername, userId: fromUserId });
          await setDoc(doc(db, "users", fromUid, "friends", user.uid), { uid: user.uid, username: storedUsername, userId: myUserId });
          await updateDoc(doc(db, "friendRequests", btn.dataset.accept), { status: 'accepted' });
          await loadFriendsModal();
        };
      });
      pendingEl.querySelectorAll('[data-decline]').forEach(btn => {
        btn.onclick = async () => {
          await updateDoc(doc(db, "friendRequests", btn.dataset.decline), { status: 'declined' });
          await loadFriendsModal();
        };
      });
    }
  }

  const addFriendBtn = document.getElementById('add-friend-btn');
  const addFriendMsg = document.getElementById('add-friend-msg');
  addFriendBtn.onclick = async () => {
    const inputId = (document.getElementById('add-friend-input').value || '').trim();
    if (!inputId) return;
    if (inputId === myUserId) { addFriendMsg.textContent = "that's you!"; return; }
    addFriendMsg.textContent = '';
    addFriendBtn.disabled = true;
    try {
      const idDoc = await getDoc(doc(db, "userIds", inputId));
      if (!idDoc.exists()) { addFriendMsg.textContent = 'user not found'; addFriendBtn.disabled = false; return; }
      const toUid = idDoc.data().uid;
      const alreadyFriend = await getDoc(doc(db, "users", user.uid, "friends", toUid));
      if (alreadyFriend.exists()) { addFriendMsg.textContent = 'already friends!'; addFriendBtn.disabled = false; return; }
      const existingReqs = await getDocs(query(
        collection(db, "friendRequests"),
        where("fromUid", "==", user.uid),
        where("toUid", "==", toUid),
        where("status", "==", "pending")
      ));
      if (!existingReqs.empty) { addFriendMsg.textContent = 'request already sent'; addFriendBtn.disabled = false; return; }
      const toUserDoc = await getDoc(doc(db, "users", toUid));
      const toUsername = toUserDoc.exists() ? (toUserDoc.data().username || '') : '';
      await addDoc(collection(db, "friendRequests"), {
        fromUid: user.uid, fromUserId: myUserId, fromUsername: storedUsername,
        toUid, toUserId: inputId, toUsername,
        status: 'pending', createdAt: serverTimestamp()
      });
      document.getElementById('add-friend-input').value = '';
      addFriendMsg.textContent = `request sent to ${toUsername || inputId}!`;
    } catch (err) { addFriendMsg.textContent = 'error: ' + err.message; }
    addFriendBtn.disabled = false;
  };
});

