// global.js — global activity feed
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
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) {
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    return 'on ' + days[date.getDay()];
  }
  if (diff < 14) return 'last week';
  if (diff < 21) return '2 weeks ago';
  if (diff < 28) return '3 weeks ago';
  if (diff < 60) return 'last month';
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  return 'in ' + months[date.getMonth()] + (date.getFullYear() !== now.getFullYear() ? ' ' + date.getFullYear() : '');
}

async function loadGlobalFeed() {
  const entries = [];
  const userCache = new Map();

  async function getUsername(uid) {
    if (userCache.has(uid)) return userCache.get(uid);
    const userDoc = await getDoc(doc(db, 'users', uid));
    const name = userDoc.exists() && userDoc.data().username ? userDoc.data().username : 'someone';
    userCache.set(uid, name);
    return name;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const showsSnap = await getDocs(collectionGroup(db, 'shows'));
  for (const d of showsSnap.docs) {
    const { band, date } = d.data();
    if (!band || !date) continue;
    const parsed = parseDateStr(date);
    if (!parsed || parsed >= now) continue;
    entries.push({ uid: d.ref.parent.parent.id, label: band, date: parsed, type: 'show' });
  }

  const festsSnap = await getDocs(collectionGroup(db, 'festivals'));
  for (const d of festsSnap.docs) {
    const { name, date } = d.data();
    if (!name || !date) continue;
    const parsed = parseDateStr(date);
    if (!parsed || parsed >= now) continue;
    entries.push({ uid: d.ref.parent.parent.id, label: name, date: parsed, type: 'festival' });
  }

  if (entries.length === 0) return;

  entries.sort((a, b) => b.date - a.date);

  // Prefetch all usernames
  await Promise.all([...new Set(entries.map(e => e.uid))].map(uid => getUsername(uid)));

  feed.innerHTML = '';
  for (const entry of entries.slice(0, 100)) {
    const username = userCache.get(entry.uid) || 'someone';
    const verb = entry.type === 'festival' ? 'went to' : 'saw';
    const row = document.createElement('div');
    row.className = 'global-feed-row';
    row.innerHTML =
      `<span class="global-feed-user">${username}</span>` +
      ` ${verb} ` +
      `<span class="global-feed-artist">${entry.label}</span>` +
      ` <span class="global-feed-time">${relativeDate(entry.date)}</span>`;
    feed.appendChild(row);
  }

  section.style.display = '';
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadGlobalFeed().catch(err => console.error('global feed error:', err));
});

