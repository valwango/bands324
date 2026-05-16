// global.js — loads all bands from all users and renders a scrolling ticker
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collectionGroup, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const section = document.getElementById('global-section');
const ticker = document.getElementById('global-ticker');
if (!section || !ticker) throw new Error('global section missing');

async function loadGlobalBands() {
  const names = new Set();

  // Read all shows across all users
  const showsSnap = await getDocs(collectionGroup(db, "shows"));
  showsSnap.forEach(d => {
    const { band, guests } = d.data();
    if (band && band.trim()) names.add(band.trim());
    if (Array.isArray(guests)) guests.forEach(g => { if (g && g.trim()) names.add(g.trim()); });
  });

  // Read all festivals across all users
  const festsSnap = await getDocs(collectionGroup(db, "festivals"));
  festsSnap.forEach(d => {
    const { name, artists } = d.data();
    if (name && name.trim()) names.add(name.trim());
    if (Array.isArray(artists)) artists.forEach(a => { if (a && a.trim()) names.add(a.trim()); });
  });

  if (names.size === 0) return;

  // Sort alphabetically
  const sorted = [...names].sort((a, b) =>
    a.replace(/^the\s+/i, '').localeCompare(b.replace(/^the\s+/i, ''))
  );

  // Build ticker: duplicate list for seamless loop
  const makeItems = () => sorted.map(name => {
    const span = document.createElement('span');
    span.className = 'global-ticker-item';
    span.textContent = name;
    return span;
  });

  makeItems().forEach(el => ticker.appendChild(el));
  makeItems().forEach(el => ticker.appendChild(el));

  // Adjust speed based on content width
  requestAnimationFrame(() => {
    const totalWidth = ticker.scrollWidth / 2;
    const speed = Math.max(20, totalWidth / 80);
    ticker.style.animationDuration = `${speed}s`;
  });

  section.style.display = '';
}

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  loadGlobalBands().catch(err => console.error('global bands error:', err));
});
