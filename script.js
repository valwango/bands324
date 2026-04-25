// script.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, onSnapshot, doc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { goToPage } from "./navigation.js";

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

const venueMeasureEl = document.createElement('span');
venueMeasureEl.style.position = 'absolute';
venueMeasureEl.style.visibility = 'hidden';
venueMeasureEl.style.pointerEvents = 'none';
venueMeasureEl.style.whiteSpace = 'nowrap';
document.body.appendChild(venueMeasureEl);

function measureVenueTextWidth(text, style, fontSizePx, letterSpacingPx) {
  venueMeasureEl.style.fontFamily = style.fontFamily;
  venueMeasureEl.style.fontWeight = style.fontWeight;
  venueMeasureEl.style.fontStyle = style.fontStyle;
  venueMeasureEl.style.textTransform = style.textTransform;
  venueMeasureEl.style.fontSize = `${fontSizePx}px`;
  venueMeasureEl.style.letterSpacing = `${letterSpacingPx}px`;
  venueMeasureEl.textContent = text;
  return venueMeasureEl.getBoundingClientRect().width;
}

function getAvailableWidth(venueEl, computed) {
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;

  // Use the element's own width if it has been laid out.
  const elWidth = venueEl.getBoundingClientRect().width;
  if (elWidth > 0) return elWidth - paddingLeft - paddingRight - 1;

  // Fallback: derive from the parent block minus the sticky/days column.
  const blockEl = venueEl.closest('.block');
  if (!blockEl) return 0;
  const blockWidth = blockEl.getBoundingClientRect().width;
  if (!blockWidth) return 0;

  const daysEl = blockEl.querySelector('.days');
  const daysWidth = daysEl ? daysEl.getBoundingClientRect().width : 76;

  const blockComputed = window.getComputedStyle(blockEl);
  const blockPadL = Number.parseFloat(blockComputed.paddingLeft) || 0;
  const blockPadR = Number.parseFloat(blockComputed.paddingRight) || 0;

  // Two equal columns (band + venue) share the remaining space.
  const remaining = blockWidth - blockPadL - blockPadR - daysWidth;
  return Math.floor(remaining / 2) - paddingLeft - paddingRight - 1;
}

function fitVenueTextMobile(venueEl) {
  if (!venueEl) return;

  const text = (venueEl.textContent || '').trim();
  if (!text) return;

  const isVenue = venueEl.classList.contains('venue');

  venueEl.style.removeProperty('font-size');
  venueEl.style.removeProperty('letter-spacing');
  venueEl.style.display = 'block';
  venueEl.style.justifyContent = 'initial';
  venueEl.style.textAlign = isVenue ? 'right' : 'left';
  venueEl.style.whiteSpace = 'nowrap';
  venueEl.style.overflow = 'hidden';
  venueEl.style.textOverflow = 'clip';

  const computed = window.getComputedStyle(venueEl);
  const availableWidth = getAvailableWidth(venueEl, computed);
  if (availableWidth <= 0) return;

  const defaultPx = Number.parseFloat(computed.fontSize) || 16;
  const minPx = 8;
  const defaultSpacing = Number.parseFloat(computed.letterSpacing) || 0;

  const fits = (fontSizePx, spacingPx) => {
    return measureVenueTextWidth(text, computed, fontSizePx, spacingPx) <= availableWidth;
  };

  // Text fits at default size — nothing to do.
  if (fits(defaultPx, defaultSpacing)) return;

  // Try removing letter-spacing first before shrinking font.
  if (fits(defaultPx, 0)) {
    venueEl.style.setProperty('letter-spacing', '0px', 'important');
    return;
  }

  // Binary search for the largest font size that fits.
  let low = minPx;
  let high = defaultPx;
  let best = minPx;

  while (high - low > 0.1) {
    const mid = (low + high) / 2;
    if (fits(mid, 0)) {
      best = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  venueEl.style.setProperty('letter-spacing', '0px', 'important');
  venueEl.style.setProperty('font-size', `${best.toFixed(2)}px`, 'important');
}

function refitBlockText(blockEl) {
  if (!blockEl) return;

  const bandEl = blockEl.querySelector('.band');
  const venueEl = blockEl.querySelector('.venue');

  for (let pass = 0; pass < 3; pass += 1) {
    if (venueEl) fitVenueTextMobile(venueEl);
    if (bandEl) fitVenueTextMobile(bandEl);
  }
}

function refitAllVenuesMobile() {
  document.querySelectorAll('.block').forEach((blockEl) => refitBlockText(blockEl));
}

let venueRefitRaf = 0;
let _lastRefitWidth = 0;

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  if (w === _lastRefitWidth) return; // height-only change (mobile chrome show/hide)
  _lastRefitWidth = w;
  cancelAnimationFrame(venueRefitRaf);
  venueRefitRaf = requestAnimationFrame(() => {
    requestAnimationFrame(refitAllVenuesMobile);
  });
});

