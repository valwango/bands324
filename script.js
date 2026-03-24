// Demo data for upcoming and past shows
const upcoming = [
  {
    date: "04/10/26",
    band: "Coachella Weekend 1",
    venue: "Empire Polo Club",
    bgImage: "pink.png",
  },
  {
    date: "08/07/26",
    band: "Outside Lands",
    venue: "Golden Gate Park",
    bgImage: "darkgreen.png",
  },
  {
    date: "05/15/26",
    band: "The Strokes",
    venue: "Barclays Center",
    bgImage: "darkblue.png",
  }
];

const past = [
  {
    date: "03/01/26",
    band: "Arctic Monkeys",
    venue: "The Forum",
   
  },
  {
    date: "02/10/26",
    band: "Tame Impala",
    venue: "Madison Square Garden",
    bgImage: "redorange.png",
    
  },
  {
    date: "01/20/26",
    band: "Phoebe Bridgers",
    venue: "Greek Theatre",
    bgImage: "purple.png",
    
  }
];

function daysUntil(dateStr) {
  // dateStr: MM/DD/YY
  const [mm, dd, yy] = dateStr.split('/');
  const eventDate = new Date(`20${yy}-${mm}-${dd}T00:00:00`);
  const now = new Date();
  // Zero out time for today
  now.setHours(0,0,0,0);
  const diff = Math.round((eventDate - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function createBlock(row, idx, type) {
  const block = document.createElement('div');
  block.className = 'block';
  block.tabIndex = 0;
  block.setAttribute('data-idx', idx);
  block.setAttribute('data-type', type);
  // Use edited data from localStorage if present
  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  const showKey = 'show-' + slugify(row.band);
  let edited = null;
  try { edited = JSON.parse(localStorage.getItem(showKey)); } catch {}
  const band = edited?.band || row.band;
  const venue = edited?.venue || row.venue;
  const date = edited?.date || row.date;
  const bgImage = edited?.bgImage || row.bgImage || 'blackband.png';
  block.style.backgroundImage = `url('assets/${bgImage}')`;

  // Date bubble
  const dateDiv = document.createElement('div');
  dateDiv.className = 'days';
  // Helper to format date as MM/DD/YY
  function formatDate2Digit(dateStr) {
    const [mm, dd, yy] = dateStr.split('/');
    return `${mm}/${dd}/${yy.length === 2 ? yy : yy.slice(-2)}`;
  }
  if (type === 'upcoming') {
    const days = daysUntil(date);
    if (days === 0) {
      dateDiv.textContent = 'TODAY';
    } else if (days === 1) {
      dateDiv.innerHTML = `<span class="days-num">1</span><span class="days-label">DAYS</span>`;
    } else if (days > 1) {
      dateDiv.innerHTML = `<span class="days-num">${days}</span><span class="days-label">DAYS</span>`;
    } else {
      dateDiv.textContent = formatDate2Digit(date);
    }
  } else {
    dateDiv.innerHTML = `<span class="past-date-label">${formatDate2Digit(date)}</span>`;
  }
  block.appendChild(dateDiv);

  // Band name
  const bandDiv = document.createElement('div');
  bandDiv.className = 'band';
  bandDiv.textContent = band;
  // Venue
  const venueDiv = document.createElement('div');
  venueDiv.className = 'venue';
  venueDiv.textContent = venue;

  // Add drop shadow if yellow or neonyellow background
  const bg = (bgImage || '').toLowerCase();
  if (bg === 'yellow.png' || bg === 'neonyellow.png') {
    bandDiv.classList.add('band-venue-dropshadow');
    venueDiv.classList.add('band-venue-dropshadow');
  }
  block.appendChild(bandDiv);
  block.appendChild(venueDiv);

  // Add click event to open the corresponding show page
  const showPage = `show/${slugify(row.band)}.html`;
  block.addEventListener('click', () => {
    window.location.href = showPage;
  });

  return block;
}


function parseDate(dateStr) {
  // MM/DD/YY to Date
  const [mm, dd, yy] = dateStr.split('/');
  return new Date(`20${yy}-${mm}-${dd}T00:00:00`);
}

function renderList() {
  const upcomingBlocks = document.getElementById('upcoming-list');
  const pastBlocks = document.getElementById('past-list');
  upcomingBlocks.innerHTML = '';
  pastBlocks.innerHTML = '';

  // Combine all shows (original + edited)
  function getEdited(row) {
    function slugify(str) {
      return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const showKey = 'show-' + slugify(row.band);
    let edited = null;
    try { edited = JSON.parse(localStorage.getItem(showKey)); } catch {}
    return {
      ...row,
      ...edited
    };
  }
  const allShows = [
    ...upcoming.map(getEdited),
    ...past.map(getEdited)
  ];

  // Re-categorize based on current date
  const now = new Date();
  now.setHours(0,0,0,0);
  const newUpcoming = [];
  const newPast = [];
  allShows.forEach(show => {
    const showDate = parseDate(show.date);
    if (showDate >= now) {
      newUpcoming.push(show);
    } else {
      newPast.push(show);
    }
  });

  // Sort and render
  newUpcoming.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  newPast.sort((a, b) => parseDate(b.date) - parseDate(a.date));
  newUpcoming.forEach((row, idx) => {
    upcomingBlocks.appendChild(createBlock(row, idx, 'upcoming'));
  });
  newPast.forEach((row, idx) => {
    pastBlocks.appendChild(createBlock(row, idx, 'past'));
  });
}

// Add block button logic
window.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-block-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      window.location.href = 'star.html';
    });
  }
});


document.addEventListener('DOMContentLoaded', () => {
  // Check for new show in localStorage
  const newShowStr = localStorage.getItem('newShow');
  if (newShowStr) {
    try {
      const newShow = JSON.parse(newShowStr);
      if (newShow && newShow.band && newShow.venue && newShow.date) {
        // Determine if upcoming or past
        const showDate = parseDate(newShow.date);
        const now = new Date();
        now.setHours(0,0,0,0);
        if (showDate >= now) {
          upcoming.push(newShow);
        } else {
          past.push(newShow);
        }
      }
    } catch (e) {}
    localStorage.removeItem('newShow');
  }
  renderList();
});
