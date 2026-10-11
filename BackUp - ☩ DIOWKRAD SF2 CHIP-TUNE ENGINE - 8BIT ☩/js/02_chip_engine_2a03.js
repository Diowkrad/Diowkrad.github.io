/* ============================================================
   ФАЙЛ 02/13: 02_chip_engine_2a03.js
   Секция: CHIP-движок 2A03
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ CHIP-движок 2A03 ============ */
const CPU_NTSC=1789773;
const NTSC_NOISE=[4,8,16,32,64,96,128,160,202,254,380,508,762,1016,2034,4068];
const CHIP_VOICES=[
  {id:'pulse50',name:'□ PULSE 50%',duty:0.5,octave:-1},
  {id:'pulse25',name:'□ PULSE 25%',duty:0.25,octave:-1},
  {id:'pulse12',name:'□ PULSE 12,5%',duty:0.125,octave:-1},
  {id:'saw',name:'◺ ПИЛА',type:'sawtooth',octave:0},
  {id:'tri',name:'△ ТРЕУГОЛЬНИК',type:'triangle',octave:0},
  {id:'sine',name:'∿ СИНУС',type:'sine',octave:0},
  {id:'square',name:'□ КВАДРАТ',type:'square',octave:0,nes:true},
  {id:'pulseR',name:'ᵓ ПУЛЬС КРУГЛ.',round:true,octave:-1},
  {id:'nwave',name:'⟋⟋ N-ВОЛНА',nwave:true,octave:0},
  {id:'noiseL',name:'ШУМ — длинный цикл',noise:'long',octave:0},
  {id:'noiseS',name:'ШУМ — короткий цикл',noise:'short',octave:0}
];
const chipVoiceById=id=>CHIP_VOICES.find(v=>v.id===id);
const chipDutyWaves={},chipNoiseCache=new Map();
const DUTY_PAT={0.5:[0,1,1,1,1,0,0,0],0.25:[0,1,1,0,0,0,0,0],0.125:[0,1,0,0,0,0,0,0]};
function dutyBuffer(d,f){ /* duty-паттерн 2A03: 8 шагов на период, жёсткие фронты — тембр как на железе */
  const k='d'+d+'@'+f.toFixed(2);
  if(chipDutyWaves[k]) return chipDutyWaves[k];
  const pat=DUTY_PAT[d]||DUTY_PAT[0.5];
  const N=Math.max(16,Math.round(audioCtx.sampleRate/f));
  const buf=audioCtx.createBuffer(1,N,audioCtx.sampleRate);
  const ch=buf.getChannelData(0);
  for(let i=0;i<N;i++) ch[i]=pat[(i*8/N)|0]?(1-d):(-d); /* DC-развязка: среднее ноль */
  chipDutyWaves[k]=buf; return buf;
}
function noiseBuffer(mode){ /* 15-битный LFSR: 32767 шагов (длинный) или 93 (короткий, бит 6 = feedback) */
  if(chipNoiseCache.has(mode)) return chipNoiseCache.get(mode);
  const steps=mode==='short'?93:32767;
  const buf=audioCtx.createBuffer(1,steps,audioCtx.sampleRate);
  const ch=buf.getChannelData(0);
  let reg=1;
  for(let i=0;i<steps;i++){
    const fb=(reg&1)^((reg>>1)&1);
    reg=(reg>>1)|(fb<<14);
    if(mode==='short') reg=(reg&~(1<<6))|(fb<<6);
    ch[i]=(reg&1)?1:-1;
  }
  let mn=0; for(let i=0;i<steps;i++) mn+=ch[i]; mn/=steps;
  for(let i=0;i<steps;i++) ch[i]-=mn; /* DC-развязка */
  chipNoiseCache.set(mode,buf); return buf;
}
function roundedPulseBuffer(f){ /* пульс с закруглённым фронтом: smoothstep-атака ~12% периода, DC-развязка */
  const k='r'+f.toFixed(2);
  if(chipDutyWaves[k]) return chipDutyWaves[k];
  const N=Math.max(16,Math.round(audioCtx.sampleRate/f));
  const buf=audioCtx.createBuffer(1,N,audioCtx.sampleRate);
  const ch=buf.getChannelData(0);
  const R=Math.max(2,Math.round(N*0.12));
  for(let i=0;i<N;i++){
    const p=i/N; let x;
    if(p<R/N){ const u=i/R; x=-1+2*u*u*(3-2*u); }       /* smoothstep: -1 -> +1 */
    else if(p<0.5) x=1;                                  /* полка до середины */
    else x=-1;                                           /* резкий спад */
    ch[i]=x;
  }
  let mn=0; for(let i=0;i<N;i++) mn+=ch[i]; mn/=N;
  for(let i=0;i<N;i++) ch[i]-=mn; /* DC-развязка */
  chipDutyWaves[k]=buf; return buf;
}
function nWaveBuffer(f){ /* N-волна: зигзаг подъём-спад-подъём, три сегмента, среднее ноль */
  const k='n'+f.toFixed(2);
  if(chipDutyWaves[k]) return chipDutyWaves[k];
  const N=Math.max(16,Math.round(audioCtx.sampleRate/f));
  const buf=audioCtx.createBuffer(1,N,audioCtx.sampleRate);
  const ch=buf.getChannelData(0);
  for(let i=0;i<N;i++){
    const p=i/N; let x;
    if(p<1/3) x=-1+6*p;                                  /* подъём -1 -> +1 */
    else if(p<2/3) x=1-6*(p-1/3);                        /* спад +1 -> -1 */
    else x=-1+6*(p-2/3);                                 /* подъём -1 -> +1, скачок на стыке периода */
    ch[i]=x;
  }
  chipDutyWaves[k]=buf; return buf;
}
function chipKill(key){ /* немедленное глушение — при повторном нажатии и при смене режима */
  const v=activeChip.get(key); if(!v) return;
  const t=audioCtx.currentTime;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setValueAtTime(v.g.gain.value||0.0001,t);
  v.g.gain.setTargetAtTime(0,t,0.01);
  v.nodes.forEach(n=>{try{n.stop(t+0.08);}catch(_){}});
  activeChip.delete(key); hl(key,false);
}
function chipOn(key,vel=100){
  ensureAudio();
  /* БАГ ДВОЙНОГО ЗВУКА (1/2): повторное нажатие зажатой ноты глушит старый голос */
  if(activeChip.has(key)) chipKill(key);
  const v=chipVoiceById(state.chipVoice)||CHIP_VOICES[0];
  const t=audioCtx.currentTime;
  const g=audioCtx.createGain();
  const peak=(v.nes?0.28:0.25)*Math.pow(vel/127,1.3); /* 0.28 — как в NES-PIANO */
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(peak,t+0.005);
  g.gain.setTargetAtTime(peak*0.35,t+0.005,0.08);
   // ... (начало функции chipOn без изменений)
  const nodes=[]; let rate=null, info='';
  if(v.noise){
    const idx=Math.min(NTSC_NOISE.length-1,Math.max(0,Math.floor((key-24)*(NTSC_NOISE.length/84))));
    const timer=NTSC_NOISE[idx];
    const src=audioCtx.createBufferSource();
    src.buffer=noiseBuffer(v.noise); src.loop=true;
    const shift=CPU_NTSC/(2*(timer+1)); /* тики LFSR */
    rate=shift/audioCtx.sampleRate;     /* буфер: 1 тик = 1 сэмпл */
    
    /* ИСПРАВЛЕНИЕ: Применяем текущий бенд прямо при старте ноты шума */
    src.playbackRate.setValueAtTime(rate * Math.pow(2, bendCents/1200), t);
    
    src.connect(g); src.start(t); nodes.push(src);
    info='таймер='+timer+' (сдвиг ~'+shift.toFixed(0)+' Гц)';
  } else {
    let div=16, freq, osc, note;
    if(v.duty!==undefined){                 /* пульсы: -1 октава, делитель 16 */
      note=key-12;
      const period=Math.round(CPU_NTSC/(16*freqOf(note))-1);
      if(period<8){ g.disconnect(); log('PULSE: период '+period+' < 8 — канал молчит (как на 2A03).'); return; }
      freq=CPU_NTSC/(16*(period+1));
      osc=audioCtx.createBufferSource();
      osc.buffer=dutyBuffer(v.duty,freq); osc.loop=true;
      osc.connect(g); osc.start(t); nodes.push(osc);       /* БАГ ДВОЙНОГО ЗВУКА (2/2): путь один — без параллельного osc.connect(g) */
      rate=1;                                              /* питч-бенд: множим скорость буфера */
      info='t='+period+' f='+freq.toFixed(2)+' Гц (-1 октава, паттерн 2A03)';
    } else if(v.type==='sawtooth'){          /* пила: пресеты пульса (делитель 16) */
      const period=Math.round(CPU_NTSC/(16*freqOf(key))-1);
      if(period<8){ g.disconnect(); log('SAW: период '+period+' < 8 — канал молчит.'); return; }
      freq=CPU_NTSC/(16*(period+1));
      osc=audioCtx.createOscillator();
      osc.type='sawtooth'; osc.frequency.value=freq;
      const lp=audioCtx.createBiquadFilter();
      lp.type='lowpass'; lp.frequency.value=6000;
      osc.connect(lp); lp.connect(g); osc.start(t); nodes.push(osc);
      info='t='+period+' f='+freq.toFixed(2)+' Гц';
    } else if(v.nes){                         /* квадрат NES-PIANO: прямой осциллятор + lowpass 4 кГц, без квантования периода */
      freq=freqOf(key);
      osc=audioCtx.createOscillator();
      osc.type='square'; osc.frequency.value=freq;
      const lp=audioCtx.createBiquadFilter();
      lp.type='lowpass'; lp.frequency.value=4000;
      osc.connect(lp); lp.connect(g); osc.start(t); nodes.push(osc);
      info='f='+freq.toFixed(2)+' Гц (схема NES-PIANO, lowpass 4 кГц)';
    } else if(v.round){                      /* пульс с закруглённым фронтом: -1 октава, таймер 2A03 */
      note=key-12;
      const period=Math.round(CPU_NTSC/(16*freqOf(note))-1);
      if(period<8){ g.disconnect(); log('PULSE-R: период '+period+' < 8 — канал молчит (как на 2A03).'); return; }
      freq=CPU_NTSC/(16*(period+1));
      osc=audioCtx.createBufferSource();
      osc.buffer=roundedPulseBuffer(freq); osc.loop=true;
      osc.connect(g); osc.start(t); nodes.push(osc);
      rate=1;                                /* питч-бенд: множим скорость буфера */
      info='t='+period+' f='+freq.toFixed(2)+' Гц (-1 октава, скруглённый фронт)';
    } else if(v.nwave){                      /* N-волна: зигзаг, прямой регистр */
      freq=freqOf(key);
      osc=audioCtx.createBufferSource();
      osc.buffer=nWaveBuffer(freq); osc.loop=true;
      osc.connect(g); osc.start(t); nodes.push(osc);
      rate=1;
      info='f='+freq.toFixed(2)+' Гц (N-волна, два зубца)';
    } else {                                  /* треугольник и синус: делитель 32 */
      div=32;
      const period=Math.round(CPU_NTSC/(32*freqOf(key))-1);
      if(period<1){ g.disconnect(); log('CH: период '+period+' — вне диапазона чипа.'); return; }
      freq=CPU_NTSC/(32*(period+1));
      osc=audioCtx.createOscillator();
      osc.type=v.type; osc.frequency.value=freq;
      osc.connect(g); osc.start(t); nodes.push(osc);
      info='t='+period+' f='+freq.toFixed(2)+' Гц';
    }
  }
  g.connect(master);
  activeChip.set(key,{g,nodes,rate,
    bend:c=>{ nodes.forEach(n=>{ try{ if(n.detune) n.detune.value=c; else if(rate!==null) n.playbackRate.value=rate*Math.pow(2,c/1200);}catch(_){} }); }});
  hl(key,true);
  log('CHIP: нота '+key+' ['+v.name+'] '+info);
}
function chipOff(key){
  const v=activeChip.get(key); if(!v) return;
  const t=audioCtx.currentTime;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setValueAtTime(v.g.gain.value||0.0001,t);
  v.g.gain.setTargetAtTime(0,t,0.05);
  v.nodes.forEach(n=>{try{n.stop(t+0.4);}catch(_){}});
  activeChip.delete(key); hl(key,false);
  setTimeout(()=>{ try{ v.g.disconnect(); }catch(_){} },450); /* уборка узла после хвоста релиза */
}
/* ---------- режимы и выбор голоса ---------- */
function setMode(m){
  if(state.mode===m) return;
  state.mode=m;
  susClearAll();
  [...activeChip.keys()].forEach(k=>chipKill(k));
  [...activeSF2.keys()].forEach(k=>sfOff(k));
  [...activeMidi.keys()].forEach(k=>midiKill(k));
  $('#btnChip').classList.toggle('on',m==='chip');
  $('#btnSf2').classList.toggle('on',m==='sf2');
  $('#btnMidi').classList.toggle('on',m==='midi');
  if(m==='chip') lcd('MODE: [CHIP-TUNE] — Чип: [2A03] ['+chipVoiceById(state.chipVoice).name+']');
  else if(m==='midi') lcd('MODE: [MIDI GM] — Голос: ['+GMN[midiProg]+']');
  else updateBankLcd();
  log('Режим: '+(m==='chip'?'CHIP-TUNE (2A03)':(m==='midi'?'MIDI GM':'SoundFont'))+' — голоса заглушены.');
}
function setChipVoice(id){
  state.chipVoice=id;
  document.querySelectorAll('#wavePanel .wbtn').forEach(x=>x.classList.toggle('on',x.dataset.wave===id));
  $('#chipVoiceSel').value=id;
  const v=chipVoiceById(id);
  lcd('MODE: [CHIP-TUNE] — Чип: [2A03] — Голос: ['+(v?v.name:id)+']');
  if(state.mode!=='chip') setMode('chip'); else log('Голос чипа: '+(v?v.name:id));
}
$('#chipVoiceSel').addEventListener('change',e=>setChipVoice(e.target.value));
$('#btnChip').addEventListener('click',()=>setMode('chip'));
$('#btnSf2').addEventListener('click',()=>{ if(!state.sf2){ log('Банк ещё не загружен — сначала загрузите .sf2.'); return; } setMode('sf2'); });
$('#btnMidi').addEventListener('click',()=>setMode('midi'));
document.querySelectorAll('#wavePanel .wbtn').forEach(b=>{ b.addEventListener('click',()=>setChipVoice(b.dataset.wave)); });
(function fillChipVoices(){
  const sel=$('#chipVoiceSel');
  CHIP_VOICES.forEach(v=>{ const o=document.createElement('option'); o.value=v.id; o.textContent=v.name; sel.appendChild(o); });
  sel.value=state.chipVoice;
})();
