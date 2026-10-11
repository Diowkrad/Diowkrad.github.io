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

let kbOn=true;
document.getElementById('kbToggle').addEventListener('click',()=>{
  kbOn=!kbOn;
  document.getElementById('kbToggle').classList.toggle('on',kbOn);
  document.getElementById('kbToggle').textContent='КЛАВИАТУРА: '+(kbOn?'ВКЛ':'ВЫКЛ');
  if(!kbOn){
    for(const [code,n] of heldKeys){ susCancel(n); hl(n,false); hardOff(n); }
    heldKeys.clear(); noteOwner.clear();
    log('Клавиатура ПК выключена — мышь и MIDI работают.');
  } else log('Клавиатура ПК включена.');
});
function setLayout(m){
  layout2=m;
  document.getElementById('lay2').classList.toggle('on',!!m);
  document.getElementById('lay1').classList.toggle('on',!m);
  for(const [,n] of heldKeys){ susCancel(n); hardOff(n); }
  heldKeys.clear(); noteOwner.clear();
  log(m?"Раскладка: 2 ряда — нижний C4…F5 (/=E5), верхний C5…F#6 (Q=C5, I=C6).":"Раскладка: 1 ряд — хроматика C4…F#5.");
}
$('#lay2').addEventListener('click',()=>setLayout(true));
$('#lay1').addEventListener('click',()=>setLayout(false));
document.addEventListener('keydown',e=>{
  if(e.repeat) return;
  if(e.key==='ArrowLeft'){ pcBase=Math.max(PC_MIN(),pcBase-12);
    lcd('PC-клавиатура: октава от ноты '+pcBase); return; }
  if(e.key==='ArrowRight'){ pcBase=Math.min(PC_MAX(),pcBase+12);
    lcd('PC-клавиатура: октава от ноты '+pcBase); return; }
  if(e.code==='Numpad7'){ setSusMode('1/8'); e.preventDefault(); return; }
  if(e.code==='Numpad8'){ setSusMode('1/4'); e.preventDefault(); return; }
  if(e.code==='Numpad9'){ setSusMode('1/2'); e.preventDefault(); return; }
  if(!kbOn) return;
  if(heldKeys.has(e.code)) return;
  const n=codeToNote(e);
  if(n>=0){ heldKeys.set(e.code,n); ensureAudio(); noteOwner.set(n,e.code); noteOn(n,100); }
});

document.addEventListener('keyup',e=>{
  if(!heldKeys.has(e.code)) return;
  const n=heldKeys.get(e.code);
  heldKeys.delete(e.code);
  if(noteOwner.get(n)===e.code){ noteOwner.delete(n); noteOff(n); }
  /* отпускание клавиши-невладельца: ноту держит другая — жест пустой */
});

window.addEventListener('blur',()=>{
  for(const m of [keyEls1,keyEls2]) for(const k of m.values()) k.classList.remove('act');
  for(const [,n] of heldKeys){ susCancel(n); hardOff(n); }
  heldKeys.clear(); noteOwner.clear();
});
