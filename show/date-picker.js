// Custom date picker logic for show pages (adapted from star.html)
function setupCustomDatePicker(inputId, pickerId) {
  const customDateInput = document.getElementById(inputId);
  const datepicker = document.getElementById(pickerId);
  let selectedDate = null;
  let currentMonth = null;
  let currentYear = null;

  function pad(n) { return n < 10 ? '0' + n : n; }
  function formatDateString(date) {
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const yy = String(date.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  function renderDatePicker(month, year, selected) {
    currentMonth = month;
    currentYear = year;
    const today = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let html = '';
    html += '<div class="custom-datepicker-header">';
    html += `<button class="custom-datepicker-arrow" id="prev-month" tabindex="-1">&#8592;</button>`;
    html += `<span class="custom-datepicker-month-year"><span class="custom-datepicker-month" id="custom-datepicker-month">${firstDay.toLocaleString('default', { month: 'long' })}</span> <span class="custom-datepicker-year" id="custom-datepicker-year">${year}</span></span>`;
    html += `<button class="custom-datepicker-arrow" id="next-month" tabindex="-1">&#8594;</button>`;
    html += '</div>';
    html += '<div class="custom-datepicker-grid">';
    for (let wd of weekdays) {
      html += `<div class="custom-datepicker-weekday">${wd}</div>`;
    }
    let day = 1;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < startDay) {
          html += '<div></div>';
        } else if (day > daysInMonth) {
          html += '<div></div>';
        } else {
          const thisDate = new Date(year, month, day);
          let classes = 'custom-datepicker-day';
          if (selected && thisDate.toDateString() === selected.toDateString()) classes += ' selected';
          if (thisDate.toDateString() === today.toDateString()) classes += ' today';
          html += `<div class="${classes}" data-date="${formatDateString(thisDate)}">${day}</div>`;
          day++;
        }
      }
    }
    html += '</div>';
    datepicker.innerHTML = html;
    // Month dropdown logic
    const monthSpan = document.getElementById('custom-datepicker-month');
    monthSpan.style.cursor = 'pointer';
    monthSpan.onclick = (e) => {
      e.stopPropagation();
      const existing = document.getElementById('custom-datepicker-month-dropdown');
      if (existing) existing.remove();
      const dropdownWrap = document.createElement('div');
      dropdownWrap.id = 'custom-datepicker-month-dropdown';
      dropdownWrap.style.position = 'absolute';
      dropdownWrap.style.left = monthSpan.getBoundingClientRect().left - datepicker.getBoundingClientRect().left + 'px';
      dropdownWrap.style.top = monthSpan.getBoundingClientRect().top - datepicker.getBoundingClientRect().top + 24 + 'px';
      dropdownWrap.style.zIndex = 200;
      dropdownWrap.style.background = '#444';
      dropdownWrap.style.border = '1px solid #888';
      dropdownWrap.style.borderRadius = '6px';
      dropdownWrap.style.boxShadow = '0 2px 12px rgba(0,0,0,0.25)';
      dropdownWrap.style.padding = '4px 0';
      dropdownWrap.style.fontFamily = 'JetBrains Mono, monospace';
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      for (let m = 0; m < 12; m++) {
        const item = document.createElement('div');
        item.textContent = months[m];
        item.style.padding = '6px 24px 6px 16px';
        item.style.cursor = 'pointer';
        item.style.color = m === month ? '#fff' : '#bbb';
        item.style.background = m === month ? '#666' : 'none';
        item.style.fontWeight = m === month ? 'bold' : 'normal';
        item.onmouseover = () => { item.style.background = '#555'; };
        item.onmouseout = () => { item.style.background = m === month ? '#666' : 'none'; };
        item.onclick = (ev) => {
          ev.stopPropagation();
          renderDatePicker(m, year, selectedDate);
          dropdownWrap.remove();
        };
        dropdownWrap.appendChild(item);
      }
      document.addEventListener('mousedown', function handler(ev) {
        if (!dropdownWrap.contains(ev.target)) {
          dropdownWrap.remove();
          document.removeEventListener('mousedown', handler);
        }
      });
      datepicker.appendChild(dropdownWrap);
    };
    // Year dropdown logic
    const yearSpan = document.getElementById('custom-datepicker-year');
    yearSpan.style.cursor = 'pointer';
    yearSpan.onclick = (e) => {
      e.stopPropagation();
      const existing = document.getElementById('custom-datepicker-year-dropdown');
      if (existing) existing.remove();
      const dropdownWrap = document.createElement('div');
      dropdownWrap.id = 'custom-datepicker-year-dropdown';
      dropdownWrap.style.position = 'absolute';
      dropdownWrap.style.left = yearSpan.getBoundingClientRect().left - datepicker.getBoundingClientRect().left + 'px';
      dropdownWrap.style.top = yearSpan.getBoundingClientRect().top - datepicker.getBoundingClientRect().top + 24 + 'px';
      dropdownWrap.style.zIndex = 200;
      dropdownWrap.style.background = '#444';
      dropdownWrap.style.border = '1px solid #888';
      dropdownWrap.style.borderRadius = '6px';
      dropdownWrap.style.boxShadow = '0 2px 12px rgba(0,0,0,0.25)';
      dropdownWrap.style.padding = '4px 0';
      dropdownWrap.style.fontFamily = 'JetBrains Mono, monospace';
      for (let y = year - 10; y <= year + 10; y++) {
        const item = document.createElement('div');
        item.textContent = y;
        item.style.padding = '6px 24px 6px 16px';
        item.style.cursor = 'pointer';
        item.style.color = y === year ? '#fff' : '#bbb';
        item.style.background = y === year ? '#666' : 'none';
        item.style.fontWeight = y === year ? 'bold' : 'normal';
        item.onmouseover = () => { item.style.background = '#555'; };
        item.onmouseout = () => { item.style.background = y === year ? '#666' : 'none'; };
        item.onclick = (ev) => {
          ev.stopPropagation();
          renderDatePicker(month, y, selectedDate);
          dropdownWrap.remove();
        };
        dropdownWrap.appendChild(item);
      }
      document.addEventListener('mousedown', function handler(ev) {
        if (!dropdownWrap.contains(ev.target)) {
          dropdownWrap.remove();
          document.removeEventListener('mousedown', handler);
        }
      });
      datepicker.appendChild(dropdownWrap);
    };
    // Month navigation
    document.getElementById('prev-month').onclick = (e) => {
      e.stopPropagation();
      let m = currentMonth - 1;
      let y = currentYear;
      if (m < 0) { m = 11; y--; }
      renderDatePicker(m, y, selectedDate);
    };
    document.getElementById('next-month').onclick = (e) => {
      e.stopPropagation();
      let m = currentMonth + 1;
      let y = currentYear;
      if (m > 11) { m = 0; y++; }
      renderDatePicker(m, y, selectedDate);
    };
    // Day selection
    for (let el of datepicker.querySelectorAll('.custom-datepicker-day')) {
      el.onclick = (e) => {
        e.stopPropagation();
        const val = el.getAttribute('data-date');
        selectedDate = new Date(val);
        customDateInput.value = val;
        datepicker.style.display = 'none';
      };
    }
  }

  customDateInput.addEventListener('focus', showPicker);
  customDateInput.addEventListener('click', showPicker);

  function showPicker(e) {
    if (document.activeElement === customDateInput) {
      e && e.stopPropagation();
      const today = new Date();
      let showDate = selectedDate || today;
      renderDatePicker(showDate.getMonth(), showDate.getFullYear(), selectedDate);
      datepicker.style.display = 'block';
    }
  }

  customDateInput.addEventListener('input', function() {
    const val = customDateInput.value;
    let match = val.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
    if (match) {
      let mm = parseInt(match[1], 10);
      let dd = parseInt(match[2], 10);
      let yy = match[3].length === 2 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10);
      const d = new Date(yy, mm - 1, dd);
      if (!isNaN(d.getTime())) {
        selectedDate = d;
        if (datepicker.style.display === 'block') {
          renderDatePicker(d.getMonth(), d.getFullYear(), selectedDate);
        }
      }
    }
  });

  customDateInput.addEventListener('blur', function() {
    let val = customDateInput.value;
    let match = val.match(/^(\d{0,2})\/?(\d{0,2})\/?(\d{0,4})$/);
    if (!match || match[0].length === 0) {
      customDateInput.value = '01/01/01';
      return;
    }
    let mm = match[1].padEnd(2, '1');
    let dd = match[2].padEnd(2, '1');
    let yy = match[3].padEnd(2, '1');
    if (yy.length === 4) yy = yy.slice(-2);
    customDateInput.value = `${mm}/${dd}/${yy}`;
  });

  document.addEventListener('mousedown', (e) => {
    if (!datepicker.contains(e.target) && e.target !== customDateInput) {
      datepicker.style.display = 'none';
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    if (!customDateInput.value) {
      customDateInput.placeholder = 'mm/dd/yy';
      selectedDate = null;
    } else {
      // If value is present, parse it
      let match = customDateInput.value.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
      if (match) {
        let mm = parseInt(match[1], 10);
        let dd = parseInt(match[2], 10);
        let yy = match[3].length === 2 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10);
        const d = new Date(yy, mm - 1, dd);
        if (!isNaN(d.getTime())) {
          selectedDate = d;
        }
      }
    }
  });

  function setTodayIfEmpty() {
    if (!customDateInput.value) {
      const today = new Date();
      selectedDate = today;
      customDateInput.value = formatDateString(today);
    }
  }
  let pickerInit = false;
  customDateInput.addEventListener('focus', function(e) {
    setTodayIfEmpty();
    if (!pickerInit) { showPicker(e); pickerInit = true; }
  });
  customDateInput.addEventListener('click', function(e) {
    setTodayIfEmpty();
    if (!pickerInit) { showPicker(e); pickerInit = true; }
  });
  document.addEventListener('mousedown', (e) => {
    if (!datepicker.contains(e.target) && e.target !== customDateInput) {
      datepicker.style.display = 'none';
      pickerInit = false;
    }
  });
}
