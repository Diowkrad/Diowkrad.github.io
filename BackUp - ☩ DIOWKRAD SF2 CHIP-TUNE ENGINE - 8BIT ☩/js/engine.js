"use strict";

/* ============================================================
   ДИОКРАД SF2 ДВИЖОК v1.2.5 «ФИНАЛ» (ПРОД-МОНОЛИТ)
   Часть 1: Глобальное состояние, Web Audio API, Ядро 2A03
   ============================================================ */

const state = {
  mode: 'chip',
  chipVoice: 'pulse50',
  sf2: null,
  presetIdx: 0,
  instIdx: -1,
  instSpans: null,
  instSpansKey: '',
  sampleCache: new Map()
};

let audioCtx = null, master = null;
const activeChip = new Map(), activeSF2 = new Map(), activeMidi = new Map();
const $ = s => document.querySelector(s);
const LOG_MAX = 10;
const logLines = [];

function log(msg) {
  const el = $('#log'); 
  if (!el) return;
  logLines.unshift(msg); 
  if (logLines.length > LOG_MAX) logLines.length = LOG_MAX;
  el.textContent = '';
  for (const l of logLines) { 
    el.appendChild(document.createTextNode(l)); 
    el.appendChild(document.createElement('hr')); 
  }
}

function lcd(msg) { $('#lcd').textContent = msg; }

$('#vol').addEventListener('input', e => {
  if (master) master.gain.value = (+e.target.value) / 100;
});

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain(); 
    master.gain.value = (+$('#vol').value) / 100;
    
    /* Защита от щелчков: DC-блок -> статичный мягкий клиппер -> мягкий лимитер */
    const clipCurve = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) { 
      const x = (i / 1023.5) - 1, a = Math.abs(x);
      clipCurve[i] = Math.sign(x) * (a < 0.6 ? a : 0.6 + 0.35 * Math.tanh((a - 0.6) / 0.35)); 
    }
    const clip = audioCtx.createWaveShaper(); 
    clip.curve = clipCurve; 
    clip.oversample = '4x';
    
    const dcb = audioCtx.createBiquadFilter(); 
    dcb.type = 'highpass'; 
    dcb.frequency.value = 20;
    
    const limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -3; 
    limiter.knee.value = 12; 
    limiter.ratio.value = 6;
    limiter.attack.value = 0.02; 
    limiter.release.value = 0.3;
    
    master.connect(dcb); 
    dcb.connect(clip); 
    clip.connect(limiter); 
    limiter.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

const freqOf = k => 440 * Math.pow(2, (k - 69) / 12);
const tc2s = tc => Math.pow(2, (tc || 0) / 1200);
const sgn = v => v > 32767 ? v - 65536 : v;

