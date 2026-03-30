// star.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// -------------------
// Color Picker
// -------------------
const colorOptions = [
  'blackband.png','brown.png','darkblue.png','darkgreen.png','grey.png',
  'lightblue.png','lime.png','neonyellow.png','orange.png','pink.png',
  'purple.png','red.png','redorange.png','yellow.png'
];

const colorRow = document.getElementById('color-picker-row');
const bgInput = document.getElementById('bgImage');
let selectedBg = 'blackband.png';

colorOptions.forEach(filename => {
  const circle = document.createElement('div');
  circle.className = 'color-circle';
  circle.style.backgroundImage = `url('assets/${filename}')`;
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

// -------------------
// Custom Date Picker
// -------------------
const customDateInput = document.getElementById('custom-date');
const datepicker = document.getElementById('custom-datepicker');
let selectedDate = null;
let currentMonth = null;
let currentYear = null;

function pad(n){return n<10?'0'+n:n;}
function formatDateString(date){
  const mm = pad(date.getMonth()+1);
  const dd = pad(date.getDate());
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

// Full renderDatePicker function (keeps your previous logic)
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
  datepicker.innerHTML=html;

  // Month navigation
  document.getElementById('prev-month').onclick=e=>{
    e.stopPropagation();
    let m=currentMonth-1; let y=currentYear;
    if(m<0){m=11;y--;}
    renderDatePicker(m,y,selectedDate);
  };
  document.getElementById('next-month').onclick=e=>{
    e.stopPropagation();
    let m=currentMonth+1; let y=currentYear;
    if(m>11){m=0;y++;}
    renderDatePicker(m,y,selectedDate);
  };

  // Day selection
  datepicker.querySelectorAll('.custom-datepicker-day').forEach(el=>{
    el.onclick=e=>{
      e.stopPropagation();
      selectedDate = new Date(el.getAttribute('data-date'));
      customDateInput.value = el.getAttribute('data-date');
      datepicker.style.display='none';
    };
  });

  // (Optional) month/year dropdowns can be kept here if desired
}

// Show picker on focus/click
function showPicker(e){
  e&&e.stopPropagation();
  const today=new Date();
  let showDate=selectedDate||today;
  renderDatePicker(showDate.getMonth(), showDate.getFullYear(), selectedDate);
  datepicker.style.display='block';
}
customDateInput.addEventListener('focus', showPicker);
customDateInput.addEventListener('click', showPicker);
document.addEventListener('mousedown', e=>{
  if(!datepicker.contains(e.target) && e.target!==customDateInput){
    datepicker.style.display='none';
  }
});

// -------------------
// Optional Diary + Firestore Form Submission
// -------------------
const form = document.getElementById('add-show-form');
const diaryInput = document.getElementById('diary'); // <textarea id="diary">

onAuthStateChanged(auth, user=>{
  if(!user){
    alert('Please log in to add a show.');
    form.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);
    return;
  }

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const band = document.getElementById('band').value.trim();
    const venue = document.getElementById('venue').value.trim();
    const date = customDateInput.value.trim();
    const diary = diaryInput.value.trim();

    if(!band || !venue || !date) return;

    try{
      const userShowsRef = collection(db, 'users', user.uid, 'shows');
      const showData = {
        band,
        venue,
        date,
        bgImage: bgInput.value || 'blackband.png',
        createdAt: new Date()
      };
      if(diary) showData.diary = diary;

      await addDoc(userShowsRef, showData);
      window.location.href='index.html';
    } catch(err){
      console.error('Error saving show:', err);
      alert('Failed to save show. Please try again.');
    }
  });
});