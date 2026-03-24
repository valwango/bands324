// Shared logic for editing a show and updating localStorage for index.html

function getShowKey() {
  // Use the page filename (without extension) as the key
  const path = window.location.pathname;
  const file = path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
  return 'show-' + file;
}

function saveShowData(data) {
  localStorage.setItem(getShowKey(), JSON.stringify(data));
}

function loadShowData() {
  const raw = localStorage.getItem(getShowKey());
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function setupShowEdit({ bandInput, venueInput, dateInput, colorRow, submitBtn, initialBg }) {
  // Color picker logic
  const colorOptions = [
    'blackband.png','brown.png','darkblue.png','darkgreen.png','grey.png','lightblue.png','lime.png','neonyellow.png','orange.png','pink.png','purple.png','red.png','redorange.png','yellow.png'
  ];
  let selectedBg = initialBg || 'blackband.png';
  const bgInput = document.createElement('input');
  bgInput.type = 'hidden';
  bgInput.id = 'bgImage';
  bgInput.value = selectedBg;
  bandInput.form.appendChild(bgInput);

  colorRow.innerHTML = '';
  colorOptions.forEach(filename => {
    const circle = document.createElement('div');
    circle.className = 'color-circle';
    circle.style.backgroundImage = `url('../assets/${filename}')`;
    circle.title = filename.replace('.png','');
    circle.addEventListener('click', () => {
      document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
      circle.classList.add('selected');
      selectedBg = filename;
      bgInput.value = filename;
    });
    if (filename === selectedBg) circle.classList.add('selected');
    colorRow.appendChild(circle);
  });

  // Load previous edits if present
  const prev = loadShowData();
  if (prev) {
    bandInput.value = prev.band;
    venueInput.value = prev.venue;
    dateInput.value = prev.date;
    selectedBg = prev.bgImage;
    bgInput.value = prev.bgImage;
    document.querySelectorAll('.color-circle').forEach(c => {
      if (c.title === prev.bgImage.replace('.png','')) c.classList.add('selected');
      else c.classList.remove('selected');
    });
  }

  submitBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const band = bandInput.value.trim();
    const venue = venueInput.value.trim();
    const date = dateInput.value.trim();
    const bgImage = bgInput.value;
    if (!band || !venue || !date) return;
    saveShowData({ band, venue, date, bgImage });
    window.location.href = '../index.html';
  });
}
