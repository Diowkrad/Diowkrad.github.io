/* ============================================================
   ФАЙЛ 07/13: 07_sf2_loader.js
   Секция: загрузка SF2
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ загрузка SF2 ============ */
$('#sf2file').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f) return;
  try{
    const sf=parseSF2(await f.arrayBuffer());
    state.sf2=sf; state.presetIdx=0; state.instIdx=-1; state.instSpans=null; state.instSpansKey='';
    state.sampleCache.clear();
    const banks=[...new Set(sf.presets.map(p=>p.bank))].sort((a,b)=>a-b);
    const bsel=$('#bankSel'); bsel.innerHTML=''; bsel.disabled=false;
    banks.forEach(b=>{
      const o=document.createElement('option');
      o.value=b; o.textContent='Банк '+b+(banks.length>1?(' ('+sf.presets.filter(q=>q.bank===b).length+' пресетов)'):'');
      bsel.appendChild(o);
    });
    const isel=$('#instSel'); isel.innerHTML='<option value="-1">— авто (из пресета) —</option>'; isel.disabled=false;
    for(let i=0;i<sf.insts.length-1;i++){
      const o=document.createElement('option');
      o.value=i; o.textContent=i+': '+(sf.insts[i].name||'инструмент');
      isel.appendChild(o);
    }
    const firstP=fillPresetSel(banks.length?banks[0]:0);
    state.presetIdx=firstP>=0?firstP:-1;
    if(firstP>=0) $('#presetSel').value=String(firstP);
    lcd('MODE: [SoundFont]\nБанк: ['+f.name+'] — Пресетов: ['+sf.presets.length+']\nПресет: [—] — Инструмент: [— авто —]\nВыберите банк, пресет или инструмент — и играйте.');
    log('Загружен банк: '+f.name+' ('+(f.size/1048576).toFixed(1)+' МБ) — пресетов: '+sf.presets.length+'; '+(sf.le?'RIFF':'RIFX'));
  }catch(err){ log('Ошибка SF2: '+err.message); lcd('SF2 ERROR: '+err.message); }
  finally{ $('#sf2file').value=''; }
});
function fillPresetSel(bank){
  const sel=$('#presetSel'); sel.innerHTML=''; sel.disabled=false;
  let first=-1;
  state.sf2.presets.forEach((pr,i)=>{
    if(pr.bank!==bank) return;
    if(first<0) first=i;
    const o=document.createElement('option');
    o.value=i; o.textContent=pr.preset+': '+(pr.name||'(без имени)');
    sel.appendChild(o);
  });
  if(first<0){
    const o=document.createElement('option'); o.value=''; o.textContent='(в банке нет пресетов)';
    sel.appendChild(o); sel.disabled=true;
  }
  return first;
}
function updateBankLcd(){
  const sf=state.sf2; if(!sf) return;
  const p=sf.presets[state.presetIdx];
  const ins=state.instIdx>=0?('№'+state.instIdx+' «'+((sf.insts[state.instIdx]||{}).name||'инструмент')+'»'):'авто';
  lcd('MODE: [SoundFont]\nБанк: ['+$('#bankSel').value+'] — Пресетов: ['+sf.presets.length+']\nПресет: ['+(p?(p.name||'(без имени)'):'—')+'] — Инструмент: ['+ins+']');
}
$('#bankSel').addEventListener('change',e=>{
  if(!state.sf2) return;
  const first=fillPresetSel(+e.target.value);
  if(first>=0){ state.presetIdx=first; $('#presetSel').value=String(first); } else state.presetIdx=-1;
  state.instSpansKey='';
  updateBankLcd();
  log('Банк переключён на '+e.target.value+' — пресеты пересобраны.');
});
$('#presetSel').addEventListener('change',e=>{
  if(!state.sf2) return;
  const v=+e.target.value;
  state.presetIdx=Number.isFinite(v)&&e.target.value!==''?v:-1;
  state.instSpansKey='';
  updateBankLcd();
  const p=state.sf2.presets[state.presetIdx];
  if(p&&!p.spans.length) log('Пресет «'+(p.name||'(без имени)')+'» пуст (0 зон) — выберите другой.');
});
$('#instSel').addEventListener('change',e=>{
  if(!state.sf2) return;
  state.instIdx=+e.target.value; state.instSpansKey='';
  updateBankLcd();
  log(state.instIdx>=0
    ?('Инструмент: выбран №'+state.instIdx+' — разрез клавиатуры теперь из инструмента, зоны сэмплов не тронуты.')
    :'Инструмент: авто — выбор инструмента из пресета.');
});
