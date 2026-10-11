"use strict";
/* ============================================================
   ФАЙЛ 01/13: 01_state.js
   Секция: состояние
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ состояние ============ */
const state={mode:'chip',chipVoice:'pulse50',sf2:null,presetIdx:0,instIdx:-1,instSpans:null,instSpansKey:'',sampleCache:new Map()};
let audioCtx=null,master=null;
const activeChip=new Map(),activeSF2=new Map(),activeMidi=new Map();
const $=s=>document.querySelector(s);
const LOG_MAX=10;const logLines=[];
function log(msg){
  const el=$('#log'); if(!el) return;
  logLines.unshift(msg); if(logLines.length>LOG_MAX) logLines.length=LOG_MAX;
  el.textContent='';
  for(const l of logLines){ el.appendChild(document.createTextNode(l)); el.appendChild(document.createElement('hr')); }
}
function lcd(msg){$('#lcd').textContent=msg;}
$('#vol').addEventListener('input',e=>{if(master)master.gain.value=(+e.target.value)/100;});
function ensureAudio(){
  if(!audioCtx){
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    master=audioCtx.createGain(); master.gain.value=(+$('#vol').value)/100;
    /* защита от щелчков: DC-блок -> статичный мягкий клиппер -> мягкий лимитер */
    const clipCurve=new Float32Array(2048);
    for(let i=0;i<2048;i++){ const x=(i/1023.5)-1, a=Math.abs(x);
      clipCurve[i]=Math.sign(x)*(a<0.6?a:0.6+0.35*Math.tanh((a-0.6)/0.35)); }
    const clip=audioCtx.createWaveShaper(); clip.curve=clipCurve; clip.oversample='4x';
    const dcb=audioCtx.createBiquadFilter(); dcb.type='highpass'; dcb.frequency.value=20;
    const limiter=audioCtx.createDynamicsCompressor();
    limiter.threshold.value=-3; limiter.knee.value=12; limiter.ratio.value=6;
    limiter.attack.value=0.02; limiter.release.value=0.3;
    master.connect(dcb); dcb.connect(clip); clip.connect(limiter); limiter.connect(audioCtx.destination);
  }
  if(audioCtx.state==='suspended')audioCtx.resume();
}
const freqOf=k=>440*Math.pow(2,(k-69)/12);
const tc2s=tc=>Math.pow(2,(tc||0)/1200);
const sgn=v=>v>32767?v-65536:v;
