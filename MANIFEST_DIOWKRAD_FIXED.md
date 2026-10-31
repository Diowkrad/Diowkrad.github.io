# Манифест: DIOWKRAD SF2 CHIP-TUNE ENGINE — фиксовая сборка

## Происхождение
- 2007–2009: DLS-исходник собран автором (Diowkrad), школьный проект будущей студии;
- 2009: пересборки SF2 (8bitsf.SF2, гуляет по сети) и «8-bit Engine» (SF2/SF3/DLS);
- 2026: чистка «☩ DIOWKRAD SF2 CHIP-TUNE ENGINE - 8BIT ☩» (SpessaFont 1.4.17) — потеряла
  инструментные записи TRUMPET и SLAPBASS, 4 пресета (ORGAN 6, BASS 5, TRUMPET 1, SHENAI) молчали;
- 2026 (фикс): записи инструментов и 4 привязки восстановлены минимальной правкой по летописи.
  Зоны TRUMPET/SLAPBASS пересобраны по документированным параметрам летописи: сплиты 0–71/72–96,
  root-оверрайд 72 (op58), луп sm3 (Trumpet нижняя) / sm1, релизы op38: 62750 (−2786 = 0,2 с)
  и 64336 (−1200 = 1,0 с). Смещения адресов обнулены — лупы берутся напрямую из shdr.

## Печати
| Файл | MD5 | SHA-256 |
|---|---|---|
| ☩ DIOWKRAD…☩ (чистый) | `7253f22e28e6607d61021ee177bc25ee` | `6d24d20e5daceb1e98c1a5b8edd71a9278ff2b42dce526cb51fd3d0dcfdc662a` |
| DIOWKRAD_8BIT_FIXED.sf2 | `6cb5989b0adbc0e3ac91b23ed6e8ce26` | `9b4f7fc4d7ae9e4118a3d7c0c3bf0afa9b9ba3057a651f9b0ca2b4988d42ee9a` |
| STRINGS_E4_engine.wav | `42e418da1ca0d1d7d4089a534b6fb1dd` | `30888e05e06f957010690321c026597d163c527de3a9da274aae59d574ff345d` |
| STRINGS_E4_tuned.wav | `74e02ad771419a6bbb3f3fa5621f688a` | `2b3901ceb62ac86dc57b4675b373f22f47a6a2452555661fc9a63de4b434aa93` |

## Параметры фикса
- Размер: 2 853 022 байта (+220 к чистому: inst +44, ibag +24, igen +136, pgen +16);
- PCM и shdr перенесены байт в байт; INFO (включая ICMT про кавычку и голубя) — байт в байт;
- 16 нулевых байтов хвоста чистого банка не перенесены (не часть RIFF);
- 27 сэмплов, 12 инструментов + EOI, 26 пресетов, ни одного молчащего.

## Карта пресетов (все 26 рабочих)
| Пресет | Prog | Инструмент | Сэмплы зон |
|---|---|---|---|
| PIANO | 0 | 2 | piano(R), pianohi(L) |
| PIANO 2 | 0 | 10 | honkytonkpiano(L), honkytonkpiano hi(R) |
| E. PIANO | 0 | 8 | ElecPiano(R), ElecPianoHi(L) |
| HARPSICHORD | 0 | 9 | harpsichord(R), harpsichordhi(L) |
| VIBES 1 | 0 | 2 | piano(R), pianohi(L) |
| ORGAN 1 | 0 | 3 | SquareWave(R), SquareWavehi(L) |
| ORGAN 6 | 0 | TRUMPET | Trumpet(R), Trumpethi(L) |
| GUITAR 3 | 0 | 5 | vibraphone(R), vibraphonehi(L) |
| BASS 1 | 0 | 1 | Triangle(R)1, TriangleHi(L)1 |
| BASS 5 | 0 | SLAPBASS | slap111, slaphi111 |
| STRINGS 1 | 0 | 4 | Strings(R), stringshi(L) |
| STRINGS 10 | 0 | 4 | Strings(R), stringshi(L) |
| STRINGS 11 | 0 | 4 | Strings(R), stringshi(L) |
| STRINGS 12 | 0 | 4 | Strings(R), stringshi(L) |
| STRINGS 13 | 0 | 4 | Strings(R), stringshi(L) |
| STRINGS 14 | 0 | 4 | Strings(R), stringshi(L) |
| STRINGS 15 | 0 | 4 | Strings(R), stringshi(L) |
| TRUMPET 1 | 0 | TRUMPET | Trumpet(R), Trumpethi(L) |
| SQUARE WAVE | 0 | 3 | SquareWave(R), SquareWavehi(L) |
| SQUARE WAVE 2 | 0 | 6 | sawwave11, sawwavehi1 |
| DUTY CYCLE | 0 | 7 | dutycycle(R), dutycyclehi(L) |
| LEAD 1 | 0 | 2 | piano(R), pianohi(L) |
| PAD 1 | 0 | 4 | Strings(R), stringshi(L) |
| SITAR 1 | 0 | 9 | harpsichord(R), harpsichordhi(L) |
| BAGPIPE | 0 | 4 | Strings(R), stringshi(L) |
| SHENAI | 0 | TRUMPET | Trumpet(R), Trumpethi(L) |

## Рендер-приёмка STRINGS 1 (E4, сустейн 1,2 с, релиз 1 с)
- Выправленный: пик 330,0 Гц = midi 64.02 — честное E4;
- Движок-точный: пик 303,8 Гц = midi 62.58 — сдвиг −147 цента.
- УТОЧНЕНИЕ ЛЕТОПИСИ: дефект тракта даёт сдвиг ВНИЗ на 147 цента; поправка в SF2Core:
  rate *= 48000/nativeRate (в летописи направление было записано наоборот).
- Привязка по канону банка: STRINGS 1 играет сэмплом SquareWave(R) (имена пресетов декоративны
  — так задумано раскладкой 2009 года).

## Родословная
DLS (мастер, полные атаки) → 8-bit Engine (SF2/SF3/DLS, лаг 2 отсчёта) → ☩ DIOWKRAD…☩ (чистка)
→ DIOWKRAD_8BIT_FIXED (возврат TRUMPET/SLAPBASS и 4 привязок). Распространение свободное.
