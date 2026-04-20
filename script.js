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
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const availableWidth = venueEl.clientWidth - paddingLeft - paddingRight;
  if (availableWidth <= 0) return;

  const defaultPx = Number.parseFloat(computed.fontSize) || 16;
  const isMobile = window.matchMedia('(max-width: 700px)').matches;
  const minPx = isMobile ? 8 : 6;
  const defaultSpacing = Number.parseFloat(computed.letterSpacing) || 0;
  const tolerancePx = 1;

  const fits = (fontSizePx, spacingPx) => {
    const width = measureVenueTextWidth(text, computed, fontSizePx, spacingPx);
    return width <= availableWidth + tolerancePx;
  };

  if (fits(defaultPx, defaultSpacing)) return;

  let best = defaultPx;
  let spacing = defaultSpacing;

  if (!fits(defaultPx, defaultSpacing) && fits(defaultPx, 0)) {
    spacing = 0;
    best = defaultPx;
  } else {
    let low = minPx;
    let high = defaultPx;
    best = minPx;

    while (high - low > 0.1) {
      const mid = (low + high) / 2;
      if (fits(mid, 0)) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    while (!fits(best, 0) && best > minPx) {
      best -= 0.25;
    }

    spacing = 0;
  }

  venueEl.style.setProperty('letter-spacing', `${spacing}px`, 'important');
  venueEl.style.setProperty('font-size', `${best.toFixed(2)}px`, 'important');

  while (venueEl.scrollWidth > venueEl.clientWidth + 1 && best > minPx) {
    best -= 0.25;
    venueEl.style.setProperty('font-size', `${best.toFixed(2)}px`, 'important');
  }
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

const autoFitObservedEls = new WeakSet();
const autoFitResizeObserver = typeof ResizeObserver === 'function'
  ? new ResizeObserver((entries) => {
      const seenBlocks = new Set();
      entries.forEach((entry) => {
        const blockEl = entry.target.classList?.contains('block') ? entry.target : entry.target.closest('.block');
        if (!blockEl || seenBlocks.has(blockEl)) return;
        seenBlocks.add(blockEl);
        requestAnimationFrame(() => refitBlockText(blockEl));
      });
    })
  : null;

function observeAutoFit(el) {
  const blockEl = el?.closest('.block');
  if (!blockEl || !autoFitResizeObserver || autoFitObservedEls.has(blockEl)) return;
  autoFitObservedEls.add(blockEl);
  autoFitResizeObserver.observe(blockEl);
}

let venueRefitRaf = 0;

window.addEventListener('resize', () => {
  cancelAnimationFrame(venueRefitRaf);
  venueRefitRaf = requestAnimationFrame(() => {
    requestAnimationFrame(refitAllVenuesMobile);
  });
});

if (document.fonts && typeof document.fonts.ready?.then === 'function') {
  document.fonts.ready.then(() => {
    requestAnimationFrame(() => requestAnimationFrame(refitAllVenuesMobile));
  });
}

window.addEventListener('load', () => {
  requestAnimationFrame(() => requestAnimationFrame(refitAllVenuesMobile));
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
    observeAutoFit(bandDiv);
    observeAutoFit(venueDiv);
    fitVenueTextMobile(bandDiv);
    fitVenueTextMobile(venueDiv);
    requestAnimationFrame(() => {
      fitVenueTextMobile(bandDiv);
      fitVenueTextMobile(venueDiv);
    });
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

  requestAnimationFrame(() => {
    observeAutoFit(nameDiv);
    fitVenueTextMobile(nameDiv);
    requestAnimationFrame(() => fitVenueTextMobile(nameDiv));
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