/* ============ CHIP-ДВИЖОК 2A03 ============ */
const CPU_NTSC = 1789773;
const NTSC_NOISE =;
const CHIP_VOICES = [
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

const chipVoiceById = id => CHIP_VOICES.find(v => v.id === id);
const chipDutyWaves = {}, chipNoiseCache = new Map();
const DUTY_PAT = {0.5:[0,1,1,1,1,0,0,0],0.25:[0,1,1,0,0,0,0,0],0.125:[0,1,0,0,0,0,0,0]};

function dutyBuffer(d, f) {
  const k = 'd' + d + '@' + f.toFixed(2);
  if (chipDutyWaves[k]) return chipDutyWaves[k];
  const pat = DUTY_PAT[d] || DUTY_PAT[0.5];
  const N = Math.max(16, Math.round(audioCtx.sampleRate / f));
  const buf = audioCtx.createBuffer(1, N, audioCtx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < N; i++) ch[i] = pat[(i * 8 / N) | 0] ? (1 - d) : (-d);
  chipDutyWaves[k] = buf; 
  return buf;
}

function noiseBuffer(mode) {
  if (chipNoiseCache.has(mode)) return chipNoiseCache.get(mode);
  const steps = mode === 'short' ? 93 : 32767;
  const buf = audioCtx.createBuffer(1, steps, audioCtx.sampleRate);
  const ch = buf.getChannelData(0);
  let reg = 1;
  for (let i = 0; i < steps; i++) {
    const fb = (reg & 1) ^ ((reg >> 1) & 1);
    reg = (reg >> 1) | (fb << 14);
    if (mode === 'short') reg = (reg & ~(1 << 6)) | (fb << 6);
    ch[i] = (reg & 1) ? 1 : -1;
  }
  let mn = 0; for (let i = 0; i < steps; i++) mn += ch[i]; mn /= steps;
  for (let i = 0; i < steps; i++) ch[i] -= mn;
  chipNoiseCache.set(mode, buf); 
  return buf;
}

function roundedPulseBuffer(f) {
  const k = 'r' + f.toFixed(2);
  if (chipDutyWaves[k]) return chipDutyWaves[k];
  const N = Math.max(16, Math.round(audioCtx.sampleRate / f));
  const buf = audioCtx.createBuffer(1, N, audioCtx.sampleRate);
  const ch = buf.getChannelData(0);
  const R = Math.max(2, Math.round(N * 0.12));
  for (let i = 0; i < N; i++) {
    const p = i / N; let x;
    if (p < R / N) { const u = i / R; x = -1 + 2 * u * u * (3 - 2 * u); }
    else if (p < 0.5) x = 1;
    else x = -1;
    ch[i] = x;
  }
  let mn = 0; for (let i = 0; i < N; i++) mn += ch[i]; mn /= N;
  for (let i = 0; i < N; i++) ch[i] -= mn;
  chipDutyWaves[k] = buf; 
  return buf;
}

function nWaveBuffer(f) {
  const k = 'n' + f.toFixed(2);
  if (chipDutyWaves[k]) return chipDutyWaves[k];
  const N = Math.max(16, Math.round(audioCtx.sampleRate / f));
  const buf = audioCtx.createBuffer(1, N, audioCtx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < N; i++) {
    const p = i / N; let x;
    if (p < 1 / 3) x = -1 + 6 * p;
    else if (p < 2 / 3) x = 1 - 6 * (p - 1 / 3);
    else x = -1 + 6 * (p - 2 / 3);
    ch[i] = x;
  }
  chipDutyWaves[k] = buf; 
  return buf;
}

function chipKill(key) {
  const v = activeChip.get(key); 
  if (!v) return;
  const t = audioCtx.currentTime;
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setValueAtTime(v.g.gain.value || 0.0001, t);
  v.g.gain.setTargetAtTime(0, t, 0.01);
  v.nodes.forEach(n => { try { n.stop(t + 0.08); } catch (_) {} });
  activeChip.delete(key); 
  hl(key, false);
}

function chipOn(key, vel = 100) {
  ensureAudio();
  if (activeChip.has(key)) chipKill(key);
  const v = chipVoiceById(state.chipVoice) || CHIP_VOICES[0];
  const t = audioCtx.currentTime;
  const g = audioCtx.createGain();
  const peak = (v.nes ? 0.28 : 0.25) * Math.pow(vel / 127, 1.3);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.setTargetAtTime(peak * 0.35, t + 0.005, 0.08);
  const nodes = []; 
  let rate = null, info = '';
  
  if (v.noise) {
    const idx = Math.min(NTSC_NOISE.length - 1, Math.max(0, Math.floor((key - 24) * (NTSC_NOISE.length / 84))));
    const timer = NTSC_NOISE[idx];
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer(v.noise); 
    src.loop = true;
    const shift = CPU_NTSC / (2 * (timer + 1));
    rate = shift / audioCtx.sampleRate;
    
    // ИСПРАВЛЕНИЕ: Динамический старт шума с учетом текущего бенда
    const currentBend = (typeof bendCents !== 'undefined') ? bendCents : 0;
    src.playbackRate.setValueAtTime(rate * Math.pow(2, currentBend / 1200), t);
    
    src.connect(g); 
    src.start(t); 
    nodes.push(src);
    info = 'таймер=' + timer + ' (сдвиг ~' + shift.toFixed(0) + ' Гц)';
  } else {
    let div = 16, freq, osc, note;
    if (v.duty !== undefined) {
      note = key - 12;
      const period = Math.round(CPU_NTSC / (16 * freqOf(note)) - 1);
      if (period < 8) { g.disconnect(); log('PULSE: период ' + period + ' < 8 — канал молчит (как на 2A03).'); return; }
      freq = CPU_NTSC / (16 * (period + 1));
      osc = audioCtx.createBufferSource();
      osc.buffer = dutyBuffer(v.duty, freq); 
      osc.loop = true;
      osc.connect(g); 
      osc.start(t); 
      nodes.push(osc);
      rate = 1;
      info = 't=' + period + ' f=' + freq.toFixed(2) + ' Гц (-1 октава, паттерн 2A03)';
    } else if (v.type === 'sawtooth') {
      const period = Math.round(CPU_NTSC / (16 * freqOf(key)) - 1);
      if (period < 8) { g.disconnect(); log('SAW: период ' + period + ' < 8 — канал молчит.'); return; }
      freq = CPU_NTSC / (16 * (period + 1));
      osc = audioCtx.createOscillator();
      osc.type = 'sawtooth'; 
      osc.frequency.value = freq;
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; 
      lp.frequency.value = 6000;
      osc.connect(lp); 
      lp.connect(g); 
      osc.start(t); 
      nodes.push(osc);
      info = 't=' + period + ' f=' + freq.toFixed(2) + ' Гц';
    } else if (v.nes) {
      freq = freqOf(key);
      osc = audioCtx.createOscillator();
      osc.type = 'square'; 
      osc.frequency.value = freq;
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; 
      lp.frequency.value = 4000;
      osc.connect(lp); 
      lp.connect(g); 
      osc.start(t); 
      nodes.push(osc);
      info = 'f=' + freq.toFixed(2) + ' Гц (схема NES-PIANO, lowpass 4 кГц)';
    } else if (v.round) {
      note = key - 12;
      const period = Math.round(CPU_NTSC / (16 * freqOf(note)) - 1);
      if (period < 8) { g.disconnect(); log('PULSE-R: период ' + period + ' < 8 — канал молчит (как на 2A03).'); return; }
      freq = CPU_NTSC / (16 * (period + 1));
      osc = audioCtx.createBufferSource();
      osc.buffer = roundedPulseBuffer(freq); 
      osc.loop = true;
      osc.connect(g); 
      osc.start(t); 
      nodes.push(osc);
      rate = 1;
      info = 't=' + period + ' f=' + freq.toFixed(2) + ' Гц (-1 октава, скруглённый фронт)';
    } else if (v.nwave) {
      freq = freqOf(key);
      osc = audioCtx.createBufferSource();
      osc.buffer = nWaveBuffer(freq); 
      osc.loop = true;
      osc.connect(g); 
      osc.start(t); 
      nodes.push(osc);
      rate = 1;
      info = 'f=' + freq.toFixed(2) + ' Гц (N-волна, два зубца)';
    } else {
      div = 32;
Используйте код с осторожностью.
const period = Math.round(CPU_NTSC / (32 * freqOf(key)) - 1);
if (period < 1) { g.disconnect(); log('CH: период ' + period + ' — вне диапазона чипа.'); return; }
freq = CPU_NTSC / (32 * (period + 1));
osc = audioCtx.createOscillator();
osc.type = v.type;
osc.frequency.value = freq;
osc.connect(g);
osc.start(t);
nodes.push(osc);
info = 't=' + period + ' f=' + freq.toFixed(2) + ' Гц';
}
}
g.connect(master);
activeChip.set(key, {
g, nodes, rate,
bend: c => {
nodes.forEach(n => {
try {
if (n.detune) n.detune.value = c;
else if (rate !== null) n.playbackRate.value = rate * Math.pow(2, c / 1200);
} catch (_) {}
});
}
});
hl(key, true);
log('CHIP: нота ' + key + ' [' + v.name + '] ' + info);
}
function chipOff(key) {
const v = activeChip.get(key);
if (!v) return;
const t = audioCtx.currentTime;
v.g.gain.cancelScheduledValues(t);
v.g.gain.setValueAtTime(v.g.gain.value || 0.0001, t);
v.g.gain.setTargetAtTime(0, t, 0.05);
v.nodes.forEach(n => { try { n.stop(t + 0.4); } catch () {} });
activeChip.delete(key);
hl(key, false);
setTimeout(() => { try { v.g.disconnect(); } catch () {} }, 450);
}
const REC = { phdr: 38, pbag: 4, pmod: 4, inst: 22, ibag: 4, igen: 4, shdr: 46 };

function parseSF2(buf) {
  const N = buf.byteLength;
  if (N < 64) throw new Error('файл слишком мал (' + N + ' байт)');
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  const str = (o, n) => {
    let t = '';
    for (let i = 0; i < n && o + i < N; i++) {
      const c = u8[o + i];
      if (c < 32 || c > 126) break;
      t += String.fromCharCode(c);
    }
    return t;
  };
  const head = str(0, 4);
  if (head !== 'RIFF' && head !== 'RIFX')
    throw new Error('это не SoundFont2: сигнатура "' + head + '"');
  const le = (head !== 'RIFX');
  const u32 = o => (o >= 0 && o + 4 <= N) ? dv.getUint32(o, le) : 0;
  const u16 = o => (o >= 0 && o + 2 <= N) ? dv.getUint16(o, le) : 0;
  const s16 = o => (o >= 0 && o + 2 <= N) ? dv.getInt16(o, le) : 0;
  const found = {};

  /* --- уровень 1: структурный обход с спуском в RIFF/LIST (ЗАЩИЩЕННЫЙ) --- */
  const walk = (from, to, depth) => {
    if (depth > 10) return;
    let p = from;
    while (p + 8 <= to) {
      const cid = str(p, 4), cs = u32(p + 4);
      
      // ИСПРАВЛЕНИЕ: Строгая защита от переполнения памяти и битых размеров
      if (cs < 0 || cs > (N - p - 8)) { 
        const rest = Math.max(0, to - (p + 8));
        if (cid && !found[cid] && cid !== 'LIST' && cid !== 'RIFF' && cid !== 'RIFX') {
          found[cid] = { start: p + 8, size: rest };
        }
        break; 
      }
      
      if (cid === 'LIST' || cid === 'RIFF' || cid === 'RIFX') {
        const inner = p + 12, end = Math.min(p + 8 + cs, N);
        if (cs >= 4) walk(inner, end, depth + 1);
        p = end; 
        if (cs % 2) p++;
      } else {
        if (!found[cid]) found[cid] = { start: p + 8, size: cs };
        const step = 8 + cs + (cs % 2);
        if (step <= 8) break; // Предохранитель от нулевого шага
        p += step;
      }
      if (p <= from) break; 
    }
  };
  walk(12, N, 0);

  /* --- уровень 2: сигнатурный поиск --- */
  const req = ['phdr', 'pbag', 'pmod', 'inst', 'ibag', 'imap', 'igen', 'shdr'];
  const need = req.filter(id => !found[id]);
  if (need.length) {
    for (const id of need) {
      const a = id.charCodeAt(0), b = id.charCodeAt(1), c = id.charCodeAt(2), d = id.charCodeAt(3);
      let best = -1, bestScore = -1, bestSize = 0;
      const rec = REC[id] || 0;
      for (let i = 0; i + 12 <= N; i++) {
        if (u8[i] !== a || u8[i + 1] !== b || u8[i + 2] !== c || u8[i + 3] !== d) continue;
        const cs = u32(i + 4);
        if (cs <= 0 || i + 8 + cs > N) continue;
        const even = (cs % rec) === 0;
        const score = (even ? 1e12 : 0) + i;
        if (score >= bestScore) { best = i; bestScore = score; bestSize = cs; }
      }
      if (best >= 0) found[id] = { start: best + 8, size: bestSize };
    }
  }

  let sampleStart = 0, sampleEnd = N;
  if (found['smpl']) {
    sampleStart = found['smpl'].start;
    sampleEnd = Math.min(sampleStart + found['smpl'].size, N);
  } else {
    let best = -1, bestSize = 0;
    const a = 115, b = 109, c = 112, d = 108;
    for (let i = 0; i + 12 <= N; i++) {
      if (u8[i] !== a || u8[i + 1] !== b || u8[i + 2] !== c || u8[i + 3] !== d) continue;
      const cs = u32(i + 4);
      if (cs <= 0 || i + 8 + cs > N) continue;
      if (cs > bestSize) { best = i; bestSize = cs; }
    }
    if (best >= 0) { sampleStart = best + 8; sampleEnd = best + 8 + bestSize; }
  }

  if (found['ifil']) {
    const maj = u16(found['ifil'].start);
    if (maj >= 3) log('ПРЕДУПРЕЖДЕНИЕ: банк SF3 (сжатые сэмплы) — звук будет шумом, нужен SF2');
  }
  const miss = ['phdr', 'pbag', 'inst', 'ibag', 'igen', 'shdr'].filter(id => !found[id]);
  if (miss.length)
    throw new Error('в банке нет чанков: ' + miss.join(', ') + ' | найдены: ' + Object.keys(found).join(', '));

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const phdrN = Math.floor(found['phdr'].size / 38);
  const pbagN = Math.floor(found['pbag'].size / 4);
  const pgenN = found['pgen'] ? Math.floor(found['pgen'].size / 4) : 0;
  const instN = Math.floor(found['inst'].size / 22);
  const ibagN = Math.floor(found['ibag'].size / 4);
  const igenN = Math.floor(found['igen'].size / 4);
  const shdrN = Math.floor(found['shdr'].size / 46);
  if (phdrN < 2) throw new Error('phdr пуст (' + phdrN + ' записей)');

  const pbags = [], pgens = [], insts = [], ibags = [], igens = [], shdrs = [], presets = [];
  for (let i = 0; i < pbagN; i++) pbags.push({ gi: u16(found['pbag'].start + i * 4) });
  for (let i = 0; i < pgenN; i++) pgens.push({ op: u16(found['pgen'].start + i * 4), amt: u16(found['pgen'].start + i * 4 + 2) });
  for (let i = 0; i < instN; i++) {
    const o = found['inst'].start + i * 22;
    insts.push({ name: str(o, 20), bag: u16(o + 20) });
  }
  for (let i = 0; i < ibagN; i++) ibags.push({ gi: u16(found['ibag'].start + i * 4) });
  for (let i = 0; i < igenN; i++) igens.push({ op: u16(found['igen'].start + i * 4), amt: u16(found['igen'].start + i * 4 + 2) });
  
  for (let i = 0; i < shdrN; i++) {
    const o = found['shdr'].start + i * 46;
    let sr = u32(o + 36); if (sr < 8000 || sr > 96000) sr = 44100;
    shdrs.push({
      name: str(o, 20), start: u32(o + 20), end: u32(o + 24),
      startLoop: u32(o + 28), endLoop: u32(o + 32), sampleRate: sr,
      origPitch: u8[o + 40], pitchCorr: (u8[o + 41] > 127 ? u8[o + 41] - 256 : u8[o + 41])
    });
  }
  for (let i = 0; i < phdrN - 1; i++) {
    const o = found['phdr'].start + i * 38;
    presets.push({
      name: str(o, 20), preset: u16(o + 20), bank: u16(o + 22),
      bag: u16(o + 24), bagEnd: u16(found['phdr'].start + (i + 1) * 38 + 24)
    });
  }

  const zones = (bagArr, genArr, b0, b1) => {
    b0 = clamp(b0 | 0, 0, bagArr.length);
    b1 = clamp(b1 | 0, b0, bagArr.length);
    const out = [];
    for (let b = b0; b < b1; b++) {
      const g0 = clamp(bagArr[b].gi | 0, 0, genArr.length);
      const g1 = clamp(b + 1 < bagArr.length ? bagArr[b + 1].gi | 0 : genArr.length, g0, genArr.length);
      const gens = {};
      for (let g = g0; g < g1; g++) gens[genArr[g].op] = genArr[g].amt;
      out.push({ gens });
    }
    return out;
  };

  const sf = { dv, le, sampleStart, sampleEnd, presets, pbags, pgens, insts, ibags, igens, shdrs, zones };
  (sf.presets || []).forEach((p, i) => p.spans = buildSpans(sf, i));
  return sf;
}

function buildSpans(sf, pi) {
  const p = sf.presets[pi];
  const pz = sf.zones(sf.pbags, sf.pgens, p.bag, p.bagEnd);
  const pg = (pz.find(z => z.gens[41] === undefined) || { gens: {} }).gens;
  const spans = [];
  for (const z of pz) {
    const instIdx = z.gens[41]; if (instIdx === undefined) continue;
    const ins = sf.insts[instIdx]; if (!ins) continue;
    const ibEnd = (instIdx + 1 < sf.insts.length) ? sf.insts[instIdx + 1].bag : sf.ibags.length;
    const iz = sf.zones(sf.ibags, sf.igens, ins.bag, ibEnd);
    const ig = (iz.find(z2 => z2.gens[53] === undefined) || { gens: {} }).gens;
    for (const z2 of iz) {
      const sIdx = z2.gens[53]; if (sIdx === undefined) continue;
      const h = sf.shdrs[sIdx]; if (!h) continue;
      const G = Object.assign({}, pg, ig, z2.gens);
      let lo = 0, hi = 127;
      if (G[43] !== undefined) { lo = G[43] & 0xFF; hi = (G[43] >> 8) & 0xFF; }
      if (z.gens[43] !== undefined) { lo = Math.max(lo, z.gens[43] & 0xFF); hi = Math.min(hi, (z.gens[43] >> 8) & 0xFF); }
      let vlo = 0, vhi = 127;
      if (G[44] !== undefined) { vlo = G[44] & 0xFF; vhi = (G[44] >> 8) & 0xFF; }
      const root = G[57] !== undefined ? G[57] : h.origPitch;
      spans.push({
        lo, hi, vlo, vhi, sample: sIdx,
        root: (root > 0 && root <= 127) ? root : 60,
        coarse: G[51] !== undefined ? sgn(G[51]) : 0,
        fine: G[52] !== undefined ? sgn(G[52]) : 0,
        attack: tc2s(G[35] !== undefined ? sgn(G[35]) : -12000),
        hold: tc2s(G[36] !== undefined ? sgn(G[36]) : -12000),
        decay: tc2s(G[37] !== undefined ? sgn(G[37]) : -12000),
        sustain: G[38] !== undefined ? sgn(G[38]) : 0,
        release: tc2s(G[39] !== undefined ? sgn(G[39]) : -12000),
        atten: G[48] !== undefined ? sgn(G[48]) : 0,
        modes: G[54] || 0, corr: h.pitchCorr
      });
    }
  }
  return spans;
}

function presetGlobalGens(sf, pi) {
  const p = sf.presets[pi]; if (!p) return {};
  const pz = sf.zones(sf.pbags, sf.pgens, p.bag, p.bagEnd);
  const z = pz.find(z => z.gens[41] === undefined);
  return z ? z.gens : {};
}

function mkSpan(sf, G, sIdx) {
  const h = sf.shdrs[sIdx]; if (!h) return null;
  let lo = 0, hi = 127;
  if (G[43] !== undefined) { lo = G[43] & 0xFF; hi = (G[43] >> 8) & 0xFF; }
  let vlo = 0, vhi = 127;
  if (G[44] !== undefined) { vlo = G[44] & 0xFF; vhi = (G[44] >> 8) & 0xFF; }
  const root = G[57] !== undefined ? G[57] : h.origPitch;
  return {
    lo, hi, vlo, vhi, sample: sIdx,
    root: (root > 0 && root <= 127) ? root : 60,
    coarse: G[51] !== undefined ? sgn(G[51]) : 0,
    fine: G[52] !== undefined ? sgn(G[52]) : 0,
    attack: tc2s(G[35] !== undefined ? sgn(G[35]) : -12000),
    hold: tc2s(G[36] !== undefined ? sgn(G[36]) : -12000),
    decay: tc2s(G[37] !== undefined ? sgn(G[37]) : -12000),
    sustain: G[38] !== undefined ? sgn(G[38]) : 0,
    release: tc2s(G[39] !== undefined ? sgn(G[39]) : -12000),
    atten: G[48] !== undefined ? sgn(G[48]) : 0,
    modes: G[54] || 0, corr: h.pitchCorr
  };
}

function buildSpansInst(sf, instIdx, base) {
  const ins = sf.insts[instIdx]; if (!ins) return [];
  const ibEnd = (instIdx + 1 < sf.insts.length) ? sf.insts[instIdx + 1].bag : sf.ibags.length;
  const iz = sf.zones(sf.ibags, sf.igens, ins.bag, ibEnd);
  const out = [];
Используйте код с осторожностью.
for (const z2 of iz) {
const sIdx = z2.gens[53]; if (sIdx === undefined) continue;
const sp = mkSpan(sf, Object.assign({}, base || {}, z2.gens), sIdx);
if (sp) out.push(sp);
}
return out;
}
/* ============ ВОСПРОИЗВЕДЕНИЕ SF2 ============ */
const VOICE_MAX = 32;
function getBuffer(sf, sIdx) {
if (state.sampleCache.has(sIdx)) return state.sampleCache.get(sIdx);
const h = sf.shdrs[sIdx];
let len = Math.max(0, h.end - h.start);
const avail = Math.floor((sf.sampleEnd - sf.sampleStart) / 2);
len = Math.min(len, Math.max(0, avail - h.start));
if (len <= 0) { state.sampleCache.set(sIdx, null); return null; }
const ab = audioCtx.createBuffer(1, len, h.sampleRate);
const data0 = ab.getChannelData(0);
for (let i = 0; i < len; i++) data0[i] = sf.dv.getInt16(sf.sampleStart + (h.start + i) * 2, sf.le) / 32768;
let entry = { buffer: ab, loopStart: null, loopEnd: null };
if (h.startLoop < h.endLoop && h.startLoop >= h.start && h.endLoop <= h.start + len) {
entry.loopStart = (h.startLoop - h.start) / h.sampleRate;
entry.loopEnd = (h.endLoop - h.start) / h.sampleRate;
}
state.sampleCache.set(sIdx, entry);
return entry;
}
function sfOn(key, vel = 100) {
ensureAudio();
const sf = state.sf2;
if (!sf) { log('Банк не загружен — играет CHIP.'); chipOn(key, vel); return; }
const old = activeSF2.get(key);
if (old) {
const t0 = audioCtx.currentTime;
try { old.g.gain.cancelScheduledValues(t0); old.g.gain.setTargetAtTime(0, t0, 0.01); old.src.stop(t0 + 0.1); } catch (_) {}
activeSF2.delete(key);
}
if (activeSF2.size >= VOICE_MAX) { const k0 = activeSF2.keys().next().value; sfOff(k0); }
const p = sf.presets[state.presetIdx];
let spans = null;
if (state.instIdx >= 0 && sf.insts[state.instIdx]) {
const kk = state.presetIdx + ':' + state.instIdx;
if (state.instSpansKey !== kk) { state.instSpans = buildSpansInst(sf, state.instIdx, presetGlobalGens(sf, state.presetIdx)); state.instSpansKey = kk; }
spans = state.instSpans;
if (!spans.length) { log('Инструмент №' + state.instIdx + ' без сэмпловых зон — играет CHIP.'); chipOn(key, vel); return; }
} else {
if (!p) { log('Пресет не выбран — играет CHIP.'); chipOn(key, vel); return; }
spans = p.spans;
if (!spans.length) { log('Пресет пуст (0 зон) — играет CHIP.'); chipOn(key, vel); return; }
}
let span = spans.find(s => key >= s.lo && key <= s.hi && vel >= s.vlo && vel <= s.vhi);
if (!span) span = spans.find(s => key >= s.lo && key <= s.hi);
if (!span) {
const los = Math.min(...spans.map(s => s.lo)), his = Math.max(...spans.map(s => s.hi));
log('Нота ' + key + ' вне диапазона [' + los + '–' + his + '] — играет CHIP.');
chipOn(key, vel); return;
}
const entry = getBuffer(sf, span.sample);
if (!entry) { log('Сэмпл ' + span.sample + ' пуст — играет CHIP.'); chipOn(key, vel); return; }
const src = audioCtx.createBufferSource();
src.buffer = entry.buffer;
const cents = (key - span.root) * 100 + span.corr + span.coarse * 100 + span.fine + bendCents;
src.playbackRate.value = Math.pow(2, cents / 1200);
if (entry.loopStart !== null && (span.modes === 1 || span.modes === 3)) {
src.loop = true; src.loopStart = entry.loopStart; src.loopEnd = entry.loopEnd;
}
const g = audioCtx.createGain(), t = audioCtx.currentTime;
const A = Math.max(span.attack, 0.002), H = Math.max(span.hold, 0);
const D = Math.max(span.decay, 0.01);
const peak = Math.min(0.9, Math.pow(vel / 127, 1.5) * Math.pow(10, -Math.max(0, span.atten) / 200) * 0.9);
const sus = Math.min(1, Math.max(0.0005, Math.pow(10, -Math.abs(span.sustain) / 200)));
g.gain.setValueAtTime(0, t);
g.gain.linearRampToValueAtTime(peak, t + A);
g.gain.setValueAtTime(peak, t + A+H);
g.gain.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0005), t + A + H + D);
src.connect(g); g.connect(master); src.start(t);
activeSF2.set(key, { src, g, rel: Math.max(span.release, 0.02), rate: src.playbackRate.value });
hl(key, true);
}
function sfOff(key) {
const v = activeSF2.get(key); if (!v) return false;
const t = audioCtx.currentTime;
v.g.gain.cancelScheduledValues(t);
v.g.gain.setValueAtTime(v.g.gain.value || 0.0001, t);
v.g.gain.setTargetAtTime(0, t, v.rel / 3);
v.src.stop(t + v.rel * 2);
activeSF2.delete(key); hl(key, false);
setTimeout(() => { try { v.g.disconnect(); } catch (_) {} }, Math.round(v.rel * 2 * 1000) + 50);
}
/* ============ СУСТЕЙН И ТЕМП ============ */
const SUSTAIN_MODES = { '1/8': { gate: 250, tail: 900 }, '1/4': { gate: 500, tail: 700 }, '1/2': { gate: 700, tail: 500 } };
let susMode = '';
const susTimers = new Map();
let bpm = 120;
const killTimers = new Map();
function susDecay(key) {
const md = SUSTAIN_MODES[susMode] || SUSTAIN_MODES['1/8'];
if (!audioCtx) return;
const t = audioCtx.currentTime, tau = md.tail / 4000;
const vC = activeChip.get(key);
if (vC) {
try { vC.g.gain.cancelScheduledValues(t); } catch () {}
vC.g.gain.setValueAtTime(vC.g.gain.value || 0.0001, t);
vC.g.gain.setTargetAtTime(0, t, tau);
vC.nodes.forEach(n => { try { n.stop(t + md.tail / 1000); } catch () {} });
activeChip.delete(key);
setTimeout(() => { try { vC.g.disconnect(); } catch (_) {} }, md.tail + 50);
}
const vS = activeSF2.get(key);
if (vS) {
try { vS.g.gain.cancelScheduledValues(t); } catch () {}
vS.g.gain.setValueAtTime(vS.g.gain.value || 0.0001, t);
vS.g.gain.setTargetAtTime(0, t, tau);
try { vS.src.stop(t + md.tail / 1000); } catch () {}
activeSF2.delete(key);
setTimeout(() => { try { vS.g.disconnect(); } catch (_) {} }, md.tail + 50);
}
const vM = activeMidi.get(key);
if (vM) {
try { vM.g.gain.cancelScheduledValues(t); } catch () {}
vM.g.gain.setValueAtTime(vM.g.gain.value || 0.0001, t);
vM.g.gain.setTargetAtTime(0, t, tau);
vM.nodes.forEach(n => { try { n.stop(t + md.tail / 1000); } catch () {} });
activeMidi.delete(key);
setTimeout(() => { try { vM.g.disconnect(); } catch (_) {} }, md.tail + 50);
}
updVoices();
}
function susCancel(key) {
const s = susTimers.get(key);
if (s) { clearTimeout(s.relT); clearTimeout(s.hlT); susTimers.delete(key); }
}
function susClearAll() {
for (const [k, s] of susTimers) { clearTimeout(s.relT); clearTimeout(s.hlT); hl(k, false); }
susTimers.clear();
}
function ceilingKill(k) {
killTimers.delete(k);
if (!activeChip.has(k) && !activeSF2.has(k) && !activeMidi.has(k)) return;
susDecay(k); susCancel(k); hl(k, false);
log('Потолок ноты: нота ' + k + ' заглушена — прозвучала 1 целую (' + bpm + ' BPM).');
}
function clearCeiling(k) { const t = killTimers.get(k); if (t) { clearTimeout(t); killTimers.delete(k); } }
function scheduleCeiling(k) { clearCeiling(k); killTimers.set(k, setTimeout(() => ceilingKill(k), 240000 / bpm)); }
function susSchedule(key) {
const now = performance.now();
const v = activeChip.get(key) || activeSF2.get(key) || activeMidi.get(key);
const st = (v && v.st) || now;
const md = SUSTAIN_MODES[susMode];
const rem = Math.max(0, st + md.gate - now);
const relT = setTimeout(() => { susDecay(key); }, rem);
const hlT = setTimeout(() => { hl(key, false); susTimers.delete(key); }, rem + md.tail);
susTimers.set(key, { relT, hlT });
updVoices();
}
function hardOff(k) {
const wasMidi = state.mode === 'midi' ? midiOff(k) : false;
const wasSF2 = state.mode === 'sf2' ? sfOff(k) : false;
if (!wasMidi && !wasSF2) chipOff(k);
}
function setSusMode(mode) {
susMode = mode;
[['susBtn8', '1/8'], ['susBtn4', '1/4'], ['susBtn2', '1/2']].forEach(([id, m]) => {
const b = document.getElementById(id); if (b) b.classList.toggle('on', mode === m);
});
if (!mode) { susClearAll(); log('Сустейн выключен.'); return; }
// ИСПРАВЛЕНИЕ: Изолированная копия снимка ключей для исключения сбоя итератора Map
const now = performance.now();
const keysToUpdate = Array.from(susTimers.keys());
for (const k of keysToUpdate) {
const s = susTimers.get(k); if (!s) continue;
clearTimeout(s.relT); clearTimeout(s.hlT);
const v = activeChip.get(k) || activeSF2.get(k) || activeMidi.get(k);
const st = (v && v.st) || now;
const rem = Math.max(0, st + SUSTAIN_MODES[mode].gate - now);
susTimers.set(k, {
relT: setTimeout(() => { susDecay(k); }, rem),
hlT: setTimeout(() => { hl(k, false); susTimers.delete(k); }, rem + SUSTAIN_MODES[mode].tail)
});
}
log('Сустейн: ' + mode + ' — нота поёт после отпускания, затем затухание.');
}
/* ============ ТУШЕ И ЧУВСТВИТЕЛЬНОСТЬ ============ */
const SENS_MODES = { soft:, hard:, fixed: [80, 80] };
let sensMode = 'hard';
function applySens(relY) {
if (sensMode === 'fixed') return 80;
const [lo, hi] = SENS_MODES[sensMode];
const t = Math.min(1, Math.max(0, relY));
const curve = (sensMode === 'hard') ? t * t : Math.pow(t, 1.6);
return Math.round(lo + (hi - lo) * curve);
}
function setSensMode(m) {
sensMode = m;
$('#sensSoft').classList.toggle('on', m === 'soft');
$('#sensHard').classList.toggle('on', m === 'hard');
$('#sensFixed').classList.toggle('on', m === 'fixed');
log('ТУШЕ: ' + m.toUpperCase() + (m === 'soft' ? ' — мягкий диапазон 40–65%' : (m === 'hard' ? ' — полный диапазон 1–100%' : ' — фиксированные 80%')));
}
function noteOn(k, v) {
susCancel(k);
state.mode === 'midi' ? midiOn(k, v) : state.mode === 'sf2' ? sfOn(k, v) : chipOn(k, v);
const nv = activeChip.get(k) || activeSF2.get(k) || activeMidi.get(k);
if (nv) nv.st = performance.now();
scheduleCeiling(k);
}
function noteOff(k) {
clearCeiling(k);
if (susMode) { susSchedule(k); return; }
hardOff(k);
}
/* ============================================================
   ДИОКРАД SF2 ДВИЖОК v1.2.5 «ФИНАЛ» (ПРОД-МОНОЛИТ)
   Часть 3: MIDI GM Синтезатор, Мышь и Клавиатура ПК, Инициализация системы
   ============================================================ */

