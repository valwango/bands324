window.addEventListener('DOMContentLoaded', function() {
  if (typeof setupCustomDatePicker === 'function') {
    setupCustomDatePicker('custom-date', 'custom-datepicker');
  }

  const colorOptions = [
    'blackband.png', 'brown.png', 'darkblue.png', 'darkgreen.png',
    'grey.png', 'lightblue.png', 'lime.png', 'neonyellow.png',
    'orange.png', 'pink.png', 'purple.png', 'red.png',
    'redorange.png', 'yellow.png'
  ];

  const fallbackColors = {
    'blackband.png': '#1d1d1d',
    'brown.png': '#5f3a27',
    'darkblue.png': '#153f8a',
    'darkgreen.png': '#1a5a35',
    'grey.png': '#5f6770',
    'lightblue.png': '#57a3db',
    'lime.png': '#88c93b',
    'neonyellow.png': '#d8ea1a',
    'orange.png': '#de7d2a',
    'pink.png': '#cf578e',
    'purple.png': '#6f4ab7',
    'red.png': '#b63232',
    'redorange.png': '#d35a29',
    'yellow.png': '#d2bf3e'
  };

  const form = document.getElementById('add-show-form');
  const bandInput = document.getElementById('band');
  const venueInput = document.getElementById('venue');
  const dateInput = document.getElementById('custom-date');
  const colorPickerRow = document.getElementById('color-picker-row');
  const bgInput = document.getElementById('bgImage');

  if (!form || !bandInput || !venueInput || !dateInput || !colorPickerRow || !bgInput) {
    return;
  }

  let selectedBg = bgInput.value || 'blackband.png';
  colorPickerRow.innerHTML = '';

  colorOptions.forEach(function(filename) {
    const circle = document.createElement('div');
    circle.className = 'color-circle';
    circle.style.backgroundColor = fallbackColors[filename] || '#555';
    circle.style.backgroundImage = "url('assets/" + filename + "')";
    circle.title = filename.replace('.png', '');

    circle.addEventListener('click', function() {
      document.querySelectorAll('.color-circle').forEach(function(c) {
        c.classList.remove('selected');
      });
      circle.classList.add('selected');
      selectedBg = filename;
      bgInput.value = filename;
    });

    if (filename === selectedBg) {
      circle.classList.add('selected');
    }

    colorPickerRow.appendChild(circle);
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const band = bandInput.value.trim();
    const venue = venueInput.value.trim();
    const date = dateInput.value.trim();
    const bgImage = bgInput.value || selectedBg || 'blackband.png';

    if (!band || !venue || !date) {
      return;
    }

    if (typeof db === 'undefined') {
      alert('Firebase is not initialized.');
      return;
    }

    db.collection('shows').add({
      band: band,
      venue: venue,
      date: date,
      bgImage: bgImage
    })
    .then(function(docRef) {
      window.location.href = 'show.html?id=' + docRef.id;
    })
    .catch(function(error) {
      alert('Failed to add show: ' + error.message);
    });
  });
});
