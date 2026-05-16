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

function relativeDate(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'LAST NIGHT';
  if (diff < 7) {
    const days = ['SUN.','MON.','TUE.','WED.','THU.','FRI.','SAT.'];
    return 'LAST ' + days[date.getDay()];
  }
  if (diff < 14) return 'LAST WEEK';
  if (diff < 21) return 'TWO WEEKS AGO';
  if (diff < 28) return 'THREE WEEKS AGO';
  if (diff < 60) return 'LAST MONTH';
  const monthWords = ['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN'];
  const monthsAgo = Math.min(11, Math.round(diff / 30.44));
  if (date.getFullYear() === now.getFullYear()) return (monthWords[monthsAgo] || monthsAgo) + ' MONTHS AGO';
  const months = ['JAN.','FEB.','MAR.','APR.','MAY','JUN.','JUL.','AUG.','SEP.','OCT.','NOV.','DEC.'];
  return months[date.getMonth()] + ' ' + date.getFullYear();
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
  const pastEntries = [];

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
      // collect past entries visible to friends
      if (days !== null && days < 0 && ev.privacy !== 'secret') {
        const parsed = parseDate(ev.date);
        if (parsed) pastEntries.push({ username, label: ev.band, venue: ev.venue || '', diary: ev.diary || '', photoUrl: ev.photoUrl || '', date: parsed, type: 'show' });
      }
    });
    festivalsSnap.docs.forEach(d => {
      const ev = d.data();
      const days = daysUntil(ev.date);
      if (days !== null && days >= 0) upcoming.push({ ...ev, type: 'festival', days });
      if (days !== null && days < 0 && ev.privacy !== 'secret') {
        const parsed = parseDate(ev.date);
        if (parsed) pastEntries.push({ username, label: ev.name, venue: ev.venue || '', diary: ev.diary || '', photoUrl: ev.photoUrl || '', date: parsed, type: 'festival' });
      }
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

  // --- Friends Feed (past shows) ---
  const feedSection = document.getElementById('friends-feed-section');
  const feedEl = document.getElementById('friends-feed');
  if (feedSection && feedEl && pastEntries.length > 0) {
    pastEntries.sort((a, b) => b.date - a.date);
    feedEl.innerHTML = '';
    for (const entry of pastEntries.slice(0, 100)) {
      const verb = entry.type === 'festival' ? 'went to' : 'saw';
      const venueStr = entry.venue ? ` at <span class="fomo-venue">${entry.venue}</span>` : '';
      const card = document.createElement('div');
      card.className = 'fomo-card';
      card.innerHTML =
        `<div class="fomo-card-text">` +
          `<div class="fomo-card-meta">` +
            `<span class="fomo-card-user">${entry.username || 'friend'}</span>` +
            `<span class="fomo-card-time">${relativeDate(entry.date)}</span>` +
          `</div>` +
          `<div class="fomo-card-action">${verb} <span class="fomo-artist">${entry.label}</span>${venueStr}</div>` +
          (entry.diary ? `<div class="fomo-diary">“${entry.diary}”</div>` : '') +
        `</div>` +
        (entry.photoUrl ? `<div class="fomo-card-photo" style="background-image:url('${entry.photoUrl}')"></div>` : '');
      feedEl.appendChild(card);
    }
    feedSection.style.display = '';
  }
});
