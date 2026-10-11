/* ============================================================
   ФАЙЛ 05/13: 05_sustain.js
   Секция: сустейн 1/8 · 1/4 · 1/2 (доля + затухание)
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ сустейн 1/8 · 1/4 · 1/2 (доля + затухание) ============ */
const SUSTAIN_MODES={'1/8':{gate:250,tail:900},'1/4':{gate:500,tail:700},'1/2':{gate:700,tail:500}};
let susMode='';
const susTimers=new Map(); /* key -> {relT,hlT} */
function susDecay(key){ /* начало затухания по границе доли */
  const md=SUSTAIN_MODES[susMode]||SUSTAIN_MODES['1/8'];
  if(!audioCtx) return;
  const t=audioCtx.currentTime, tau=md.tail/4000; /* хвост ~4 тау */
  const vC=activeChip.get(key);
  if(vC){
    try{vC.g.gain.cancelScheduledValues(t);}catch(_){}
    vC.g.gain.setValueAtTime(vC.g.gain.value||0.0001,t);
    vC.g.gain.setTargetAtTime(0,t,tau);
    vC.nodes.forEach(n=>{try{n.stop(t+md.tail/1000);}catch(_){}});
    activeChip.delete(key);
    setTimeout(()=>{try{vC.g.disconnect();}catch(_){}},md.tail+50);
  }
  const vS=activeSF2.get(key);
  if(vS){
    try{vS.g.gain.cancelScheduledValues(t);}catch(_){}
    vS.g.gain.setValueAtTime(vS.g.gain.value||0.0001,t);
    vS.g.gain.setTargetAtTime(0,t,tau);
    try{vS.src.stop(t+md.tail/1000);}catch(_){}
    activeSF2.delete(key);
    setTimeout(()=>{try{vS.g.disconnect();}catch(_){}},md.tail+50);
  }
  const vM=activeMidi.get(key);
  if(vM){
    try{vM.g.gain.cancelScheduledValues(t);}catch(_){}
    vM.g.gain.setValueAtTime(vM.g.gain.value||0.0001,t);
    vM.g.gain.setTargetAtTime(0,t,tau);
    vM.nodes.forEach(n=>{try{n.stop(t+md.tail/1000);}catch(_){}});
    activeMidi.delete(key);
    setTimeout(()=>{try{vM.g.disconnect();}catch(_){}},md.tail+50);
  }
  updVoices();
}
function susCancel(key){
  const s=susTimers.get(key);
  if(s){clearTimeout(s.relT);clearTimeout(s.hlT);susTimers.delete(key);}
}
function susClearAll(){
  for(const [k,s] of susTimers){clearTimeout(s.relT);clearTimeout(s.hlT);hl(k,false);}
  susTimers.clear();
}
let bpm=120; /* ТЕМП: 40–300 BPM; целая нота = 4 доли = 240/BPM секунд */
const killTimers=new Map(); /* key -> таймер потолка ноты */

function ceilingKill(k){ /* потолок: нота звучит не дольше 1 целой — залипший MIDI не страшен */
  killTimers.delete(k);
  if(!activeChip.has(k)&&!activeSF2.has(k)&&!activeMidi.has(k)) return;
  susDecay(k); susCancel(k); hl(k,false);
  log('Потолок ноты: нота '+k+' заглушена — прозвучала 1 целую ('+bpm+' BPM).');
}
function clearCeiling(k){ const t=killTimers.get(k); if(t){clearTimeout(t);killTimers.delete(k);} }
function scheduleCeiling(k){ clearCeiling(k); killTimers.set(k,setTimeout(()=>ceilingKill(k),240000/bpm)); }

function susSchedule(key){ /* нота живёт ПОСЛЕ отпускания до границы доли */
  const now=performance.now();
  const v=activeChip.get(key)||activeSF2.get(key)||activeMidi.get(key);
  const st=(v&&v.st)||now;
  const md=SUSTAIN_MODES[susMode];
  const rem=Math.max(0,st+md.gate-now);
  const relT=setTimeout(()=>{susDecay(key);},rem);
  const hlT=setTimeout(()=>{hl(key,false);susTimers.delete(key);},rem+md.tail);
  susTimers.set(key,{relT,hlT});
  updVoices();
}
function hardOff(k){ /* мгновенное глушение без педали */
  const wasMidi=state.mode==='midi'?midiOff(k):false; const wasSF2=state.mode==='sf2'?sfOff(k):false; if(!wasMidi&&!wasSF2) chipOff(k);
}
function setSusMode(mode){
  susMode = mode;
  [['susBtn8','1/8'],['susBtn4','1/4'],['susBtn2','1/2']].forEach(([id,m])=>{
    const b = document.getElementById(id); if(b) b.classList.toggle('on',mode===m);
  });
  if(!mode){ susClearAll(); log('Сустейн выключен.'); return; }
  
  /* ИСПРАВЛЕНИЕ: Создаем изолированный снимок ключей, чтобы избежать сбоя итератора Map при удалении */
  const now = performance.now();
  const keysToUpdate = Array.from(susTimers.keys());
  
  for(const k of keysToUpdate){
    const s = susTimers.get(k);
    if (!s) continue;
    
    // Безопасно очищаем старые таймауты перед перезаписью
    clearTimeout(s.relT); 
    clearTimeout(s.hlT);
    
    const v = activeChip.get(k) || activeSF2.get(k) || activeMidi.get(k);
    const st = (v && v.st) || now;
    const rem = Math.max(0, st + SUSTAIN_MODES[mode].gate - now);
    
    // Пересоздаем объект таймеров заново
    const newTimers = {
      relT: setTimeout(() => { susDecay(k); }, rem),
      hlT: setTimeout(() => { 
        hl(k, false); 
        susTimers.delete(k); // Теперь удаление безопасно
      }, rem + SUSTAIN_MODES[mode].tail)
    };
    
    susTimers.set(k, newTimers);
  }
  log('Сустейн: ' + mode + ' — нота поёт после отпускания, затем затухание.');
}
