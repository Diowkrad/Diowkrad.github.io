/* ============================================================
   ФАЙЛ 03/13: 03_sf2_parser.js
   Секция: ПАРСЕР SF2 (живучий: обход RIFF/LIST + RIFX + сигнатурный поиск)
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

/* ============ ПАРСЕР SF2 (живучий: обход RIFF/LIST + RIFX + сигнатурный поиск) ============ */
const REC={phdr:38,pbag:4,pmod:4,inst:22,ibag:4,igen:4,shdr:46};
function parseSF2(buf){
  const N=buf.byteLength;
  if(N<64) throw new Error('файл слишком мал ('+N+' байт)');
  const dv=new DataView(buf), u8=new Uint8Array(buf);
  const str=(o,n)=>{let t='';for(let i=0;i<n&&o+i<N;i++){const c=u8[o+i];if(c<32||c>126)break;t+=String.fromCharCode(c);}return t;};
  const head=str(0,4);
  if(head!=='RIFF'&&head!=='RIFX')
    throw new Error('это не SoundFont2: сигнатура "'+head+'"');
  const le=(head!=='RIFX');
  const u32=o=>(o>=0&&o+4<=N)?dv.getUint32(o,le):0;
  const u16=o=>(o>=0&&o+2<=N)?dv.getUint16(o,le):0;
  const s16=o=>(o>=0&&o+2<=N)?dv.getInt16(o,le):0;
  const found={};
  /* --- уровень 1: структурный обход с спуском в RIFF/LIST (ЗАЩИЩЕННЫЙ) --- */
  const walk = (from, to, depth) => {
    if (depth > 10) return;
    let p = from;
    while (p + 8 <= to) {
      const cid = str(p, 4), cs = u32(p + 4);
      
      // ИСПРАВЛЕНИЕ: Жесткая проверка на битый/отрицательный размер или выход за пределы файла
      if (cs < 0 || cs > (N - p - 8)) { 
        const rest = Math.max(0, to - (p + 8));
        if (cid && !found[cid] && cid !== 'LIST' && cid !== 'RIFF' && cid !== 'RIFX') {
          found[cid] = { start: p + 8, size: rest };
        }
        break; // Прерываем чтение поврежденной ветки
      }
      
      if (cid === 'LIST' || cid === 'RIFF' || cid === 'RIFX') {
        const inner = p + 12, end = Math.min(p + 8 + cs, N);
        if (cs >= 4) walk(inner, end, depth + 1);
        p = end; 
        if (cs % 2) p++;
      } else {
        if (!found[cid]) found[cid] = { start: p + 8, size: cs };
        
        // ИСПРАВЛЕНИЕ: Предохранитель от нулевого или отрицательного сдвига указателя
        const step = 8 + cs + (cs % 2);
        if (step <= 8) { 
          break; // Защита от бесконечного зацикливания на одном месте
        }
        p += step;
      }
      if (p <= from) break; // Защита от отката указателя назад
    }
  };
  walk(12, N, 0);
  /* --- уровень 2: сигнатурный поиск для недостающих критичных чанков --- */
  const req=['phdr','pbag','pmod','inst','ibag','imap','igen','shdr'];
  const need=req.filter(id=>!found[id]);
  if(need.length){
    for(const id of need){
      const a=id.charCodeAt(0),b=id.charCodeAt(1),c=id.charCodeAt(2),d=id.charCodeAt(3);
      let best=-1,bestScore=-1,bestSize=0;
      const rec=REC[id]||0;
      for(let i=0;i+12<=N;i++){
        if(u8[i]!==a||u8[i+1]!==b||u8[i+2]!==c||u8[i+3]!==d) continue;
        const cs=u32(i+4);
        if(cs<=0||i+8+cs>N) continue;
        const even=(cs%rec)===0;
        const score=(even?1e12:0)+i; /* кратный размеру записи + самая поздняя позиция */
        if(score>=bestScore){best=i;bestScore=score;bestSize=cs;}
      }
      if(best>=0) found[id]={start:best+8,size:bestSize};
    }
  }
  /* --- smpl (данные сэмплов) --- */
  let sampleStart=0, sampleEnd=N;
  if(found['smpl']){
    sampleStart=found['smpl'].start;
    sampleEnd=Math.min(sampleStart+found['smpl'].size,N);
  }else{
    let best=-1,bestSize=0;
    const a=115,b=109,c=112,d=108; /* 'smpl' */
    for(let i=0;i+12<=N;i++){
      if(u8[i]!==a||u8[i+1]!==b||u8[i+2]!==c||u8[i+3]!==d) continue;
      const cs=u32(i+4);
      if(cs<=0||i+8+cs>N) continue;
      if(cs>bestSize){best=i;bestSize=cs;}
    }
    if(best>=0){sampleStart=best+8;sampleEnd=best+8+bestSize;}
  }
  /* --- версии: предупредить о SF3 --- */
  if(found['ifil']){
    const maj=u16(found['ifil'].start);
    if(maj>=3) log('ПРЕДУПРЕЖДЕНИЕ: банк SF3 (сжатые сэмплы) — звук будет шумом, нужен SF2');
  }
  const miss=['phdr','pbag','inst','ibag','igen','shdr'].filter(id=>!found[id]);
  if(miss.length)
    throw new Error('в банке нет чанков: '+miss.join(', ')+' | найдены: '+Object.keys(found).join(', '));
  /* --- разбор записей с защитой границ --- */
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const phdrN=Math.floor(found['phdr'].size/38);
  const pbagN=Math.floor(found['pbag'].size/4);
  const pgenN=found['pgen']?Math.floor(found['pgen'].size/4):0;
  const instN=Math.floor(found['inst'].size/22);
  const ibagN=Math.floor(found['ibag'].size/4);
  const igenN=Math.floor(found['igen'].size/4);
  const shdrN=Math.floor(found['shdr'].size/46);
  if(phdrN<2) throw new Error('phdr пуст ('+phdrN+' записей)');
  const pbags=[],pgens=[],insts=[],ibags=[],igens=[],shdrs=[],presets=[];
  for(let i=0;i<pbagN;i++) pbags.push({gi:u16(found['pbag'].start+i*4)});
  for(let i=0;i<pgenN;i++) pgens.push({op:u16(found['pgen'].start+i*4),amt:u16(found['pgen'].start+i*4+2)});
  for(let i=0;i<instN;i++){
    const o=found['inst'].start+i*22;
    insts.push({name:str(o,20),bag:u16(o+20)});
  }
  for(let i=0;i<ibagN;i++) ibags.push({gi:u16(found['ibag'].start+i*4)});
  for(let i=0;i<igenN;i++) igens.push({op:u16(found['igen'].start+i*4),amt:u16(found['igen'].start+i*4+2)});
  for(let i=0;i<shdrN;i++){
    const o=found['shdr'].start+i*46;
    let sr=u32(o+36); if(sr<8000||sr>96000) sr=44100;
    shdrs.push({name:str(o,20),start:u32(o+20),end:u32(o+24),
      startLoop:u32(o+28),endLoop:u32(o+32),sampleRate:sr,
      origPitch:u8[o+40],pitchCorr:(u8[o+41]>127?u8[o+41]-256:u8[o+41])});
  }
  for(let i=0;i<phdrN-1;i++){
    const o=found['phdr'].start+i*38;
    presets.push({name:str(o,20),preset:u16(o+20),bank:u16(o+22),
      bag:u16(o+24),bagEnd:u16(found['phdr'].start+(i+1)*38+24)});
  }
  const zones=(bagArr,genArr,b0,b1)=>{
    b0=clamp(b0|0,0,bagArr.length);
    b1=clamp(b1|0,b0,bagArr.length);
    const out=[];
    for(let b=b0;b<b1;b++){
      const g0=clamp(bagArr[b].gi|0,0,genArr.length);
      const g1=clamp(b+1<bagArr.length?bagArr[b+1].gi|0:genArr.length,g0,genArr.length);
      const gens={};
      for(let g=g0;g<g1;g++) gens[genArr[g].op]=genArr[g].amt;
      out.push({gens});
    }
    return out;
  };
  const sf={dv,le,sampleStart,sampleEnd,presets,pbags,pgens,insts,ibags,igens,shdrs,zones};
  (sf.presets||[]).forEach((p,i)=>p.spans=buildSpans(sf,i));
  return sf;
}
function buildSpans(sf,pi){
  const p=sf.presets[pi];
  const pz=sf.zones(sf.pbags,sf.pgens,p.bag,p.bagEnd);
  const pg=(pz.find(z=>z.gens[41]===undefined)||{gens:{}}).gens;
  const spans=[];
  for(const z of pz){
    const instIdx=z.gens[41]; if(instIdx===undefined) continue;
    const ins=sf.insts[instIdx]; if(!ins) continue;
    const ibEnd=(instIdx+1<sf.insts.length)?sf.insts[instIdx+1].bag:sf.ibags.length;
    const iz=sf.zones(sf.ibags,sf.igens,ins.bag,ibEnd);
    const ig=(iz.find(z2=>z2.gens[53]===undefined)||{gens:{}}).gens;
    for(const z2 of iz){
      const sIdx=z2.gens[53]; if(sIdx===undefined) continue;
      const h=sf.shdrs[sIdx]; if(!h) continue;
      const G=Object.assign({},pg,ig,z2.gens);
      let lo=0,hi=127;
      if(G[43]!==undefined){lo=G[43]&0xFF;hi=(G[43]>>8)&0xFF;}
      if(z.gens[43]!==undefined){lo=Math.max(lo,z.gens[43]&0xFF);hi=Math.min(hi,(z.gens[43]>>8)&0xFF);}
      let vlo=0,vhi=127;
      if(G[44]!==undefined){vlo=G[44]&0xFF;vhi=(G[44]>>8)&0xFF;}
      const root=G[57]!==undefined?G[57]:h.origPitch;
      spans.push({lo,hi,vlo,vhi,sample:sIdx,
        root:(root>0&&root<=127)?root:60,
        coarse:G[51]!==undefined?sgn(G[51]):0,
        fine:G[52]!==undefined?sgn(G[52]):0,
        attack:tc2s(G[35]!==undefined?sgn(G[35]):-12000),
        hold:tc2s(G[36]!==undefined?sgn(G[36]):-12000),
        decay:tc2s(G[37]!==undefined?sgn(G[37]):-12000),
        sustain:G[38]!==undefined?sgn(G[38]):0,
        release:tc2s(G[39]!==undefined?sgn(G[39]):-12000),
        atten:G[48]!==undefined?sgn(G[48]):0,
        modes:G[54]||0,corr:h.pitchCorr});
    }
  }
  return spans;
}
function presetGlobalGens(sf,pi){
  const p=sf.presets[pi]; if(!p) return {};
  const pz=sf.zones(sf.pbags,sf.pgens,p.bag,p.bagEnd);
  const z=pz.find(z=>z.gens[41]===undefined);
  return z?z.gens:{};
}
function mkSpan(sf,G,sIdx){
  const h=sf.shdrs[sIdx]; if(!h) return null;
  let lo=0,hi=127;
  if(G[43]!==undefined){lo=G[43]&0xFF;hi=(G[43]>>8)&0xFF;}
  let vlo=0,vhi=127;
  if(G[44]!==undefined){vlo=G[44]&0xFF;vhi=(G[44]>>8)&0xFF;}
  const root=G[57]!==undefined?G[57]:h.origPitch;
  return {lo,hi,vlo,vhi,sample:sIdx,
    root:(root>0&&root<=127)?root:60,
    coarse:G[51]!==undefined?sgn(G[51]):0,
    fine:G[52]!==undefined?sgn(G[52]):0,
    attack:tc2s(G[35]!==undefined?sgn(G[35]):-12000),
    hold:tc2s(G[36]!==undefined?sgn(G[36]):-12000),
    decay:tc2s(G[37]!==undefined?sgn(G[37]):-12000),
    sustain:G[38]!==undefined?sgn(G[38]):0,
    release:tc2s(G[39]!==undefined?sgn(G[39]):-12000),
    atten:G[48]!==undefined?sgn(G[48]):0,
    modes:G[54]||0,corr:h.pitchCorr};
}
function buildSpansInst(sf,instIdx,base){
  const ins=sf.insts[instIdx]; if(!ins) return [];
  const ibEnd=(instIdx+1<sf.insts.length)?sf.insts[instIdx+1].bag:sf.ibags.length;
  const iz=sf.zones(sf.ibags,sf.igens,ins.bag,ibEnd);
  const out=[];
  for(const z2 of iz){
    const sIdx=z2.gens[53]; if(sIdx===undefined) continue;
    const sp=mkSpan(sf,Object.assign({},base||{},z2.gens),sIdx);
    if(sp) out.push(sp);
  }
  return out;
}
