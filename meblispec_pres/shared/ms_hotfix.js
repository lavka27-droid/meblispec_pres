// MebliSpec PRES 1.0.7.2 — хотфікс: безкінечний цикл MutationObserver на #pres-stamp у Chromium ≤128 (вікно PRES порожнє, кнопки мертві, renderer 100% ядра).
// Причина: у цих версіях повторний style.setProperty('--tbw', '700') (кастомна властивість, те саме значення) породжує запис мутації; msTbRender() пише її кожного разу,
// а спостерігач на #pres-stamp викликає msTbRender() знову → цикл. Тригер — збережений «жирний» штамп (fst містить b).
// Тут: повторний запис кастомної властивості тим самим значенням пропускаємо (для сторінки це no-op). Підключається першим у <head>, до решти скриптів.
(function () {
  try {
    var P = window.CSSStyleDeclaration && window.CSSStyleDeclaration.prototype;
    if (!P || P.__msSamePropFix) return;
    var orig = P.setProperty;
    P.setProperty = function (name, value, priority) {
      try {
        if (typeof name === 'string' && name.indexOf('--') === 0 && !priority && this.getPropertyValue(name) === String(value)) return;
      } catch (e) { }
      return orig.apply(this, arguments);
    };
    P.__msSamePropFix = 1;
  } catch (e) { }
})();
