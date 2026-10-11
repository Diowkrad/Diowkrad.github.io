/* ============================================================
   ФАЙЛ 10/13: 10_midi_keyboard.js
   Секция: MIDI-клавиатура
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ MIDI-клавиатура ============ */
let midiAccess=null;
let sustainOn=false;
const sustained=new Set();
let bendCents=0;
function updVoices(){
  const el=$('#voiceCnt');
  if(el) el.textContent=activeChip.size+activeSF2.size+activeMidi.size;
}
function panicAll(){
  sustainOn=false; sustained.clear(); susClearAll(); noteOwner.clear();
  for(const t of killTimers.values()) clearTimeout(t); killTimers.clear();
  [...activeSF2.keys()].forEach(k=>sfOff(k));
  [...activeChip.keys()].forEach(k=>chipOff(k));
  [...activeMidi.keys()].forEach(k=>midiOff(k));
  updVoices();
  log('PANIC: все голоса заглушены.');
  lcd('PANIC — все голоса заглушены. Модель: ['+(state.sf2?'SoundFont':'CHIP')+']');
}
function applyBend(){
  // 1. Бенд для SoundFont сэмплов
  activeSF2.forEach(v=>{ if(v.rate) v.src.playbackRate.value=v.rate*Math.pow(2,bendCents/1200); });
  
  // 2. Бенд для CHIP-осцилляторов
  activeChip.forEach(v=>{ if(v.bend) v.bend(bendCents); });
  
  // ИСПРАВЛЕНИЕ: 3. Динамический бенд для всех гармоник MIDI GM инструментов
  activeMidi.forEach(v => {
    if (v.nodes && v.f && v.ratios) {
      v.nodes.forEach((osc, idx) => {
        // Проверяем, что это осциллятор (у него есть параметр frequency)
        if (osc.frequency) {
          const baseRatio = v.ratios[idx] || 1;
          const targetFreq = v.f * baseRatio * Math.pow(2, bendCents / 1200);
          osc.frequency.setValueAtTime(targetFreq, audioCtx.currentTime);
        }
      });
    }
  });
}
function initMIDI(){
  if(!navigator.requestMIDIAccess){
    log('Web MIDI API не поддерживается этим браузером (Chrome, Edge, Opera — да; Firefox — нет).');
    lcd('MIDI: браузер не поддерживает Web MIDI API');
    return;
  }
  navigator.requestMIDIAccess({sysex:false}).then(acc=>{
    midiAccess=acc;
    fillMidiSel(acc);
    acc.onstatechange=()=>{ fillMidiSel(acc); };
    log('MIDI доступ получен — устройства подключаются автоматически (в том числе «горячее» включение).');
  }).catch(err=>log('MIDI: доступ не получен — '+err.message));
}
function fillMidiSel(acc){
  const sel=$('#midiSel'); const cur=sel.value;
  sel.innerHTML='<option value="all">Все устройства</option>';
  acc.inputs.forEach(inp=>{
    const o=document.createElement('option');
    o.value=inp.id; o.textContent=inp.name||('MIDI-вход '+(inp.id||''));
    sel.appendChild(o);
  });
  if([...sel.options].some(o=>o.value===cur)) sel.value=cur;
  acc.inputs.forEach(inp=>{ inp.onmidimessage=onMIDI; });
}
function onMIDI(ev){
  const sel=$('#midiSel');
  if(sel.value!=='all'&&sel.value!==ev.target.id) return;
  const data=ev.data; if(!data||data.length<2) return;
  const st=data[0]&0xF0, d1=data[1], d2=data.length>2?data[2]:0;
  if(st===0x90&&d2>0){
    ensureAudio();
    sustained.delete(d1);
    noteOwner.set(d1,'@ext');
    noteOn(d1,applySens(d2/127));
  } else if(st===0x80||(st===0x90&&d2===0)){
    if(sustainOn){ sustained.add(d1); }
    else if(noteOwner.get(d1)==='@ext'){ noteOwner.delete(d1); noteOff(d1); }
  } else if(st===0xB0){
    if(d1===64){
      const was=sustainOn;
      sustainOn=d2>=64;
      if(was&&!sustainOn){
        [...sustained].forEach(k=>noteOff(k));
        sustained.clear();
        log('Сустейн: педаль отпущена — хвосты сняты.');
      }
    } else if(d1===120||d1===123){
      panicAll();
    }
  } else if(st===0xE0&&data.length>=3){
    bendCents=Math.round((((d2&0x7F)<<7|(d1&0x7F))-8192)/8192*200);
    applyBend();
  }
}
$('#midiBtn').addEventListener('click',initMIDI);
$('#panicBtn').addEventListener('click',panicAll);
