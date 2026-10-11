/* ============================================================
   ФАЙЛ 13/13: 13_touch_fps.js
   Секция: touch-детект + FPS-метр
   Часть монолитного скрипта SF2 ENGINE v1.2.5 «Finale»
   ============================================================ */

function hasTouch() {
  return 'ontouchstart' in document.documentElement ||
         navigator.maxTouchPoints > 0 ||
         navigator.msMaxTouchPoints > 0;
}

if (hasTouch()) {
  // ИСПРАВЛЕНИЕ: Кроссбраузерное удаление правил с :hover с поддержкой cssRules
  try {
    for (let si = document.styleSheets.length - 1; si >= 0; si--) {
      const styleSheet = document.styleSheets[si];
      // Проверяем современный cssRules, откатываемся на rules для старых систем
      const rules = styleSheet.cssRules || styleSheet.rules;
      if (!rules) continue;
      
      for (let ri = rules.length - 1; ri >= 0; ri--) {
        if (!rules[ri].selectorText) continue;
        if (rules[ri].selectorText.match(':hover')) {
          styleSheet.deleteRule(ri);
        }
      }
    }
    log('Touch-оптимизация: эффекты :hover успешно удалены для сенсорного экрана.');
  } catch (ex) {
    // Защита от CORS ограничений, если стили загружены со стороннего домена
  }
}

// FPS метр :
let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
  const now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    document.getElementById('fpsDisplay').textContent = frameCount;
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(updateFPS);
}

updateFPS();
