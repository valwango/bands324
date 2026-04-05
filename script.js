// script.js
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

// --------------------
// Star show block
// --------------------
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
    const rippedStickies = ['rippedsticky.png','rippedsticky1.png','rippedsticky2.png'];
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
  block.addEventListener('click', () => {
    window.location.href = `show.html?id=${row.id}`;
  });

  return block;
}

// --------------------
// Festival block
// --------------------
function createFestivalBlock(row, idx, type) {
  const block = document.createElement('div');
  block.className = 'block';
  block.tabIndex = 0;
  block.setAttribute('data-idx', idx);
  block.setAttribute('data-type', type);

  const { name, date, bgImage='blacklong.png' } = row;
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
    const rippedStickies = ['rippedsticky.png','rippedsticky1.png','rippedsticky2.png'];
    const randomSticky = rippedStickies[Math.floor(Math.random() * rippedStickies.length)];
    dateDiv.innerHTML = `<span class="past-date-label">${date}</span>`;
    dateDiv.style.backgroundImage = `url('assets/${randomSticky}')`;
  }
  block.appendChild(dateDiv);

  const nameDiv = document.createElement('div');
  nameDiv.className = 'band';
  nameDiv.textContent = name; // only show festival name
  block.appendChild(nameDiv);

  block.addEventListener('click', () => {
    window.location.href = `festival.html?id=${row.id}`;
  });

  return block;
}

// --------------------
// Real-time listener for user's shows & festivals
// --------------------
function listenToUserEvents(user) {
  const upcomingBlocks = document.getElementById('upcoming-list');
  const pastBlocks = document.getElementById('past-list');

  // Shows
  const showsRef = collection(db, "users", user.uid, "shows");
  const showsQuery = query(showsRef, orderBy("date"));

  onSnapshot(showsQuery, (snapshot) => {
    const allShows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type:'show' }));

    // Festivals
    const festivalsRef = collection(db, "users", user.uid, "festivals");
    const festivalsQuery = query(festivalsRef, orderBy("date"));

    onSnapshot(festivalsQuery, (festSnap) => {
      const allFestivals = festSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type:'festival' }));

      // Combine shows and festivals
      const allEvents = [...allShows, ...allFestivals];

      // Split upcoming/past
      const now = new Date();
      now.setHours(0,0,0,0);
      const upcoming = [];
      const past = [];

      allEvents.forEach(ev => {
        const eventDate = parseDate(ev.date);
        if (eventDate >= now) upcoming.push(ev);
        else past.push(ev);
      });

      upcoming.sort((a,b)=>parseDate(a.date)-parseDate(b.date));
      past.sort((a,b)=>parseDate(b.date)-parseDate(a.date));

      upcomingBlocks.innerHTML = '';
      pastBlocks.innerHTML = '';

      upcoming.forEach((ev, idx) => {
        if(ev.type === 'show') upcomingBlocks.appendChild(createBlock(ev, idx, 'upcoming'));
        else if(ev.type === 'festival') upcomingBlocks.appendChild(createFestivalBlock(ev, idx, 'upcoming'));
      });

      past.forEach((ev, idx) => {
        if(ev.type === 'show') pastBlocks.appendChild(createBlock(ev, idx, 'past'));
        else if(ev.type === 'festival') pastBlocks.appendChild(createFestivalBlock(ev, idx, 'past'));
      });
    });
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

  await setDoc(doc(db,"users",user.uid), { lastLogin: new Date() }, { merge:true });

  listenToUserEvents(user);
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