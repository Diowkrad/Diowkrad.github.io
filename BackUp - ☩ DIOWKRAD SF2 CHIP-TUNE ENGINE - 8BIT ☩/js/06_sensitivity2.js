/* ============================================================
   ФАЙЛ 06/13: 06_sensitivity.js
   Секция: ТУШЕ: режимы чувствительности
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* === ТУШЕ: режимы чувствительности === */
const SENS_MODES={soft:[40,65],hard:[1,100],fixed:[80,80]};
let sensMode='hard';
function applySens(relY){
  if(sensMode==='fixed') return 80;
  const [lo,hi]=SENS_MODES[sensMode];
  const t=Math.min(1,Math.max(0,relY));
  const curve=(sensMode==='hard')?t*t:Math.pow(t,1.6); /* HARD — крутая кривая, SOFT — мягкая */
  return Math.round(lo+(hi-lo)*curve);
}
function setSensMode(m){
  sensMode=m;
  $('#sensSoft').classList.toggle('on',m==='soft');
  $('#sensHard').classList.toggle('on',m==='hard');
  $('#sensFixed').classList.toggle('on',m==='fixed');
  log('ТУШЕ: '+m.toUpperCase()+(m==='soft'?' — мягкий диапазон 40–65%':(m==='hard'?' — полный диапазон 1–100%':' — фиксированные 80%')));
}
$('#sensSoft').addEventListener('click',()=>setSensMode('soft'));
$('#sensHard').addEventListener('click',()=>setSensMode('hard'));
$('#sensFixed').addEventListener('click',()=>setSensMode('fixed'));
function noteOn(k,v){
  susCancel(k); /* повторное нажатие: старый отложенный хвост снимается, голос пересоздаётся */
  state.mode==='midi'?midiOn(k,v):state.mode==='sf2'?sfOn(k,v):chipOn(k,v);
  const nv=activeChip.get(k)||activeSF2.get(k)||activeMidi.get(k);
  if(nv) nv.st=performance.now(); /* метка старта ноты — от неё отсчитывается доля */
  scheduleCeiling(k); /* предохранитель: максимум 1 целая */
}
function noteOff(k){
  clearCeiling(k);
  if(susMode){ susSchedule(k); return; }
  hardOff(k);
}
$('#susBtn8').addEventListener('click',()=>setSusMode(susMode==='1/8'?'':'1/8'));
$('#susBtn4').addEventListener('click',()=>setSusMode(susMode==='1/4'?'':'1/4'));
$('#susBtn2').addEventListener('click',()=>setSusMode(susMode==='1/2'?'':'1/2'));

/* ТЕМП: ползунок 40–300 BPM; при смене предохранители живых голосов пересчитываются */
$('#bpm').addEventListener('input',e=>{
  bpm=Math.max(40,Math.min(300,Math.round(+e.target.value||120)));
  const bv=$('#bpmVal'); if(bv) bv.textContent=bpm+' BPM';
  const now=performance.now();
  for(const [k,t] of killTimers){
    clearTimeout(t);
    const v=activeChip.get(k)||activeSF2.get(k)||activeMidi.get(k);
    if(!v){killTimers.delete(k);continue;}
    const rem=Math.max(0,(v.st||now)+240000/bpm-now);
    killTimers.set(k,setTimeout(()=>ceilingKill(k),rem));
  }
  log('ТЕМП: '+bpm+' BPM — целая нота '+(240/bpm).toFixed(2)+' с.');
});
