// pickers.js
// -------------------
// Color Picker + Date Picker
// -------------------

let selectedDate = null;

export function setSelectedDate(date) {
  selectedDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

document.addEventListener('DOMContentLoaded', () => {

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
        if(bgInput) bgInput.value = filename;
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
        if(bgInput) bgInput.value = filename;
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
    html += `<span class="custom-datepicker-month-year"><span class="custom-datepicker-month" id="custom-datepicker-month">${firstDay.toLocaleString('default',{month:'long'})}</span> <span class="custom-datepicker-year" id="custom-datepicker-year">${year}</span></span>`;
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
    if(prevBtn) prevBtn.onclick=e=>{
      e.stopPropagation();
      let m=currentMonth-1; let y=currentYear;
      if(m<0){m=11;y--;}
      renderDatePicker(m,y,selectedDate);
    };
    if(nextBtn) nextBtn.onclick=e=>{
      e.stopPropagation();
      let m=currentMonth+1; let y=currentYear;
      if(m>11){m=0;y++;}
      renderDatePicker(m,y,selectedDate);
    };

    // Day selection
    if(datepicker) {
      datepicker.querySelectorAll('.custom-datepicker-day').forEach(el=>{
        el.onclick=e=>{
          e.stopPropagation();
          selectedDate = new Date(el.getAttribute('data-date'));
          if(customDateInput) customDateInput.value = el.getAttribute('data-date');
          datepicker.style.display='none';
        };
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
  }

  document.addEventListener('mousedown', e=>{
    if(datepicker && !datepicker.contains(e.target) && e.target!==customDateInput){
      datepicker.style.display='none';
    }
  });

}); // DOMContentLoaded