/* ============ MIDI GM × 128 — СИНТЕЗ ПО РЕЦЕПТАМ ============ */
const GMN=["Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano", "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavinet", "Celesta", "Glockenspiel", "Music Box", "Vibraphone", "Marimba", "Xylophone", "Tubular Bells", "Dulcimer", "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ", "Reed Organ", "Accordion", "Harmonica", "Tango Accordion", "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)", "Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics", "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass", "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2", "Violin", "Viola", "Cello", "Contrabass", "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani", "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2", "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit", "Trumpet", "Trombone", "Tuba", "Muted Trumpet", "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2", "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax", "Oboe", "English Horn", "Bassoon", "Clarinet", "Piccolo", "Flute", "Recorder", "Pan Flute", "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina", "Square Lead", "Saw Lead", "Calliope Lead", "Chiff Lead", "Charang", "Voice Lead", "Fifth Saw Lead", "Bass & Lead", "New Age Pad", "Warm Pad", "Polysynth Pad", "Choir Pad", "Bowed Pad", "Metallic Pad", "Halo Pad", "Sweep Pad", "Rain", "Soundtrack", "Crystal", "Atmosphere", "Brightness", "Goblins", "Echoes", "Sci-Fi", "Sitar", "Banjo", "Shamisen", "Koto", "Kalimba", "Bagpipe", "Fiddle", "Shanai", "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock", "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal", "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet", "Telephone Ring", "Helicopter", "Applause", "Gunshot"];
const FAMS_RNG=[[0, "Piano"], [8, "Chromatic Percussion"], [16, "Organ"], [24, "Guitar"], [32, "Bass"], [40, "Strings"], [48, "Ensemble"], [56, "Brass"], [64, "Reed"], [72, "Pipe"], [80, "Synth Lead"], [88, "Synth Pad"], [96, "Synth Effects"], [104, "Ethnic"], [112, "Percussive"], [120, "Sound Effects"]];
Используйте код с осторожностью.
const R={"0":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.004,"d":1.0,"s":0,"r":0.165,"cut":7500,"br":1},"1":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.004,"d":0.9,"s":0,"r":0.165,"cut":9000,"br":1},"2":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.006,"d":1.0,"s":0,"r":0.165,"cut":6500,"br":1},"3":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.004,"d":1.0,"s":0,"r":0.165,"cut":5500,"br":1,"lvl":0.85},"4":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12]],"a":0.004,"d":1.0,"s":0,"r":0.165,"cut":5200,"br":1},"5":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.2],[6,0.12]],"a":0.004,"d":1.0,"s":0,"r":0.165,"cut":5600,"br":1},"6":{"w":"triangle","p":[[1,1],[2,0.6],[3,0.28],[4,0.12],[5,0.06],[6,0.03]],"a":0.004,"d":0.6,"s":0,"r":0.165,"cut":7000,"br":1},"7":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.004,"d":0.7,"s":0,"r":0.165,"cut":5200,"br":1},"8":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"9":{"w":"sine","p":[[1,1],[4,0.3]],"a":0.002,"d":1.1,"s":0,"r":0.1375,"cut":9500,"br":1},"10":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"11":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"12":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"13":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"14":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":1.6,"s":0,"r":0.22,"cut":9000,"br":1},"15":{"w":"sine","p":[[1,1],[2.76,0.32],[5.4,0.15]],"a":0.002,"d":0.9,"s":0,"r":0.1375,"cut":9000,"br":1},"16":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"17":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"18":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"19":{"w":"sine","p":[[1,1],[2,0.55],[3,0.4],[4,0.3],[6,0.22],[8,0.16]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":7000},"20":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"21":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"22":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"23":{"w":"sine","p":[[1,1],[2,0.5],[3,0.33],[4,0.25],[6,0.16],[8,0.1]],"a":0.02,"d":0.12,"s":1,"r":0.165,"cut":8000},"24":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"25":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"26":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"27":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"28":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"29":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"30":{"w":"square","p":[[1,1],[2,0.6]],"a":0.003,"d":0.8,"s":0,"r":0.154,"cut":3000,"br":1,"noise":0.3},"31":{"w":"triangle","p":[[1,1],[2,0.45],[3,0.2],[4,0.08]],"a":0.003,"d":0.9,"s":0,"r":0.154,"cut":6500,"br":1},"32":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"33":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"34":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"35":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"36":{"w":"square","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.003,"d":0.3,"s":0.1,"r":0.154,"cut":2400,"br":0.6},"37":{"w":"square","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.35,"s":0.1,"r":0.154,"cut":2600,"br":0.6},"38":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"39":{"w":"triangle","p":[[1,1],[2,0.5],[3,0.18],[4,0.06]],"a":0.004,"d":0.7,"s":0.25,"r":0.154,"cut":3200,"br":0.6},"40":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"41":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"42":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"43":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"44":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"45":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.15,"s":0.8,"r":0.11,"cut":4200,"br":0.6,"det":7},"46":{"w":"sawtooth","p":[[1,1],[2,0.4]],"a":0.09,"d":0.2,"s":0.8,"r":0.1925,"cut":4200,"br":0.6,"det":7},"47":{"w":"sawtooth","p":[[1,1]],"a":0.09,"d":1.2,"s":0.15,"r":0.22,"cut":3000,"br":0.6,"det":7,"noise":0.6,"lvl":0.9},"48":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"49":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"50":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"51":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"52":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.22]],"a":0.35,"d":0.18,"s":0.9,"r":0.33,"cut":3800,"det":14,"br":0.7},"53":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"54":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"55":{"w":"sawtooth","p":[[1,1],[2,0.35],[3,0.2]],"a":0.06,"d":0.18,"s":0.75,"r":0.176,"cut":5000,"det":9,"br":0.7},"56":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.03,"d":0.15,"s":0.6,"r":0.154,"cut":3800,"br":0.8},"57":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"58":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"59":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.75,"r":0.154,"cut":3800,"br":0.8},"60":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"61":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.05,"d":0.15,"s":0.75,"r":0.154,"cut":3800,"br":0.8},"62":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"63":{"w":"sawtooth","p":[[1,1],[2,0.5],[3,0.25]],"a":0.035,"d":0.15,"s":0.7,"r":0.154,"cut":3800,"br":0.8},"64":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"65":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"66":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"67":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"68":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"69":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"70":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"71":{"w":"sawtooth","p":[[1,1],[2,0.45],[3,0.22],[4,0.1]],"a":0.02,"d":0.12,"s":0.75,"r":0.143,"cut":4400,"br":0.8},"72":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"73":{"w":"sine","p":[[1,1],[2,0.15],[3,0.05]],"a":0.03,"d":0.1,"s":0.9,"r":0.165,"cut":6500},"74":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"75":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"76":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"77":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"78":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"79":{"w":"sine","p":[[1,1],[2,0.4],[3,0.18],[4,0.08]],"a":0.03,"d":0.1,"s":1,"r":0.165,"cut":7000},"80":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"81":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"82":{"w":"square","p":[[1,1],[2,0.45],[3,0.3]],"a":0.01,"d":0.1,"s":0.75,"r":0.1375,"cut":5200,"br":1},"83":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"84":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"85":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"86":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"87":{"w":"square","p":[[1,1],[2,0.5]],"a":0.01,"d":0.1,"s":0.7,"r":0.1375,"cut":5200,"br":1},"88":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"89":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"90":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.
28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"91":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.4,"d":0.3,"s":0.92,"r":0.385,"cut":3200,"det":16,"br":0.5},"92":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"93":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"94":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"95":{"w":"sawtooth","p":[[1,1],[2,0.4],[3,0.18]],"a":0.28,"d":0.3,"s":0.9,"r":0.3025,"cut":3600,"det":12,"br":0.5},"96":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"97":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"98":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"99":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"100":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"101":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"102":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"103":{"w":"square","p":[[1,1],[2,0.7],[3,0.4]],"a":0.05,"d":0.25,"s":0.6,"r":0.1925,"cut":4200,"br":0.8},"104":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"105":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"106":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"107":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"108":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"109":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0.85,"r":0.165,"cut":6000,"br":1,"noise":0.25,"det":10},"110":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"111":{"w":"triangle","p":[[1,1],[2,0.35],[3,0.12],[4.2,0.08]],"a":0.003,"d":1.1,"s":0,"r":0.165,"cut":6000,"br":1},"112":{"w":"sine","p":[[1,1]],"a":0.002,"d":0.7,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"113":{"w":"sine","p":[[1,1]],"a":0.002,"d":0.7,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"114":{"w":"sine","p":[[1,1],[2.8,0.3]],"a":0.002,"d":0.8,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"115":{"w":"sine","p":[[1,1]],"a":0.002,"d":0.7,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"116":{"w":"sine","p":[[1,1],[2,0.3]],"a":0.002,"d":0.5,"s":0,"r":0.1375,"cut":2600,"noise":1,"br":0.9,"lvl":1.1},"117":{"w":"sine","p":[[1,1]],"a":0.002,"d":0.7,"s":0,"r":0.1375,"cut":5000,"noise":0.5,"br":0.9},"118":{"w":"square","p":[[1,1],[2,0.5]],"a":0.002,"d":0.4,"s":0,"r":0.1375,"cut":5000,"noise":0.4,"br":0.9},"119":{"w":"sine","p":[[1,1]],"a":0.4,"d":0.3,"s":0.7,"r":0.33,"cut":6000,"noise":1,"br":0.9},"120":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"121":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"122":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"123":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"124":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"125":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"126":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.005,"d":0.8,"s":0,"r":0.1375,"cut":5000},"127":{"w":"sine","p":[[1,1],[2,0.5]],"a":0.002,"d":0.12,"s":0,"r":0.033,"cut":3000,"noise":1,"lvl":1.2}};
let midiProg = 0;
const midiGet = p => R[String(p)] || R['0'];
function midiOn(k, vel = 100) {
ensureAudio();
if (activeMidi.has(k)) midiKill(k);
const limit = (typeof VOICE_MAX !== 'undefined') ? VOICE_MAX : 32;
if (activeMidi.size >= limit) { const k0 = activeMidi.keys().next().value; midiKill(k0); }
const rec = midiGet(midiProg);
const t = audioCtx.currentTime;
const f = freqOf(k);
const v = Math.max(0.06, Math.min(1, (vel || 100) / 127));
const A = rec.a || 0.01, D = Math.max(rec.d || 0.3, 0.01), S = (rec.s == null ? 0.5 : rec.s), Rr = rec.r || 0.2;
const peak = 0.24 * (0.35 + 0.65 * v) * (rec.lvl || 1);
const g = audioCtx.createGain();
g.gain.setValueAtTime(0, t);
g.gain.linearRampToValueAtTime(peak, t + A);
g.gain.setTargetAtTime(Math.max(peak * S, 0.0001), t + A, D);
const lp = rec.cut ? audioCtx.createBiquadFilter() : null;
if (lp) { lp.type = 'lowpass'; lp.frequency.value = rec.cut * (rec.br ? 0.55 + 0.45 * v : 1); }
const nodes = [];
for (const pr of rec.p) {
const osc = audioCtx.createOscillator();
osc.type = rec.w || 'sine';
const currentBend = (typeof bendCents !== 'undefined') ? bendCents : 0;
osc.frequency.value = f * pr[0] * Math.pow(2, currentBend / 1200);
if (rec.det) osc.detune.value = ((pr[0] % 2) ? 1 : -1) * rec.det;
const og = audioCtx.createGain(); og.gain.value = pr[1];
osc.connect(og); og.connect(lp || g); osc.start(t); nodes.push(osc);
}
if (rec.noise) {
const ns = audioCtx.createBufferSource(); ns.buffer = noiseBuffer('long'); ns.loop = true;
const ng = audioCtx.createGain(); ng.gain.value = rec.noise;
ns.connect(ng); ng.connect(lp || g); ns.start(t); nodes.push(ns);
}
if (lp) lp.connect(g);
g.connect(master);
activeMidi.set(k, { g, nodes, Rr, f, ratios: rec.p.map(pr => pr[0]), st: performance.now() });
hl(k, true); updVoices();
if (S === 0) {
const end = t + A + D * 6 + Rr * 2;
nodes.forEach(n => { try { n.stop(end); } catch (_) {} });
}
}
function midiOff(k) {
const v = activeMidi.get(k); if (!v) return;
const t = audioCtx.currentTime, Rr = v.Rr;
try { v.g.gain.cancelScheduledValues(t); } catch () {}
try { v.g.gain.setValueAtTime(v.g.gain.value || 0.0001, t); } catch () {}
v.g.gain.setTargetAtTime(0, t, Math.max(Rr / 3, 0.01));
v.nodes.forEach(n => { try { n.stop(t + Rr * 2 + 0.1); } catch () {} });
activeMidi.delete(k); hl(k, false);
setTimeout(() => { try { v.g.disconnect(); } catch () {} }, Rr * 2000 + 120);
updVoices();
}
function midiKill(k) {
const v = activeMidi.get(k); if (!v) return;
const t = audioCtx.currentTime;
try { v.g.gain.cancelScheduledValues(t); } catch () {}
try { v.g.gain.setValueAtTime(v.g.gain.value || 0.0001, t); } catch () {}
v.g.gain.setTargetAtTime(0, t, 0.008);
v.nodes.forEach(n => { try { n.stop(t + 0.05); } catch () {} });
activeMidi.delete(k); hl(k, false);
setTimeout(() => { try { v.g.disconnect(); } catch () {} }, 80);
updVoices();
}
function buildMidiSel() {
const sel = document.getElementById('midiVoiceSel'); if (!sel) return;
sel.innerHTML = '';
FAMS_RNG.forEach((fr, i) => {
const og = document.createElement('optgroup'); og.label = fr[1];
const nxt = FAMS_RNG[i + 1] ? FAMS_RNG[i + 1][0] : 128;
for (let p = fr[0]; p < nxt; p++) {
const o = document.createElement('option'); o.value = String(p);
o.textContent = (p + 1) + '. ' + GMN[p];
og.appendChild(o);
}
sel.appendChild(og);
});
sel.value = '0';
}
$('#midiVoiceSel').addEventListener('change', e => {
midiProg = +e.target.value || 0;
lcd('MODE: [MIDI GM] — Голос: [' + GMN[midiProg] + ']');
if (state.mode !== 'midi') setMode('midi'); else log('Голос MIDI: ' + GMN[midiProg]);
});
/* ============ ИНТЕРФЕЙС И КЛАВИАТУРА (МЫШЬ) ============ */
const KB_LO = 24; 
const KB_HI = 78; 

const PC_MIN = () => KB_LO;
const PC_MAX = () => KB_HI;

let kbMode = 2;
const keyEls1 = new Map(), keyEls2 = new Map();

// ИСПРАВЛЕНИЕ: Массив номеров полутонов (чёрных клавиш) возвращен на место
const isBlackM = m => [1, 3, 6, 8, 10].includes(m);

const NOTE_L = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function buildKeys() {
const roles = [[document.getElementById('keys'), keyEls1], [document.getElementById('keys2'), keyEls2]];
for (const [box, els] of roles) {
if (!box) continue;
els.clear(); box.innerHTML = '';
box.style.width = '2906px'; box.style.height = '164px';
for (let k = KB_LO; k <= KB_HI; k++) {
const m = k % 12;
if (!isBlackM(m)) {
const d = document.createElement('div');
d.className = 'wk'; d.dataset.key = k;
d.innerHTML = '' + NOTE_L[m] + (Math.floor(k / 12) - 1) + '';
box.appendChild(d); els.set(k, d);
}
}
let wIdx = 0;
for (let k = KB_LO; k <= KB_HI; k++) {
const m = k % 12;
if (isBlackM(m)) {
const d = document.createElement('div');
d.className = 'bk'; d.dataset.key = k;
d.style.width = '36px'; d.style.height = '94px';
d.style.left = (wIdx * 58 - 18) + 'px';
box.appendChild(d); els.set(k, d);
} else wIdx++;
}
}
centerOnBase();
}
function hl(k, on) {
const e1 = keyEls1.get(k), e2 = keyEls2.get(k);
if (e1) e1.classList.toggle('act', on);
if (e2) e2.classList.toggle('act', on);
updVoices();
}
function attachKb(box) {
if (!box) return;
box.addEventListener('pointerdown', e => {
const el = e.target.closest('.wk,.bk'); if (!el) return;
const r = el.getBoundingClientRect();
const relY = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
const vel = applySens(relY);
ensureAudio(); noteOwner.set(+el.dataset.key, '@ext'); noteOn(+el.dataset.key, vel);
try { el.setPointerCapture(e.pointerId); } catch (_) {}
});
const up = e => {
const el = e.target.closest('.wk,.bk'); if (!el) return;
const _k = +el.dataset.key; if (noteOwner.get(_k) === '@ext') { noteOwner.delete(_k); noteOff(_k); }
};
box.addEventListener('pointerup', up);
box.addEventListener('pointercancel', up);
}
attachKb(document.getElementById('keys'));
attachKb(document.getElementById('keys2'));
const tapeSyncs = [];
function tapeSetup(strip, wrap) {
if (!strip || !wrap) return;
const thumb = strip.querySelector('.tape-thumb'); if (!thumb) return;
const sync = () => {
const maxS = wrap.scrollWidth - wrap.clientWidth;
const vis = maxS > 0 ? wrap.clientWidth / wrap.scrollWidth : 1;
const w = Math.max(24, Math.round(strip.clientWidth * vis));
thumb.style.width = w + 'px';
thumb.style.left = (maxS > 0 ? (wrap.scrollLeft / maxS) * (strip.clientWidth - w) : 0) + 'px';
};
tapeSyncs.push(sync);
let drag = false, dragX = 0, dragL = 0;
thumb.addEventListener('pointerdown', e => {
drag = true; dragX = e.clientX; dragL = wrap.scrollLeft;
try { thumb.setPointerCapture(e.pointerId); } catch (_) {}
e.preventDefault();
});
thumb.addEventListener('pointermove', e => {
if (!drag) return;
const maxS = wrap.scrollWidth - wrap.clientWidth; if (maxS <= 0) return;
const track = Math.max(1, strip.clientWidth - thumb.offsetWidth);
wrap.scrollLeft = Math.min(maxS, Math.max(0, dragL + (e.clientX - dragX) * (maxS / track)));
});
const end = () => { drag = false; };
thumb.addEventListener('pointerup', end); thumb.addEventListener('pointercancel', end);
wrap.addEventListener('scroll', sync);
window.addEventListener('resize', sync);
sync();
}
tapeSetup(document.getElementById('strip1'), document.getElementById('wrap1'));
tapeSetup(document.getElementById('strip2'), document.getElementById('wrap2'));
let rollLocked = false;
function rollLockApply() {
const btn = document.getElementById('rollLock');
if (btn) { btn.textContent = rollLocked ? 'СКРОЛЛ: ЗАМОК' : 'СКРОЛЛ: ОТКРЫТ'; btn.classList.toggle('on', rollLocked); }
for (const id of ['wrap1', 'wrap2']) {
const w = document.getElementById(id); if (w) w.style.overflowX = rollLocked ? 'hidden' : 'auto';
}
lcd(rollLocked ? 'Скролл: ЗАМОК' : 'Скролл: ОТКРЫТ');
}
$('#rollLock').addEventListener('click', () => { rollLocked = !rollLocked; rollLockApply(); });
function octBtn(d) {
pcBase = Math.min(PC_MAX(), Math.max(PC_MIN(), pcBase + d * 12));
lcd('PC-клавиатура: октава от ноты ' + pcBase);
}
$('#octDn').addEventListener('click', () => octBtn(-1));
$('#octUp').addEventListener('click', () => octBtn(1));
function centerOnBase() {
for (const w of [document.getElementById('wrap1'), document.getElementById('wrap2')]) {
if (!w) continue;
const box = w.firstElementChild;
const c = box ? box.querySelector('[data-key="' + pcBase + '"]') : null;
if (c) w.scrollLeft = Math.max(0, c.offsetLeft - (w.clientWidth - c.offsetWidth) / 2);
}
for (const f of tapeSyncs) f();
}
function setKbMode(n) {
if (n === kbMode) return;
kbMode = n;
document.getElementById('kb2').classList.toggle('on', n === 2);
document.getElementById('kb1').classList.toggle('on', n === 1);
for (const [note, own] of [...noteOwner]) { if (own === '@ext') { noteOwner.delete(note); noteOff(note); } }
for (const [, nn] of heldKeys) { susCancel(nn); hardOff(nn); }
heldKeys.clear(); noteOwner.clear();
pcBase = Math.min(PC_MAX(), Math.max(PC_MIN(), pcBase));
document.body.classList.toggle('kb-single', kbMode === 1);
buildKeys();
}
document.getElementById('kb2').addEventListener('click', () => setKbMode(2));
document.getElementById('kb1').addEventListener('click', () => setKbMode(1));
/* ============ КЛАВИАТУРА ПК ============ */
const LO2 = ['KeyZ', 'KeyS', 'KeyX', 'KeyD', 'KeyC', 'KeyV', 'KeyG', 'KeyB', 'KeyH', 'KeyN', 'KeyJ', 'KeyM', 'Comma', 'KeyL', 'Period', 'Semicolon', 'Slash', 'Quote'];
const HI2 = ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU', 'KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP', 'BracketLeft', 'BracketRight'];
const ONE = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon', 'Quote', 'BracketRight'];
let pcBase = 60, layout2 = true;
const heldKeys = new Map(), noteOwner = new Map();
function codeToNote(e) {
const c = e.code;
if (!layout2) { const i = ONE.indexOf(c); return i >= 0 ? pcBase + i : -1; }
const l = LO2.indexOf(c); if (l >= 0) return pcBase + l;
const h = HI2.indexOf(c); if (h >= 0) return pcBase + 12 + h;
return -1;
}
let kbOn = true;
document.getElementById('kbToggle').addEventListener('click', () => {
kbOn = !kbOn;
document.getElementById('kbToggle').classList.toggle('on', kbOn);
document.getElementById('kbToggle').textContent = 'КЛАВИАТУРА: ' + (kbOn ? 'ВКЛ' : 'ВЫКЛ');
if (!kbOn) {
for (const [code, n] of heldKeys) { susCancel(n); hl(n, false); hardOff(n); }
heldKeys.clear(); noteOwner.clear();
}
});
function setLayout(m) {
layout2 = m;
document.getElementById('lay2').classList.toggle('on', !!m);
document.getElementById('lay1').classList.toggle('on', !m);
for (const [, n] of heldKeys) { susCancel(n); hardOff(n); }
heldKeys.clear(); noteOwner.clear();
}
$('#lay2').addEventListener('click', () => setLayout(true));
$('#lay1').addEventListener('click', () => setLayout(false));
document.addEventListener('keydown', e => {
if (e.repeat) return;
if (e.key === 'ArrowLeft') { pcBase = Math.max(PC_MIN(), pcBase - 12); lcd('PC-клавиатура: октава от ноты ' + pcBase); return; }
if (e.key === 'ArrowRight') { pcBase = Math.min(PC_MAX(), pcBase + 12); lcd('PC-клавиатура: октава от ноты ' + pcBase); return; }
if (!kbOn) return;
if (heldKeys.has(e.code)) return;
const n = codeToNote(e);
if (n >= 0) { heldKeys.set(e.code, n); ensureAudio(); noteOwner.set(n, e.code); noteOn(n, 100); }
});
document.addEventListener('keyup', e => {
if (!heldKeys.has(e.code)) return;
const n = heldKeys.get(e.code); heldKeys.delete(e.code);
if (noteOwner.get(n) === e.code) { noteOwner.delete(n); noteOff(n); }
});
/* ============ MIDI-ФИЗИКА И PITCH BEND ============ */
let midiAccess = null, sustainOn = false, bendCents = 0;
const sustained = new Set();
function updVoices() {
const el = $('#voiceCnt');
if (el) el.textContent = activeChip.size + activeSF2.size + activeMidi.size;
}
function panicAll() {
sustainOn = false; sustained.clear(); susClearAll(); noteOwner.clear();
for (const t of killTimers.values()) clearTimeout(t); killTimers.clear();
[...activeSF2.keys()].forEach(k => sfOff(k));
[...activeChip.keys()].forEach(k => chipOff(k));
[...activeMidi.keys()].forEach(k => midiOff(k));
updVoices();
log('PANIC: все голоса заглушены.');
}
function applyBend() {
activeSF2.forEach(v => { if (v.rate) v.src.playbackRate.value = v.rate * Math.pow(2, bendCents / 1200); });
activeChip.forEach(v => { if (v.bend) v.bend(bendCents); });
activeMidi.forEach(v => {
if (v.nodes && v.f && v.ratios) {
v.nodes.forEach((osc, idx) => {
if (osc.frequency) {
const baseRatio = v.ratios[idx] || 1;
osc.frequency.setValueAtTime(v.f * baseRatio * Math.pow(2, bendCents / 1200), audioCtx.currentTime);
}
});
}
});
}
function initMIDI() {
if (!navigator.requestMIDIAccess) { log('Web MIDI API не поддерживается.'); return; }
navigator.requestMIDIAccess({ sysex: false }).then(acc => {
midiAccess = acc; fillMidiSel(acc);
acc.onstatechange = () => { fillMidiSel(acc); };
log('MIDI доступ получен.');
}).catch(err => log('MIDI ошибка: ' + err.message));
}
function fillMidiSel(acc) {
const sel = $('#midiSel'); if (!sel) return;
const cur = sel.value; sel.innerHTML = 'Все устройства';
acc.inputs.forEach(inp => {
const o = document.createElement('option'); o.value = inp.id; o.textContent = inp.name || 'MIDI-вход';
sel.appendChild(o);
});
if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
acc.inputs.forEach(inp => { inp.onmidimessage = onMIDI; });
}
function onMIDI(ev) {
const sel = $('#midiSel'); if (sel.value !== 'all' && sel.value !== ev.target.id) return;
const data = ev.data; if (!data || data.length < 2) return;
const st = data[0] & 0xF0, d1 = data[1], d2 = data.length > 2 ? data[2] : 0;
if (st === 0x90 && d2 > 0) {
ensureAudio(); sustained.delete(d1); noteOwner.set(d1, '@ext'); noteOn(d1, applySens(d2 / 127));
} else if (st === 0x80 || (st === 0x90 && d2 === 0)) {
if (sustainOn) sustained.add(d1); else if (noteOwner.get(d1) === '@ext') { noteOwner.delete(d1); noteOff(d1); }
} else if (st === 0xB0) {
if (d1 === 64) {
sustainOn = d2 >= 64;
if (!sustainOn) { [...sustained].forEach(k => noteOff(k)); sustained.clear(); }
} else if (d1 === 120 || d1 === 123) panicAll();
} else if (st === 0xE0 && data.length >= 3) {
bendCents = Math.round((((d2 & 0x7F) << 7 | (d1 & 0x7F)) - 8192) / 8192 * 200);
applyBend();
}
}
$('#midiBtn').addEventListener('click', initMIDI);
$('#panicBtn').addEventListener('click', panicAll);
/* ============ СТАРТ И ТАЧ-ОПТИМИЗАЦИЯ ============ */
if ('ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0) {
try {
for (let si = document.styleSheets.length - 1; si >= 0; si--) {
const styleSheet = document.styleSheets[si];
const rules = styleSheet.cssRules || styleSheet.rules; if (!rules) continue;
for (let ri = rules.length - 1; ri >= 0; ri--) {
if (rules[ri].selectorText && rules[ri].selectorText.match(':hover')) styleSheet.deleteRule(ri);
}
}
} catch (ex) {}
}
// ИСПРАВЛЕНИЕ: Безопасный вызов селектора, клавиатура гарантированно запустится
if (typeof buildMidiSel === 'function') buildMidiSel();
buildKeys();
document.addEventListener('click', () => ensureAudio(), { once: true });
log('BUILD v1.2.5 «Finale» ПРОД-МОНОЛИТ СОБРАН');