// pickers.js
// -------------------
// Color Picker + Date Picker
// -------------------

let selectedDate = null;

export function setSelectedDate(date) {
  selectedDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

const bgInput = document.getElementById('bgImage');

  // -------------------
  // Band Color Picker
  // -------------------
  const bandColorOptions = [
    'blackband.png','brown.png','darkblue.png','darkgreen.png','grey.png',
    'lightblue.png','lime.png','neonyellow.png','orange.png','pink.png',
    'purple.png','red.png','redorange.png','yellow.png'
  ];

  const bandColorRow = document.getElementById('color-picker-row');
  if (bandColorRow) {
    let selectedBandBg = 'blackband.png';
    bandColorOptions.forEach(filename => {
      const circle = document.createElement('div');
      circle.className = 'color-circle';
      circle.style.backgroundImage = `url('assets/${filename}')`;
      circle.title = filename.replace('.png','');
      circle.addEventListener('click', () => {
        bandColorRow.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
        circle.classList.add('selected');
        selectedBandBg = filename;
        if(bgInput) {
          bgInput.value = filename;
          bgInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      if (filename === selectedBandBg) circle.classList.add('selected');
      bandColorRow.appendChild(circle);
    });
  }

  // -------------------
  // Festival Color Picker
  // -------------------
  const festivalColorOptions = [
    'blacklong.png','whitelong.png','darkbluelong.png','darkgreenlong.png',
    'bluelong.png','greenlong.png','yellowlong.png','orangelong.png','pinklong.png',
    'purplelong.png','redlong.png'
  ];

  const festivalColorRow = document.getElementById('color-picker-fest');
  if (festivalColorRow) {
    let selectedFestivalBg = 'blacklong.png';
    festivalColorOptions.forEach(filename => {
      const circle = document.createElement('div');
      circle.className = 'color-circle';
      circle.style.backgroundImage = `url('assets/${filename}')`;
      circle.title = filename.replace('.png','');
      circle.addEventListener('click', () => {
        festivalColorRow.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
        circle.classList.add('selected');
        selectedFestivalBg = filename;
        if(bgInput) {
          bgInput.value = filename;
          bgInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      if (filename === selectedFestivalBg) circle.classList.add('selected');
      festivalColorRow.appendChild(circle);
    });
  }

  // -------------------
  // Custom Date Picker
  // -------------------
  const customDateInput = document.getElementById('custom-date');
  const datepicker = document.getElementById('custom-datepicker');
  let currentMonth = null;
  let currentYear = null;

  function pad(n){return n<10?'0'+n:n;}
  function formatDateString(date){
    const mm = pad(date.getMonth()+1);
    const dd = pad(date.getDate());
    const yy = String(date.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  function renderYearPicker(centreYear) {
    const maxYear = new Date().getFullYear() + 3;
    const rowH = 36;
    const padCount = 3;

    const overlay = document.createElement('div');
    overlay.className = 'custom-datepicker-year-overlay';
    overlay.addEventListener('click', e => e.stopPropagation());
    overlay.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });

    const wrap = document.createElement('div');
    wrap.className = 'custom-datepicker-year-drum-wrap';

    const drum = document.createElement('div');
    drum.className = 'custom-datepicker-year-drum';

    for (let i = 0; i < padCount; i++) {
      const pad = document.createElement('div');
      pad.className = 'custom-datepicker-year-drum-cell';
      drum.appendChild(pad);
    }
    for (let y = 1900; y <= maxYear; y++) {
      const cell = document.createElement('div');
      cell.className = 'custom-datepicker-year-drum-cell';
      cell.textContent = y;
      cell.dataset.year = y;
      drum.appendChild(cell);
    }
    for (let i = 0; i < padCount; i++) {
      const pad = document.createElement('div');
      pad.className = 'custom-datepicker-year-drum-cell';
      drum.appendChild(pad);
    }

    const highlight = document.createElement('div');
    highlight.className = 'custom-datepicker-year-highlight';

    wrap.appendChild(drum);
    wrap.appendChild(highlight);
    overlay.appendChild(wrap);

    datepicker.appendChild(overlay);

    // Scroll to centreYear
    drum.scrollTop = (centreYear - 1900) * rowH;

    const getSelectedYear = () => 1900 + Math.round(drum.scrollTop / rowH);

    const updateActive = () => {
      const y = getSelectedYear();
      drum.querySelectorAll('.custom-datepicker-year-drum-cell[data-year]').forEach(c => {
        c.classList.toggle('custom-datepicker-year-drum-cell--active', parseInt(c.dataset.year) === y);
      });
    };
    drum.addEventListener('scroll', updateActive);
    updateActive();

    drum.addEventListener('click', e => {
      const cell = e.target.closest('.custom-datepicker-year-drum-cell[data-year]');
      if (!cell) return;
      const y = parseInt(cell.dataset.year);
      if (cell.classList.contains('custom-datepicker-year-drum-cell--active')) {
        overlay.remove();
        renderDatePicker(currentMonth, y, selectedDate);
      } else {
        drum.scrollTo({ top: (y - 1900) * rowH, behavior: 'smooth' });
      }
    });

    drum.addEventListener('touchend', e => e.stopPropagation(), { passive: true });
  }

  function renderMonthPicker(year) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let html = '';
    html += '<div class="custom-datepicker-header">';
    html += `<button class="custom-datepicker-arrow" id="prev-year-m" tabindex="-1">&#8592;</button>`;
    html += `<span class="custom-datepicker-month-year" id="month-picker-year" style="cursor:pointer">${year}</span>`;
    html += `<button class="custom-datepicker-arrow" id="next-year-m" tabindex="-1">&#8594;</button>`;
    html += '</div>';
    html += '<div class="custom-datepicker-month-grid">';
    months.forEach((m, i) => {
      const isCurrent = i === currentMonth && year === currentYear;
      html += `<div class="custom-datepicker-month-cell${isCurrent ? ' selected' : ''}" data-month="${i}">${m}</div>`;
    });
    html += '</div>';
    if (datepicker) datepicker.innerHTML = html;

    const bindNav = (id, delta) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const go = () => renderMonthPicker(year + delta);
      btn.addEventListener('click', e => { e.stopPropagation(); go(); });
      btn.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); go(); }, { passive: false });
    };
    bindNav('prev-year-m', -1);
    bindNav('next-year-m', 1);

    const yearLabel = document.getElementById('month-picker-year');
    if (yearLabel) {
      const openYears = e => { e.stopPropagation(); renderYearPicker(year); };
      yearLabel.addEventListener('click', openYears);
      yearLabel.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); renderYearPicker(year); }, { passive: false });
    }

    datepicker.querySelectorAll('.custom-datepicker-month-cell').forEach(el => {
      const pick = e => {
        e.stopPropagation();
        renderDatePicker(parseInt(el.getAttribute('data-month')), year, selectedDate);
      };
      el.addEventListener('click', pick);
      el.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); pick(e); }, { passive: false });
    });
  }

  function renderDatePicker(month, year, selected){
    currentMonth = month;
    currentYear = year;
    const today = new Date();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month+1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const weekdays = ['S','M','T','W','T','F','S'];

    let html = '';
    html += '<div class="custom-datepicker-header">';
    html += `<button class="custom-datepicker-arrow" id="prev-month" tabindex="-1">&#8592;</button>`;
    html += `<span class="custom-datepicker-month-year"><span class="custom-datepicker-month" id="custom-datepicker-month" style="cursor:pointer">${firstDay.toLocaleString('default',{month:'long'})}</span> <span class="custom-datepicker-year" id="custom-datepicker-year" style="cursor:pointer">${year}</span></span>`;
    html += `<button class="custom-datepicker-arrow" id="next-month" tabindex="-1">&#8594;</button>`;
    html += '</div>';
    html += '<div class="custom-datepicker-grid">';
    weekdays.forEach(wd=>html+=`<div class="custom-datepicker-weekday">${wd}</div>`);

    let day=1;
    for(let i=0;i<6;i++){
      for(let j=0;j<7;j++){
        if(i===0 && j<startDay) html+='<div></div>';
        else if(day>daysInMonth) html+='<div></div>';
        else{
          const thisDate=new Date(year,month,day);
          let classes='custom-datepicker-day';
          if(selected && thisDate.toDateString()===selected.toDateString()) classes+=' selected';
          if(thisDate.toDateString()===today.toDateString()) classes+=' today';
          html+=`<div class="${classes}" data-date="${formatDateString(thisDate)}">${day}</div>`;
          day++;
        }
      }
    }
    html+='</div>';
    if(datepicker) datepicker.innerHTML=html;

    // Month navigation
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const prevMonth = () => {
      let m=currentMonth-1; let y=currentYear;
      if(m<0){m=11;y--;}
      renderDatePicker(m,y,selectedDate);
    };
    const nextMonth = () => {
      let m=currentMonth+1; let y=currentYear;
      if(m>11){m=0;y++;}
      renderDatePicker(m,y,selectedDate);
    };
    if(prevBtn){
      prevBtn.addEventListener('click', e => { e.stopPropagation(); prevMonth(); });
      prevBtn.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); prevMonth(); }, { passive: false });
    }
    if(nextBtn){
      nextBtn.addEventListener('click', e => { e.stopPropagation(); nextMonth(); });
      nextBtn.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); nextMonth(); }, { passive: false });
    }

    // Month/year label drilldown
    const monthLabel = document.getElementById('custom-datepicker-month');
    const yearLabel = document.getElementById('custom-datepicker-year');
    if (monthLabel) {
      const openMonths = e => { e.stopPropagation(); renderMonthPicker(currentYear); };
      monthLabel.addEventListener('click', openMonths);
      monthLabel.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); renderMonthPicker(currentYear); }, { passive: false });
    }
    if (yearLabel) {
      const openYears = e => { e.stopPropagation(); renderYearPicker(currentYear); };
      yearLabel.addEventListener('click', openYears);
      yearLabel.addEventListener('touchend', e => { e.stopPropagation(); e.preventDefault(); renderYearPicker(currentYear); }, { passive: false });
    }

    // Day selection
    if(datepicker) {
      datepicker.querySelectorAll('.custom-datepicker-day').forEach(el=>{
        const selectDay = e => {
          e.stopPropagation();
          selectedDate = new Date(el.getAttribute('data-date'));
          if(customDateInput) {
            customDateInput.value = el.getAttribute('data-date');
            customDateInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          datepicker.style.display='none';
        };
        el.addEventListener('click', selectDay);
        el.addEventListener('touchend', selectDay, { passive: false });
      });
    }
  }

  function showPicker(e){
    e&&e.stopPropagation();
    if(!customDateInput) return;
    const today=new Date();
    let showDate=selectedDate||today;
    renderDatePicker(showDate.getMonth(), showDate.getFullYear(), selectedDate);
    if(datepicker) datepicker.style.display='block';
  }

  if(customDateInput){
    customDateInput.addEventListener('focus', showPicker);
    customDateInput.addEventListener('click', showPicker);
    customDateInput.setAttribute('readonly', 'readonly');
  }

  function outsideClose(e){
    if(datepicker && !datepicker.contains(e.target) && e.target!==customDateInput){
      datepicker.style.display='none';
    }
  }

document.addEventListener('mousedown', outsideClose);
document.addEventListener('touchstart', outsideClose, { passive: true });
