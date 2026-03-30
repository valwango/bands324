// index.js (integrated with Firebase per-user shows)
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot, doc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --------------------
// Helpers
// --------------------
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Parses mm/dd/yy or mm/dd/yyyy to Date object
function parseDate(dateStr) {
  const parts = dateStr.split('/');
  let mm = parseInt(parts[0],10);
  let dd = parseInt(parts[1],10);
  let yy = parseInt(parts[2],10);
  if (yy < 100) yy += 2000;
  return new Date(yy, mm-1, dd);
}

function daysUntil(dateStr) {
  const eventDate = parseDate(dateStr);
  const now = new Date();
  now.setHours(0,0,0,0);
  return Math.round((eventDate - now)/(1000*60*60*24));
}

function createBlock(row, idx, type) {
  const block = document.createElement('div');
  block.className = 'block';
  block.tabIndex = 0;
  block.setAttribute('data-idx', idx);
  block.setAttribute('data-type', type);

  const { band, venue, date, bgImage='blackband.png' } = row;
  block.style.backgroundImage = `url('assets/${bgImage}')`;

  const dateDiv = document.createElement('div');
  dateDiv.className = 'days';
  if (type === 'upcoming') {
    const days = daysUntil(date);
    if (days === 0) dateDiv.textContent = 'TODAY';
    else if (days === 1) dateDiv.innerHTML = `<span class="days-num">1</span><span class="days-label">DAY</span>`;
    else if (days > 1) dateDiv.innerHTML = `<span class="days-num">${days}</span><span class="days-label">DAYS</span>`;
    else dateDiv.textContent = date;
  } else {
    // Assign a random rippedsticky background to the .days div
    const rippedStickies = [
      'rippedsticky.png',
      'rippedsticky1.png',
      'rippedsticky2.png'
    ];
    const randomSticky = rippedStickies[Math.floor(Math.random() * rippedStickies.length)];
    dateDiv.innerHTML = `<span class="past-date-label">${date}</span>`;
    dateDiv.style.backgroundImage = `url('assets/${randomSticky}')`;
  }
  block.appendChild(dateDiv);

  const bandDiv = document.createElement('div');
  bandDiv.className = 'band';
  bandDiv.textContent = band;

  const venueDiv = document.createElement('div');
  venueDiv.className = 'venue';
  venueDiv.textContent = venue;

  if (bgImage.toLowerCase() === 'yellow.png' || bgImage.toLowerCase() === 'neonyellow.png') {
    bandDiv.classList.add('band-venue-dropshadow');
    venueDiv.classList.add('band-venue-dropshadow');
  }

  block.appendChild(bandDiv);
  block.appendChild(venueDiv);

  // Click to show page
  const showPage = `show/${slugify(band)}.html`;
  block.addEventListener('click', () => window.location.href = showPage);

  return block;
}

// --------------------
// Real-time listener for user's shows
// --------------------
function listenToShows(user) {
  const upcomingBlocks = document.getElementById('upcoming-list');
  const pastBlocks = document.getElementById('past-list');

  const showsRef = collection(db, "users", user.uid, "shows");
  const q = query(showsRef, orderBy("date"));

  onSnapshot(q, (snapshot) => {
    const allShows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const now = new Date();
    now.setHours(0,0,0,0);

    const upcoming = [];
    const past = [];

    allShows.forEach(show => {
      const showDate = parseDate(show.date);
      if (showDate >= now) upcoming.push(show);
      else past.push(show);
    });

    upcoming.sort((a,b)=>parseDate(a.date)-parseDate(b.date));
    past.sort((a,b)=>parseDate(b.date)-parseDate(a.date));

    upcomingBlocks.innerHTML='';
    pastBlocks.innerHTML='';

    upcoming.forEach((row, idx)=>upcomingBlocks.appendChild(createBlock(row, idx, 'upcoming')));
    past.forEach((row, idx)=>pastBlocks.appendChild(createBlock(row, idx, 'past')));
  });
}

// --------------------
// Auth & initialize
// --------------------
onAuthStateChanged(auth, async (user) => {
  if(!user){
    window.location.href = "login.html";
    return;
  }

  // Ensure user doc exists
  await setDoc(doc(db,"users",user.uid), { lastLogin: new Date() }, { merge:true });

  // Listen to this user's shows
  listenToShows(user);
});

// --------------------
// Logout button
// --------------------
const logoutBtn = document.getElementById('logout-btn');
if(logoutBtn){
  logoutBtn.addEventListener('click', async ()=>{
    await signOut(auth);
    window.location.href="login.html";
  });
}

// --------------------
// Add show button
// --------------------
const addBtn = document.getElementById('add-block-btn');
if(addBtn){
  addBtn.addEventListener('click', ()=>window.location.href='star.html');
}