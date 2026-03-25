// Shared logic for editing a show and updating localStorage for index.html


// Get show ID from URL (?id=SHOW_ID)
function getShowIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
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

  // Load show data from Firestore
  const showId = getShowIdFromUrl();
  if (showId) {
    db.collection('shows').doc(showId).get()
      .then(doc => {
        if (doc.exists) {
          const data = doc.data();
          bandInput.value = data.band || '';
          venueInput.value = data.venue || '';
          dateInput.value = data.date || '';
          selectedBg = data.bgImage || 'blackband.png';
          bgInput.value = selectedBg;
          document.querySelectorAll('.color-circle').forEach(c => {
            if (c.title === selectedBg.replace('.png','')) c.classList.add('selected');
            else c.classList.remove('selected');
          });
        } else {
          alert('Show not found.');
        }
      })
      .catch(err => {
        alert('Error loading show: ' + err.message);
      });
  }

  submitBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const band = bandInput.value.trim();
    const venue = venueInput.value.trim();
    const date = dateInput.value.trim();
    const bgImage = bgInput.value;
    if (!band || !venue || !date) return;
    if (!showId) {
      alert('Show ID not found in URL.');
      return;
    }
    db.collection('shows').doc(showId).update({
      band,
      venue,
      date,
      bgImage
    })
    .then(() => {
      window.location.href = '../index.html';
    })
    .catch((error) => {
      alert('Failed to update show: ' + error.message);
    });
  });
}
