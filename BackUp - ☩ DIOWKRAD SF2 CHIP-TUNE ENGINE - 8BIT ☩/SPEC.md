# DIOWKRAD SF2 CHIP-TUNE ENGINE — Спецификация (v1.2.5 Final)

## О проекте
Финальная сборка движка для синтеза звука с эмуляцией чипа 2A03 (NES), поддержкой 4 типов волн, MIDI на 16 каналов, роллом и кастомной клавиатурой.  
Без внешних библиотек, без дебага, без changelog. Полностью оффлайн.

## Порядок загрузки скриптов
1. core-init.js
2. synth-engine.js
3. wave-generator.js
4. midi-handler.js
5. midi-select.js
6. keyboard-render.js
7. octave-control.js
8. roll-render.js
9. roll-scroll.js
10. ui-controls.js

> Важно: менять порядок нельзя — нарушатся зависимости.

## Карта модулей

| Модуль | Назначение | Ключевые ID / селекторы | Зависимости |
|--------|------------|---------------------------|-------------|
| core-init.js | Инициализация ядра, проверка DOM, запуск SynthAPI | `start-btn`, `mute-btn` | — |
| synth-engine.js | Ядро синтезатора, эмуляция 2A03 | Внутренние переменные движка | core-init.js |
| wave-generator.js | Генерация 4 волн: синус, пила, квадрат, треугольник | `.wave-type` | synth-engine.js |
| midi-handler.js | Обработка MIDI, каналы 1–16 | `.midi-status`, `#midiVoiceSel` | synth-engine.js |
| midi-select.js | Построение селектора голосов | `#midiVoiceSel` | midi-handler.js |
| keyboard-render.js | Отрисовка клавиш, полифония | `.keyboard`, `.key` | core-init.js, synth-engine.js |
| octave-control.js | Переключатель октав, границы | `.octave-controls`, `#octave-display` | keyboard-render.js |
| roll-render.js | Ролл (ноты по времени) | `#roll-container`, `.roll-note` | keyboard-render.js, octave-control.js |
| roll-scroll.js | Скролл ролла, синхронизация | `#roll-viewport`, `.roll-track` | roll-render.js |
| ui-controls.js | Группировка UI: переключатели, чекбоксы, скролы | `.ui-group-switches`, `.ui-group-checks` | — |

## Карта ключевых ID

### Управление
- `start-btn`: запуск синтезатора (`SynthAPI.init()`).
- `mute-btn`: глушение звука.

### MIDI
- `#midiVoiceSel`: селектор голосов (заполняется `buildMidiSel()`).
- `.midi-status`: индикатор статуса MIDI.

### Клавиатура
- `.keyboard`: контейнер всех клавиш.
- `.key`: отдельные клавиши.

### Октавы
- `.octave-controls`: группа переключателей октав.
- `#octave-display`: отображение текущей октавы.

### Ролл
- `#roll-container`: общий контейнер.
- `#roll-viewport`: область прокрутки.
- `.roll-note`: отдельная нота.
- `.roll-track`: дорожка/временная шкала.

### UI‑группы
- `.ui-group-switches`: переключатели.
- `.ui-group-checks`: чекбоксы и ползунки.

## Важные константы и границы
- `PC_MIN()` = 24, `PC_MAX()` = 78 — границы нот (до C8).  
  Единый источник истины: `core-init.js`. Не дублировать в других модулях.

## Архитектурные решения
- Дебаг и changelog исключены из релиза.
- Переключатель октав и С4 по умолчанию — финальное решение.
- Все стили — через CSS‑переменные; JS не меняет стили напрямую.

## Рекомендации для внесения изменений
1. Перед правкой модуля — проверь зависимости в таблице.
2. Не меняй ID без обновления спецификации.
3. Новые модули добавляй в конец списка, явно указывая зависимости.
4. При изменении границ нот — меняй только в `core-init.js`.

## Статус
- Версия: v1.2.5 «Final».
- Разработка завершена. Дальнейшее расширение не планируется.