// ResizeObserver gives reliable notification of container size changes
// (catches mobile orientation changes, scrollbar appearing, etc.)
if (typeof ResizeObserver !== 'undefined') {
  let roRaf = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(roRaf);
    roRaf = requestAnimationFrame(() => requestAnimationFrame(refitAllVenuesMobile));
  });
  ['upcoming-list', 'past-list'].forEach(id => {
    const el = document.getElementById(id);
    if (el) ro.observe(el);
  });
}

if (document.fonts && typeof document.fonts.ready?.then === 'function') {
  document.fonts.ready.then(() => {
    requestAnimationFrame(() => requestAnimationFrame(refitAllVenuesMobile));
  });
}

window.addEventListener('load', () => {
  requestAnimationFrame(() => requestAnimationFrame(refitAllVenuesMobile));
  setTimeout(refitAllVenuesMobile, 300);
});

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

  requestAnimationFrame(() => {
    fitVenueTextMobile(bandDiv);
    fitVenueTextMobile(venueDiv);
  });

  // Click to show page
  block.addEventListener('click', () => {
    goToPage("show.html", { id: row.id });
  });

  return block;
}

// --------------------
// Festival block
// --------------------
function createFestivalBlock(row, idx, type) {
  const block = document.createElement('div');
  block.className = 'block festival';
  block.tabIndex = 0;
  block.setAttribute('data-idx', idx);
  block.setAttribute('data-type', type);

  const { name, date, bgImage='blacklong.png', venue='' } = row;
  block.style.backgroundImage = `url('assets/${bgImage}')`;

  const shortImage = bgImage.replace('long.png', 'short.png');

  const dateDiv = document.createElement('div');
  dateDiv.className = 'days';
  dateDiv.style.backgroundImage = `url('assets/${shortImage}')`;
  if (type === 'upcoming') {
    const days = daysUntil(date);
    if (days === 0) dateDiv.textContent = 'TODAY';
    else if (days === 1) dateDiv.innerHTML = `<span class="days-num">1</span><span class="days-label">DAY</span>`;
    else if (days > 1) dateDiv.innerHTML = `<span class="days-num">${days}</span><span class="days-label">DAYS</span>`;
    else dateDiv.textContent = date;
  } else {
    dateDiv.innerHTML = `<span class="past-date-label">${date}</span>`;
  }
  block.appendChild(dateDiv);

  const nameDiv = document.createElement('div');
  nameDiv.className = 'band';
  nameDiv.textContent = name;
  block.appendChild(nameDiv);

  const venueDiv = document.createElement('div');
  venueDiv.className = 'venue';
  venueDiv.textContent = venue;
  block.appendChild(venueDiv);

  requestAnimationFrame(() => {
    fitVenueTextMobile(nameDiv);
    fitVenueTextMobile(venueDiv);
  });

  block.addEventListener('click', () => {
    goToPage("moon.html", { id: row.id });
  });

  return block;
}

// --------------------
// Real-time listener for user's shows & festivals
// --------------------
function listenToUserEvents(user) {
  const upcomingBlocks = document.getElementById('upcoming-list');
  const pastBlocks = document.getElementById('past-list');
  const loadingEl = document.getElementById('blocks-loading');

  const hideLoader = () => {
    if (loadingEl) loadingEl.classList.add('is-hidden');
  };

  if (loadingEl) loadingEl.classList.remove('is-hidden');
  let hasRenderedOnce = false;

  // Failsafe: never leave the loader spinning forever.
  const loaderTimeout = window.setTimeout(() => {
    if (!hasRenderedOnce) hideLoader();
  }, 8000);

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

      requestAnimationFrame(() => {
        requestAnimationFrame(refitAllVenuesMobile);
        setTimeout(refitAllVenuesMobile, 100);
        setTimeout(refitAllVenuesMobile, 300);
        setTimeout(refitAllVenuesMobile, 700);
        setTimeout(refitAllVenuesMobile, 1500);
      });

      if (!hasRenderedOnce) {
        hasRenderedOnce = true;
        window.clearTimeout(loaderTimeout);
        hideLoader();
      }
    }, (error) => {
      console.error('Festivals listener failed:', error);
      window.clearTimeout(loaderTimeout);
      hideLoader();
    });
  }, (error) => {
    console.error('Shows listener failed:', error);
    window.clearTimeout(loaderTimeout);
    hideLoader();
  });
}

// --------------------
// Auth & initialize
// --------------------
onAuthStateChanged(auth, async (user) => {
  if(!user){
    goToPage("login.html");
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
    goToPage("login.html");
  });
}

// --------------------
// Add show button
// --------------------
const addBtn = document.getElementById('add-block-btn');
if(addBtn){
  addBtn.addEventListener('click', ()=>goToPage("star.html"));
}