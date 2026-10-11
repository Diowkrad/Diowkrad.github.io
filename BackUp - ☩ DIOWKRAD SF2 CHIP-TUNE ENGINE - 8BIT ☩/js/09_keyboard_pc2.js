/* ============================================================
   ФАЙЛ 09/13: 09_keyboard_pc.js
   Секция: клавиатура ПК
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ клавиатура ПК ============ */
/* раскладки ПК: 2 ряда — сплошной зигзаг C3..B5, 1 ряд — хроматика C4..F#5 */
const LO2=['KeyZ','KeyS','KeyX','KeyD','KeyC','KeyV','KeyG','KeyB','KeyH','KeyN','KeyJ','KeyM','Comma','KeyL','Period','Semicolon','Slash','Quote'];
const HI2=['KeyQ','Digit2','KeyW','Digit3','KeyE','KeyR','Digit5','KeyT','Digit6','KeyY','Digit7','KeyU','KeyI','Digit9','KeyO','Digit0','KeyP','BracketLeft','BracketRight'];
const ONE=['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK','KeyO','KeyL','KeyP','Semicolon','Quote','BracketRight'];
let pcBase=60, layout2=true;

const heldKeys=new Map(); // код клавиши -> номер ноты на момент нажатия
const noteOwner=new Map(); // нота -> владелец (код клавиши или '@ext' для мыши/MIDI)

function codeToNote(e){
  const c=e.code;
  if(!layout2){ const i=ONE.indexOf(c); return i>=0?pcBase+i:-1; }
  const l=LO2.indexOf(c);
  if(l>=0) return pcBase+l;
  const h=HI2.indexOf(c);
  if(h>=0) return pcBase+12+h;
  return -1;
}

let kbOn = true;

// Переносим всю привязку к UI-элементам в блок ожидания загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById('kbToggle');
  const btnLay2 = document.getElementById('lay2');
  const btnLay1 = document.getElementById('lay1');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      kbOn = !kbOn;
      // Используем сохраненную ссылку на элемент, чтобы избежать повторного поиска
      toggleBtn.classList.toggle('on', kbOn);
      toggleBtn.textContent = 'КЛАВИАТУРА: ' + (kbOn ? 'ВКЛ' : 'ВЫКЛ');
      
      if (!kbOn) {
        for (const [code, n] of heldKeys) { 
          if (typeof susCancel === 'function') susCancel(n); 
          if (typeof hl === 'function') hl(n, false); 
          if (typeof hardOff === 'function') hardOff(n); 
        }
        heldKeys.clear(); 
        noteOwner.clear();
        log('Клавиатура ПК выключена — мышь и MIDI работают.');
      } else {
        log('Клавиатура ПК включена.');
      }
    });
  } else {
    console.warn("Предупреждение Движка: Элемент 'kbToggle' не найден в DOM. Переведено в авто-режим.");
  }

  if (btnLay2) btnLay2.addEventListener('click', () => setLayout(true));
  if (btnLay1) btnLay1.addEventListener('click', () => setLayout(false));
});

// Безопасное переключение раскладок
function setLayout(m) {
  layout2 = m;
  const btnLay2 = document.getElementById('lay2');
  const btnLay1 = document.getElementById('lay1');
  
  if (btnLay2) btnLay2.classList.toggle('on', !!m);
  if (btnLay1) btnLay1.classList.toggle('on', !m);
  
  for (const [, n] of heldKeys) { 
    if (typeof susCancel === 'function') susCancel(n); 
    if (typeof hardOff === 'function') hardOff(n); 
  }
  heldKeys.clear(); 
  noteOwner.clear();
  log(m ? "Раскладка: 2 ряда — нижний C4…F5, верхний C5…F#6." : "Раскладка: 1 ряд — хроматика C4…F#5.");
}
function setLayout(m){
  layout2=m;
  document.getElementById('lay2').classList.toggle('on',!!m);
  document.getElementById('lay1').classList.toggle('on',!m);
  for(const [,n] of heldKeys){ susCancel(n); hardOff(n); }
  heldKeys.clear(); noteOwner.clear();
  log(m?"Раскладка: 2 ряда — нижний C4…F5 (/=E5), верхний C5…F#6 (Q=C5, I=C6).":"Раскладка: 1 ряд — хроматика C4…F#5.");
}
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. Безопасная привязка переключателя клавиатуры
  const toggleBtn = document.getElementById('kbToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      kbOn = !kbOn;
      toggleBtn.classList.toggle('on', kbOn);
      toggleBtn.textContent = 'КЛАВИАТУРА: ' + (kbOn ? 'ВКЛ' : 'ВЫКЛ');
      if (!kbOn) {
        for (const [code, n] of heldKeys) { 
          if (typeof susCancel === 'function') susCancel(n); 
          if (typeof hl === 'function') hl(n, false); 
          if (typeof hardOff === 'function') hardOff(n); 
        }
        heldKeys.clear(); noteOwner.clear();
        log('Клавиатура ПК выключена — мышь и MIDI работают.');
      } else log('Клавиатура ПК включена.');
    });
  }

  // 2. ИСПРАВЛЕНИЕ БАГА: Безопасная привязка раскладки 2 ряда
  const btnLay2 = document.getElementById('lay2');
  if (btnLay2) {
    btnLay2.addEventListener('click', () => setLayout(true));
  }

  // 3. ИСПРАВЛЕНИЕ БАГА: Безопасная привязка раскладки 1 ряд
  const btnLay1 = document.getElementById('lay1');
  if (btnLay1) {
    btnLay1.addEventListener('click', () => setLayout(false));
  }

});

