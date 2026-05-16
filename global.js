// global.js — FOMO Feed
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collectionGroup, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const section = document.getElementById('global-section');
const feed = document.getElementById('global-feed');
if (!section || !feed) throw new Error('global section missing');

function parseDateStr(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  let mm = parseInt(parts[0], 10), dd = parseInt(parts[1], 10), yy = parseInt(parts[2], 10);
  if (yy < 100) yy += 2000;
  return new Date(yy, mm - 1, dd);
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
  const months = ['JAN.','FEB.','MAR.','APR.','MAY','JUN.','JUL.','AUG.','SEP.','OCT.','NOV.','DEC.'];
  return months[date.getMonth()] + (date.getFullYear() !== now.getFullYear() ? ' ' + date.getFullYear() : '');
}

async function loadGlobalFeed() {
  const entries = [];
  const userCache = new Map();

  async function getUsername(uid) {
    if (userCache.has(uid)) return userCache.get(uid);
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const name = userDoc.exists() && userDoc.data().username ? userDoc.data().username : 'someone';
      userCache.set(uid, name);
      return name;
    } catch {
      userCache.set(uid, 'someone');
      return 'someone';
    }
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const showsSnap = await getDocs(collectionGroup(db, 'shows')).catch(() => ({ docs: [] }));
  for (const d of showsSnap.docs) {
    const data = d.data();
    if (!data.band || !data.date) continue;
    const parsed = parseDateStr(data.date);
    if (!parsed || parsed >= now) continue;
    entries.push({
      uid: d.ref.parent.parent.id,
      label: data.band,
      venue: data.venue || '',
      diary: data.diary || '',
      photoUrl: data.photoUrl || '',
      date: parsed,
      type: 'show'
    });
  }

  const festsSnap = await getDocs(collectionGroup(db, 'festivals')).catch(() => ({ docs: [] }));
  for (const d of festsSnap.docs) {
    const data = d.data();
    if (!data.name || !data.date) continue;
    const parsed = parseDateStr(data.date);
    if (!parsed || parsed >= now) continue;
    entries.push({
      uid: d.ref.parent.parent.id,
      label: data.name,
      venue: data.venue || '',
      diary: data.diary || '',
      photoUrl: data.photoUrl || '',
      date: parsed,
      type: 'festival'
    });
  }

  if (entries.length === 0) return;

  entries.sort((a, b) => b.date - a.date);

  await Promise.all([...new Set(entries.map(e => e.uid))].map(uid => getUsername(uid)));

  feed.innerHTML = '';
  for (const entry of entries.slice(0, 100)) {
    const username = userCache.get(entry.uid) || 'someone';
    const verb = entry.type === 'festival' ? 'went to' : 'saw';
    const venueStr = entry.venue ? ` at <span class="fomo-venue">${entry.venue}</span>` : '';

    const card = document.createElement('div');
    card.className = 'fomo-card' + (entry.photoUrl ? ' fomo-card--photo' : '');

    card.innerHTML =
      `<div class="fomo-card-text">` +
        `<div class="fomo-card-meta">` +
          `<span class="fomo-card-user">${username}</span>` +
          `<span class="fomo-card-time">${relativeDate(entry.date)}</span>` +
        `</div>` +
        `<div class="fomo-card-action">${verb} <span class="fomo-artist">${entry.label}</span>${venueStr}</div>` +
        (entry.diary ? `<div class="fomo-diary">“${entry.diary}”</div>` : '') +
      `</div>` +
      (entry.photoUrl ? `<div class="fomo-card-photo" style="background-image:url('${entry.photoUrl}')"></div>` : '');

    feed.appendChild(card);
  }

  section.style.display = '';
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadGlobalFeed().catch(err => console.error('fomo feed error:', err));
});


