/* ============================================================
   ФАЙЛ 04/13: 04_sf2_playback.js
   Секция: воспроизведение SF2
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ воспроизведение SF2 ============ */
function getBuffer(sf,sIdx){
  if(state.sampleCache.has(sIdx)) return state.sampleCache.get(sIdx);
  const h=sf.shdrs[sIdx];
  let len=Math.max(0,h.end-h.start);
  const avail=Math.floor((sf.sampleEnd-sf.sampleStart)/2);
  len=Math.min(len,Math.max(0,avail-h.start));
  if(len<=0){ state.sampleCache.set(sIdx,null); return null; }
  const ab=audioCtx.createBuffer(1,len,h.sampleRate);
  const data0=ab.getChannelData(0);
  for(let i=0;i<len;i++) data0[i]=sf.dv.getInt16(sf.sampleStart+(h.start+i)*2,sf.le)/32768;
  let entry={buffer:ab,loopStart:null,loopEnd:null};
  if(h.startLoop<h.endLoop&&h.startLoop>=h.start&&h.endLoop<=h.start+len){
    entry.loopStart=(h.startLoop-h.start)/h.sampleRate;
    entry.loopEnd=(h.endLoop-h.start)/h.sampleRate;
  }
  state.sampleCache.set(sIdx,entry);
  return entry;
}
const VOICE_MAX=32;
function sfOn(key,vel=100){
  ensureAudio();
  const sf=state.sf2;
  if(!sf){ log('Банк не загружен — играет CHIP.'); chipOn(key,vel); return; }
  /* повторное нажатие зажатой клавиши: старый голос глушим, иначе голоса копятся и звук нарастает */
  const old=activeSF2.get(key);
  if(old){
    const t0=audioCtx.currentTime;
    try{ old.g.gain.cancelScheduledValues(t0); old.g.gain.setTargetAtTime(0,t0,0.01); old.src.stop(t0+0.1); }catch(_){}
    activeSF2.delete(key);
  }
  /* потолок полифонии: при переполнении крадём самый старый голос */
  if(activeSF2.size>=VOICE_MAX){ const k0=activeSF2.keys().next().value; sfOff(k0); }
  const p=sf.presets[state.presetIdx];
  let spans=null;
  if(state.instIdx>=0&&sf.insts[state.instIdx]){
    const kk=state.presetIdx+':'+state.instIdx;
    if(state.instSpansKey!==kk){ state.instSpans=buildSpansInst(sf,state.instIdx,presetGlobalGens(sf,state.presetIdx)); state.instSpansKey=kk; }
    spans=state.instSpans;
    if(!spans.length){ log('Инструмент №'+state.instIdx+' без сэмпловых зон — играет CHIP.'); chipOn(key,vel); return; }
  } else {
    if(!p){ log('Пресет не выбран — играет CHIP.'); chipOn(key,vel); return; }
    spans=p.spans;
    if(!spans.length){ log('Пресет пуст (0 зон) — играет CHIP.'); chipOn(key,vel); return; }
  }
  let span=spans.find(s=>key>=s.lo&&key<=s.hi&&vel>=s.vlo&&vel<=s.vhi);
  if(!span) span=spans.find(s=>key>=s.lo&&key<=s.hi);
  if(!span){
    const los=Math.min(...spans.map(s=>s.lo)), his=Math.max(...spans.map(s=>s.hi));
    log('Нота '+key+' вне диапазона ['+los+'–'+his+'] — играет CHIP.');
    chipOn(key,vel); return;
  }
  const entry=getBuffer(sf,span.sample);
  if(!entry){ log('Сэмпл '+span.sample+' пуст — играет CHIP.'); chipOn(key,vel); return; }
  const src=audioCtx.createBufferSource();
  src.buffer=entry.buffer;
  const cents=(key-span.root)*100+span.corr+span.coarse*100+span.fine+bendCents;
  src.playbackRate.value=Math.pow(2,cents/1200);
  if(entry.loopStart!==null&&(span.modes===1||span.modes===3)){
    src.loop=true; src.loopStart=entry.loopStart; src.loopEnd=entry.loopEnd;
  }
  const g=audioCtx.createGain(), t=audioCtx.currentTime;
  const A=Math.max(span.attack,0.002), H=Math.max(span.hold,0);
  const D=Math.max(span.decay,0.01);
  const peak=Math.min(0.9,Math.pow(vel/127,1.5)*Math.pow(10,-Math.max(0,span.atten)/200)*0.9);
  const sus=Math.min(1,Math.max(0.0005,Math.pow(10,-Math.abs(span.sustain)/200)));
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(peak,t+A);
  g.gain.setValueAtTime(peak,t+A+H);
  g.gain.exponentialRampToValueAtTime(Math.max(peak*sus,0.0005),t+A+H+D);
  src.connect(g); g.connect(master); src.start(t);
  activeSF2.set(key,{src,g,rel:Math.max(span.release,0.02),rate:src.playbackRate.value});
  hl(key,true);
}
function sfOff(key){
  const v=activeSF2.get(key); if(!v) return false;
  const t=audioCtx.currentTime;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setValueAtTime(v.g.gain.value||0.0001,t);
  v.g.gain.setTargetAtTime(0,t,v.rel/3);
  v.src.stop(t+v.rel*2);
  activeSF2.delete(key); hl(key,false);
  setTimeout(()=>{ try{ v.g.disconnect(); }catch(_){} },Math.round(v.rel*2*1000)+50); /* уборка после хвоста */
}