// Сама функция переключения раскладок (вынесена наружу, чтобы быть доступной везде)
function setLayout(m) {
  layout2 = m;
  const btnLay2 = document.getElementById('lay2');
  const btnLay1 = document.getElementById('lay1');
  
  if (btnLay2) btnLay2.classList.toggle('on', !!m);
  if (btnLay1) btnLay1.classList.toggle('on', !m);
  
  for (const [, n] of heldKeys) { 
    if (typeof susCancel === 'function') susCancel(n); 
    if (typeof hardOff === 'function') hardOff(n); 
  }
  heldKeys.clear(); 
  noteOwner.clear();
  log(m ? "Раскладка: 2 ряда — нижний C4…F5, верхний C5…F#6." : "Раскладка: 1 ряд — хроматика C4…F#5.");
}
// Безопасный и принудительный обработчик нажатия клавиш ПК
document.addEventListener('keydown', e => {
  // Игнорируем авто-повторы при зажатии клавиши
  if (e.repeat) return;
  
  // Управление октавами через стрелки
  if (e.key === 'ArrowLeft') { 
    pcBase = Math.max(PC_MIN(), pcBase - 12);
    if (typeof lcd === 'function') lcd('PC-клавиатура: октава от ноты ' + pcBase); 
    if (typeof centerOnBase === 'function') centerOnBase();
    return; 
  }
  if (e.key === 'ArrowRight') { 
    pcBase = Math.min(PC_MAX(), pcBase + 12);
    if (typeof lcd === 'function') lcd('PC-клавиатура: октава от ноты ' + pcBase); 
    if (typeof centerOnBase === 'function') centerOnBase();
    return; 
  }
  
  // Управление сустейном через Numpad
  if (e.code === 'Numpad7') { setSusMode('1/8'); e.preventDefault(); return; }
  if (e.code === 'Numpad8') { setSusMode('1/4'); e.preventDefault(); return; }
  if (e.code === 'Numpad9') { setSusMode('1/2'); e.preventDefault(); return; }
  if(e.key==='ArrowLeft'){ pcBase=Math.max(PC_MIN(),pcBase-12);
  lcd('PC-клавиатура: октава от ноты '+pcBase); return; }
  
  // Проверка глобального включения клавиатуры (принудительно страхуем от багов UI)
  if (typeof kbOn !== 'undefined' && !kbOn) return;
  if (heldKeys.has(e.code)) return;
  
  const n = codeToNote(e);
  // Проверяем, что нота попадает в разрешенный спецификацией диапазон 24-78
  if (n >= PC_MIN() && n <= PC_MAX()) { 
    heldKeys.set(e.code, n); 
    ensureAudio(); // Активируем аудио-контекст
    noteOwner.set(n, e.code); 
    noteOn(n, 100); // Запускаем звук
  } else if (n >= 0) {
    log('Нота ПК ' + n + ' вне диапазона спецификации (24-78)');
  }
});

document.addEventListener('keyup', e => {
  if (!heldKeys.has(e.code)) return;
  const n = heldKeys.get(e.code);
  heldKeys.delete(e.code);
  if (noteOwner.get(n) === e.code) { 
    noteOwner.delete(n); 
    noteOff(n); 
  }
});

window.addEventListener('blur',()=>{
  for(const m of [keyEls1,keyEls2]) for(const k of m.values()) k.classList.remove('act');
  for(const [,n] of heldKeys){ susCancel(n); hardOff(n); }
  heldKeys.clear(); noteOwner.clear();
});
