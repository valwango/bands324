// friends.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  let mm = parseInt(parts[0], 10), dd = parseInt(parts[1], 10), yy = parseInt(parts[2], 10);
  if (yy < 100) yy += 2000;
  return new Date(yy, mm - 1, dd);
}

function daysUntil(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d - now) / (1000*60*60*24));
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const section = document.getElementById('friends-section');
  const listEl  = document.getElementById('friends-index-list');
  if (!section || !listEl) return;

  // Handle ?addFriend=USERID invite link
  const params = new URLSearchParams(location.search);
  const inviteId = params.get('addFriend');
  if (inviteId) {
    // Remove param from URL without reload
    const url = new URL(location.href);
    url.searchParams.delete('addFriend');
    history.replaceState({}, '', url);

    // Look up the invited user
    const idDoc = await getDoc(doc(db, "userIds", inviteId));
    if (idDoc.exists()) {
      const friendUid = idDoc.data().uid;
      if (friendUid !== user.uid) {
        const friendUserDoc = await getDoc(doc(db, "users", friendUid));
        const friendData = friendUserDoc.exists() ? friendUserDoc.data() : {};
        await setDoc(doc(db, "users", user.uid, "friends", friendUid), {
          userId: inviteId,
          username: friendData.username || '',
          uid: friendUid,
        });
      }
    }
  }

  // Load friends list
  const friendsSnap = await getDocs(collection(db, "users", user.uid, "friends"));
  if (friendsSnap.empty) return;

  const now = new Date(); now.setHours(0,0,0,0);
  const friendCards = [];

  for (const friendDoc of friendsSnap.docs) {
    const { uid: friendUid, username } = friendDoc.data();
    if (!friendUid) continue;

    // Fetch friend's upcoming shows + festivals
    const [showsSnap, festivalsSnap] = await Promise.all([
      getDocs(collection(db, "users", friendUid, "shows")),
      getDocs(collection(db, "users", friendUid, "festivals")),
    ]);

    const upcoming = [];
    showsSnap.docs.forEach(d => {
      const ev = d.data();
      const days = daysUntil(ev.date);
      if (days !== null && days >= 0) upcoming.push({ ...ev, type: 'show', days });
    });
    festivalsSnap.docs.forEach(d => {
      const ev = d.data();
      const days = daysUntil(ev.date);
      if (days !== null && days >= 0) upcoming.push({ ...ev, type: 'festival', days });
    });
    upcoming.sort((a, b) => a.days - b.days);

    friendCards.push({ username, upcoming });
  }

  if (friendCards.every(f => f.upcoming.length === 0)) return;

  section.style.display = '';

  friendCards.forEach(({ username, upcoming }) => {
    if (upcoming.length === 0) return;

    const card = document.createElement('div');
    card.className = 'friend-card';

    const nameEl = document.createElement('div');
    nameEl.className = 'friend-card-name';
    nameEl.textContent = username || 'friend';
    card.appendChild(nameEl);

    upcoming.forEach(ev => {
      const row = document.createElement('div');
      row.className = 'friend-show-row';

      const daysEl = document.createElement('span');
      daysEl.className = 'friend-show-days';
      daysEl.textContent = ev.days === 0 ? 'today' : `${ev.days}d`;

      const bandEl = document.createElement('span');
      bandEl.className = 'friend-show-band';
      bandEl.textContent = ev.type === 'festival' ? (ev.name || '') : (ev.band || '');

      const venueEl = document.createElement('span');
      venueEl.className = 'friend-show-venue';
      venueEl.textContent = ev.venue || '';

      row.appendChild(daysEl);
      row.appendChild(bandEl);
      row.appendChild(venueEl);
      card.appendChild(row);
    });

    listEl.appendChild(card);
  });
});
