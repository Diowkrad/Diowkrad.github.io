/* ============================================================
   ФАЙЛ 08/13: 08_keyboard_mouse.js
   Секция: клавиатура (мышь)
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ клавиатура (мышь) ============ */
const KB_LO=24, KB_HI=108; /* C1..C8 — полная октавность (режим 2) */

let kbMode=2; /* 2 — две клавиатуры C1..C8; 1 — одна клавиатура, вид v1.0.25 */
const keyEls1=new Map(), keyEls2=new Map();
const isBlackM=m=>[1,3,6,8,10].includes(m);
const NOTE_L=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
/* граница октавы Пполный ролл: 24..78 (до C8) в обоих режимах */
const PC_MIN=()=>24;
const PC_MAX=()=>108;
function buildKeys(){
  const roles=[[document.getElementById('keys'),keyEls1],[document.getElementById('keys2'),keyEls2]];
  for(const [box,els] of roles){
    if(!box) continue;
    els.clear(); box.innerHTML='';
    
    // Принудительно ставим блоку относительное позиционирование для абсолютных координат клавиш
    box.style.position = 'relative';
    
    let wCount = 0;
    // Шаг 1: Считаем, сколько белых клавиш попадет в наш диапазон, чтобы задать точную ширину контейнера
    for (let k = KB_LO; k <= KB_HI; k++) {
      if (!isBlackM(k % 12)) wCount++;
    }
    // Белая клавиша = 58px. Задаем динамическую ширину контейнера под диапазон 24-78
    box.style.width = (wCount * 58) + 'px'; 
    box.style.height = '164px';

    let wIdx = 0;
    // Шаг 2: Отрисовка БЕЛЫХ клавиш с четким позиционированием по горизонтали
    for(let k = KB_LO; k <= KB_HI; k++){
      const m = k % 12;
      if(!isBlackM(m)){
        const d = document.createElement('div');
        d.className = 'wk'; 
        d.dataset.key = k;
        // ИСПРАВЛЕНИЕ: Каждой белой клавише задаем жесткую позицию слева
        d.style.position = 'absolute';
        d.style.left = (wIdx * 58) + 'px';
        d.style.top = '0px';
        
        d.innerHTML = '<span class="lbl">' + NOTE_L[m] + (Math.floor(k / 12) - 1) + '</span>';
        box.appendChild(d); 
        els.set(k, d);
        wIdx++; // Смещаем индекс для следующей белой клавиши
      }
    }

    wIdx = 0;
    // Шаг 3: Отрисовка ЧЁРНЫХ клавиш поверх белых
    for(let k = KB_LO; k <= KB_HI; k++){
      const m = k % 12;
      if(isBlackM(m)){
        const d = document.createElement('div');
        d.className = 'bk'; 
        d.dataset.key = k;
        // Единый размер: белые 58x152, чёрные 36x94 — центровка на границе белых
        d.style.position = 'absolute';
        d.style.width = '36px'; 
        d.style.height = '94px';
        // Позиционируем черную клавишу строго между двумя белыми
        d.style.left = (wIdx * 58 - 18) + 'px';
        d.style.top = '0px';
        
        box.appendChild(d); 
        els.set(k, d);
      } else {
        wIdx++; // Чёрная клавиша ориентируется на индекс предыдущей белой
      }
    }
  }
  centerOnBase();
}
function hl(k,on){
  const e1=keyEls1.get(k), e2=keyEls2.get(k);
  if(e1) e1.classList.toggle('act',on);
  if(e2) e2.classList.toggle('act',on);
  updVoices();
}
/* pointer-механика: усыновление владельца, ТУШЕ-кривая, снятие на up/cancel — навешивается один раз */
function attachKb(box){
  if(!box) return;
  box.addEventListener('pointerdown',e=>{
    const el=e.target.closest('.wk,.bk'); if(!el) return;
    const r=el.getBoundingClientRect();
    const relY=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
    const vel=applySens(relY);
    ensureAudio(); noteOwner.set(+el.dataset.key,'@ext'); noteOn(+el.dataset.key,vel);
    try{el.setPointerCapture(e.pointerId);}catch(_){}
  });
  const up=e=>{
    const el=e.target.closest('.wk,.bk'); if(!el) return;
    const _k=+el.dataset.key; if(noteOwner.get(_k)==='@ext'){ noteOwner.delete(_k); noteOff(_k); }
  };
  box.addEventListener('pointerup',up);
  box.addEventListener('pointercancel',up);
}
attachKb(document.getElementById('keys'));
attachKb(document.getElementById('keys2'));
/* ленты скролла: независимые — каждая ведёт только свою клавиатуру */
const tapeSyncs=[];
function tapeSetup(strip,wrap){
  if(!strip||!wrap) return;
  const thumb=strip.querySelector('.tape-thumb');
  if(!thumb) return;
  const sync=()=>{
    const maxS=wrap.scrollWidth-wrap.clientWidth;
    const vis=maxS>0?wrap.clientWidth/wrap.scrollWidth:1;
    const w=Math.max(24,Math.round(strip.clientWidth*vis));
    thumb.style.width=w+'px';
    thumb.style.left=(maxS>0?(wrap.scrollLeft/maxS)*(strip.clientWidth-w):0)+'px';
  };
  tapeSyncs.push(sync);
  let drag=false,dragX=0,dragL=0;
  thumb.addEventListener('pointerdown',e=>{
    drag=true; dragX=e.clientX; dragL=wrap.scrollLeft;
    try{thumb.setPointerCapture(e.pointerId);}catch(_){}
    e.preventDefault();
  });
  thumb.addEventListener('pointermove',e=>{
    if(!drag) return;
    const maxS=wrap.scrollWidth-wrap.clientWidth; if(maxS<=0) return;
    const track=Math.max(1,strip.clientWidth-thumb.offsetWidth);
    wrap.scrollLeft=Math.min(maxS,Math.max(0,dragL+(e.clientX-dragX)*(maxS/track)));
  });
  const end=()=>{ drag=false; };
  thumb.addEventListener('pointerup',end);
  thumb.addEventListener('pointercancel',end);
  strip.addEventListener('pointerdown',e=>{
    if(e.target===thumb) return;
    const r=strip.getBoundingClientRect();
    const maxS=wrap.scrollWidth-wrap.clientWidth; if(maxS<=0) return;
    const x=e.clientX-r.left;
    wrap.scrollLeft=Math.min(maxS,Math.max(0,(x-thumb.offsetWidth/2)*(maxS/Math.max(1,strip.clientWidth-thumb.offsetWidth))));
    sync();
  });
  wrap.addEventListener('scroll',sync);
  wrap.addEventListener('wheel',e=>{
    if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){
      wrap.scrollLeft+=e.deltaY;
      if(wrap.scrollWidth>wrap.clientWidth) e.preventDefault();
    }
  },{passive:false});
  window.addEventListener('resize',sync);
  sync();
}
tapeSetup(document.getElementById('strip1'),document.getElementById('wrap1'));
tapeSetup(document.getElementById('strip2'),document.getElementById('wrap2'));
/* ===== ЗАМОК РОЛЛА v1.0.37: блокирует все три канала горизонтального скролла
   (бегунок, колесо, нативный скролл); позиция ролла сохраняется ===== */
let rollLocked=false;
function rollLockApply(){
  const btn=document.getElementById('rollLock');
  if(btn){ btn.textContent=rollLocked?'СКРОЛЛ: ЗАМОК':'СКРОЛЛ: ОТКРЫТ'; btn.classList.toggle('on',rollLocked); }
  for(const id of ['wrap1','wrap2']){
    const w=document.getElementById(id); if(!w) continue;
    w.style.overflowX=rollLocked?'hidden':'auto';
  }
  for(const s of [document.getElementById('strip1'),document.getElementById('strip2')]){
    if(!s) continue;
    s.style.opacity=rollLocked?'0.4':'';
    s.style.pointerEvents=rollLocked?'none':'';
  }
  lcd(rollLocked?'Скролл: ЗАМОК':'Скролл: ОТКРЫТ');
}
$('#rollLock').addEventListener('click',()=>{ rollLocked=!rollLocked; rollLockApply(); });
/* ===== ОКТАВНЫЙ ПУЛЬТ v1.0.37: кнопки дёргают ту же механику pcBase, что и
   стрелки; зажим PC_MIN/PC_MAX; обработчики стрелок не тронуты ===== */
function octBtn(d){
  pcBase=Math.min(PC_MAX(),Math.max(PC_MIN(),pcBase+d*12));
  lcd('PC-клавиатура: октава от ноты '+pcBase);
}
$('#octDn').addEventListener('click',()=>octBtn(-1));
$('#octUp').addEventListener('click',()=>octBtn(1));
function centerOnBase(){
  for(const w of [document.getElementById('wrap1'),document.getElementById('wrap2')]){
    if(!w) continue;
    const box=w.firstElementChild;
    const c=box?box.querySelector('[data-key="'+pcBase+'"]'):null;
    if(c) w.scrollLeft=Math.max(0,c.offsetLeft-(w.clientWidth-c.offsetWidth)/2);
  }
  for(const f of tapeSyncs) f();
}
function setKbMode(n){
  if(n===kbMode) return;
  kbMode=n;
  document.getElementById('kb2').classList.toggle('on',n===2);
  document.getElementById('kb1').classList.toggle('on',n===1);
  for(const [note,own] of [...noteOwner]){
    if(own==='@ext'){ noteOwner.delete(note); noteOff(note); }
  }
  for(const [,nn] of heldKeys){ susCancel(nn); hardOff(nn); }
  heldKeys.clear(); noteOwner.clear();
  pcBase=Math.min(PC_MAX(),Math.max(PC_MIN(),pcBase));
  document.body.classList.toggle('kb-single',kbMode===1);
  const h=document.getElementById('kbdHdr');
  if(h) h.textContent=kbMode===2?'КЛАВИАТУРА I — C1..C8 (мышь и ПК):':'КЛАВИАТУРА — C1..C8 (мышь и ПК):';
  buildKeys();
  log(kbMode===2?'Клавиатуры: 2 — обе роли C1..C8, единый размер 58×152.':'Клавиатуры: 1 — одна клавиатура C1..C8, ваш размер 58px, высота 152, лента скролла.');
  lcd('КЛАВИАТУРЫ: '+(kbMode===2?'2 — C1..C8':'1 — C1..C8'));
}
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById('kbToggle');
  const btnLay2 = document.getElementById('lay2');
  const btnLay1 = document.getElementById('lay1');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      kbOn = !kbOn;
      toggleBtn.classList.toggle('on', kbOn);
      toggleBtn.textContent = 'КЛАВИАТУРА: ' + (kbOn ? 'ВКЛ' : 'ВЫКЛ');
      if (!kbOn) {
        for (const [code, n] of heldKeys) { susCancel(n); hl(n, false); hardOff(n); }
        heldKeys.clear(); noteOwner.clear();
        log('Клавиатура ПК выключена — мышь и MIDI работают.');
      } else log('Клавиатура ПК включена.');
    });
  }

  if (btnLay2) btnLay2.addEventListener('click', () => setLayout(true));
  if (btnLay1) btnLay1.addEventListener('click', () => setLayout(false));
});

document.addEventListener("DOMContentLoaded", () => {
  const btnKb2 = document.getElementById('kb2');
  const btnKb1 = document.getElementById('kb1');
  const btnOctDn = document.getElementById('octDn');
  const btnOctUp = document.getElementById('octUp');
  const btnRollLock = document.getElementById('rollLock');

  if (btnKb2) btnKb2.addEventListener('click', () => setKbMode(2));
  if (btnKb1) btnKb1.addEventListener('click', () => setKbMode(1));
  if (btnOctDn) btnOctDn.addEventListener('click', () => octBtn(-1));
  if (btnOctUp) btnOctUp.addEventListener('click', () => octBtn(1));
  if (btnRollLock) btnRollLock.addEventListener('click', () => { rollLocked = !rollLocked; rollLockApply(); });
});
