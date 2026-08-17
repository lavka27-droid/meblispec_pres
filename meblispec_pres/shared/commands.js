// ============================================================================
// build384: РЕЄСТР КОМАНД (MSP_COMMANDS) + msTool — єдина точка стану інструментів.
//
// НАВІЩО: дії/інструменти/тумблери плагіна були розкидані інлайн-onclick по ~18
// секціях сайдбара, кожен інструмент підсвічувався СВОЇМ способом (3 різні заливки
// style.background, класи active-btn / gt-active), взаємовиключення зашите врозсип.
// Реєстр — єдине джерело істини «що вміє плагін»: панель швидкого доступу (build385),
// майбутні гарячі клавіші, палітра команд і автодовідка живляться з нього ж.
//
// ПРАВИЛО ДИСЦИПЛІНИ: нова фіча з кнопкою/інструментом = запис у цей реєстр.
//
// Види команд (kind):
//   'action' — одноразова дія (run)
//   'tool'   — модальний інструмент зі станом (run=toggle, isActive, cancel)
//   'toggle' — перемикач (run=фліп, isActive; безпечний шлях — click() по РІДНОМУ
//              контролу секції: успадковує onchange і всі побічки, розсинхрон неможливий)
//   'link'   — відкрити секцію сайдбара (генеруються автоматично з DOM — не відстають)
//
// msTool: derived-стан. refresh() зветься щокадру з presAnimate (усі входи/виходи
// інструментів ставлять pDirty=true, тож будь-яка зміна ловиться в межах кадру без
// переписування ~20 точок виходу «в IDLE» по движку). Підписники onChange отримують
// (id, on, cmd) і вішають ЄДИНИЙ клас підсвітки .msp-cmd-active на кнопку команди.
// ============================================================================
(function () {
  'use strict';
  const $id = (id) => document.getElementById(id);
  // 24×24, контурний стиль існуючих іконок шапки (stroke=currentColor, товщина 2)
  const S = (inner, sw) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) +
    '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  const clickCtl = (id) => { const el = $id(id); if (el) el.click(); };
  const ctlOn = (id) => { const el = $id(id); return !!(el && el.checked); };
  const gEsc = (name) => (typeof window[name] === 'function');

  // ---------------- реєстр ----------------
  const C = [];

  // ======== ДІЇ (шапка + аннотації) ========
  C.push({
    id: 'refresh-model', kind: 'action', section: 'Проєкт', label: 'Оновити модель',
    icon: S('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'),
    run() { if (gEsc('refreshModel')) refreshModel(); },
  });
  C.push({
    id: 'print-pdf', kind: 'action', section: 'Проєкт', label: 'Експорт у PDF',
    icon: S('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>'),
    run() { if (gEsc('printPDF')) printPDF(); },
  });
  C.push({
    id: 'undo', kind: 'action', section: 'Проєкт', label: 'Скасувати (Ctrl+Z)',
    icon: S('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    run() { if (window.pUndo) pUndo(); },
  });
  C.push({
    id: 'redo', kind: 'action', section: 'Проєкт', label: 'Повернути (Ctrl+Y)',
    icon: S('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
    run() { if (window.pRedo) pRedo(); },
  });
  C.push({
    id: 'reset-camera', kind: 'action', section: 'Проєкт', label: 'Скинути камеру',
    icon: S('<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/><circle cx="12" cy="13" r="2.5"/>'),
    run() { if (gEsc('presResetCamera')) presResetCamera(); },
  });
  C.push({
    id: 'clear-model', kind: 'action', section: 'Проєкт', label: 'Очистити модель', danger: true,
    icon: S('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
    run() { if (gEsc('clearModel')) clearModel(); },
  });
  C.push({
    id: 'instructions', kind: 'action', section: 'Проєкт', label: 'Інструкція',
    icon: S('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    run() { if (gEsc('openInstructions')) openInstructions(); },
  });
  C.push({
    id: 'add-image', kind: 'action', section: 'Аннотації', label: 'Додати зображення',
    icon: S('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-5.5-5.5L7 19"/>', 1.8),
    run() { if (window._pExitGroupTagMode) _pExitGroupTagMode(); if (window.addImageToSheet) addImageToSheet(); },
  });
  C.push({
    id: 'add-text', kind: 'action', section: 'Аннотації', label: 'Текстовий блок',
    icon: S('<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>'),
    run() { if (window._pExitGroupTagMode) _pExitGroupTagMode(); if (gEsc('addDescriptionBlock')) addDescriptionBlock(); },
  });
  C.push({
    id: 'add-material', kind: 'action', section: 'Аннотації', label: 'Зовнішній матеріал (URL)',
    icon: S('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
    run() { if (window._pExitGroupTagMode) _pExitGroupTagMode(); if (gEsc('addExternalMaterial')) addExternalMaterial(); },
  });

  // ======== ІНСТРУМЕНТИ (модальні, зі станом) ========
  C.push({
    id: 'dim-linear', kind: 'tool', section: 'Розміри', label: 'Ручний розмір', btnId: 'pres-btn-manual-dim',
    icon: S('<path d="M19.5 2.5a2.12 2.12 0 0 1 3 3L9 19.5l-5 1.5 1.5-5Z"/><path d="M17.5 4.5l2 2"/><path d="M7 15l2 2"/>'),
    run() { if (gEsc('pToggleManualDimTool')) pToggleManualDimTool(); },
    isActive() { return typeof pManualDimState !== 'undefined' && pManualDimState !== 'IDLE'; },
    cancel() { if (this.isActive() && gEsc('pToggleManualDimTool')) pToggleManualDimTool(); },
  });
  C.push({
    id: 'dim-angle', kind: 'tool', section: 'Розміри', label: 'Кутовий розмір', btnId: 'pres-btn-manual-ang',
    icon: S('<path d="M4 20 18 4"/><path d="M4 20h16"/><path d="M11 20a8 8 0 0 0-2.6-5.9"/>', 2.2),
    run() { if (gEsc('pToggleManualAngleTool')) pToggleManualAngleTool(); },
    isActive() { return typeof pManualAngleState !== 'undefined' && pManualAngleState !== 'IDLE'; },
    cancel() { if (this.isActive() && gEsc('pToggleManualAngleTool')) pToggleManualAngleTool(); },
  });
  C.push({
    id: 'dim-radius', kind: 'tool', section: 'Розміри', label: 'Радіус', btnId: 'pres-btn-manual-rad',
    icon: S('<circle cx="12" cy="12" r="9"/><path d="M12 12l6.5-6.5"/>', 2.2),
    run() { if (gEsc('pToggleManualRadialTool')) pToggleManualRadialTool(); },
    isActive() { return typeof pManualRadialState !== 'undefined' && pManualRadialState !== 'IDLE'; },
    cancel() { if (this.isActive() && gEsc('pToggleManualRadialTool')) pToggleManualRadialTool(); },
  });
  C.push({
    id: 'loupe', kind: 'tool', section: 'Аннотації', label: 'Лупа', btnId: 'btn-loupe',
    icon: S('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>'),
    run() { if (gEsc('startLoupeMode')) startLoupeMode(); },
    isActive() { return typeof pLoupeState !== 'undefined' && (pLoupeState === 'SELECT_TARGET' || pLoupeState === 'PLACE_LOUPE'); },
    cancel() {
      if (!this.isActive()) return;
      window.pLoupeState = 'IDLE';
      if (window.msDropPlacingLoupe) msDropPlacingLoupe(); // build385(ревью): не лишати лупу-привид
      window.pDirty = true;
    },
  });
  C.push({
    id: 'loupe-node', kind: 'tool', section: 'Аннотації', label: 'Вузлова лупа', btnId: 'btn-loupe-node',
    icon: S('<circle cx="9" cy="9" r="3"/><circle cx="9" cy="9" r="7.5"/><line x1="14.5" y1="14.5" x2="21" y2="21"/>'),
    run() { if (gEsc('startNodeLoupeMode')) startNodeLoupeMode(); },
    isActive() { return typeof pLoupeState !== 'undefined' && String(pLoupeState).indexOf('NODE') === 0; },
    cancel() {
      if (!this.isActive()) return;
      window.pLoupeState = 'IDLE';
      if (typeof _pNodeSizerHide === 'function') _pNodeSizerHide();
      if (window.msDropPlacingLoupe) msDropPlacingLoupe(); // build385(ревью): не лишати лупу-привид
      const w = $id('pres-wrap'); if (w) w.style.cursor = '';
      window.pDirty = true;
    },
  });
  C.push({
    id: 'callout', kind: 'tool', section: 'Аннотації', label: 'Виноска', btnId: 'btn-callout',
    icon: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
    run() { if (gEsc('startCalloutMode')) startCalloutMode(); },
    isActive() { return typeof pCalloutState !== 'undefined' && pCalloutState !== 'IDLE'; },
    cancel() {
      if (!this.isActive()) return;
      window.pCalloutState = 'IDLE'; window.pTempCallout = null;
      if (typeof pHideCalloutSnap === 'function') pHideCalloutSnap();
      window.pDirty = true;
    },
  });
  C.push({
    id: 'group-tag', kind: 'tool', section: 'Аннотації', label: 'Виноска автогруп', btnId: 'pres-btn-grouptag',
    icon: S('<circle cx="12" cy="12" r="10"/><path d="M10 8h3v8"/><path d="M10 16h5"/>'),
    run() { if (gEsc('startGroupTagMode')) startGroupTagMode(); },
    isActive() { return typeof pGroupTagState !== 'undefined' && pGroupTagState === 'ACTIVE'; },
    cancel() { if (window._pExitGroupTagMode) _pExitGroupTagMode(); },
  });
  C.push({
    id: 'door-editor', kind: 'tool', section: 'Відкривання', label: 'Редактор відкривання', btnId: 'pres-btn-door',
    icon: S('<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h20"/><path d="M13 20V4a1 1 0 0 0-1.2-1l-6 1.2A1 1 0 0 0 5 5.2V20"/><circle cx="10.5" cy="12" r="0.9"/>'),
    run() { if (gEsc('pToggleDoorTool')) pToggleDoorTool(); },
    isActive() { return typeof pDoorToolMode !== 'undefined' && pDoorToolMode > 0; },
    cancel() { if (this.isActive() && gEsc('pToggleDoorTool')) pToggleDoorTool(); },
  });
  C.push({
    id: 'section-draw', kind: 'tool', section: 'Переріз', label: 'Малювати переріз',
    icon: S('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.1 7.9 20 20"/><path d="M8.1 16.1 20 4"/>'),
    run() {
      if (!gEsc('pToggleSectionDrawTool')) return;
      const mv = (typeof MultiView !== 'undefined') ? MultiView.getSettings() : null;
      pToggleSectionDrawTool((mv && typeof mv.activeSlot === 'number') ? mv.activeSlot : 0);
    },
    isActive() { return typeof window.pSecBoxState !== 'undefined' && window.pSecBoxState !== 'IDLE'; },
    cancel() {
      if (!this.isActive()) return;
      window.pSecBoxState = 'IDLE'; window.pTempSecBox = null; window.pDirty = true;
    },
  });

  // ======== ВИДИ (build388): зміна виду АКТИВНОГО слота — штатний шлях меню виду
  // (MultiView.setSlotView; iso/persp — існуючий iso_N/persp_N або pCreateDynView, як «+» у меню).
  // isActive = активний слот показує цей вид → підсвітка ПОТОЧНОГО виду на панелі. ========
  const _setActiveSlotView = (viewId) => {
    if (typeof MultiView === 'undefined') return;
    const mv = MultiView.getSettings();
    if (!mv.slots || !mv.slots.length) return; // порожній лист — нема куди ставити
    const i = (typeof mv.activeSlot === 'number' && mv.activeSlot >= 0 && mv.activeSlot < mv.slots.length) ? mv.activeSlot : 0;
    let vid = viewId;
    if (viewId === 'iso' || viewId === 'persp') { // нумеровані 3D-види: перший існуючий або новий
      const re = new RegExp('^' + viewId + '_\\d+$');
      const ex = Array.isArray(window.pCustomViews) ? window.pCustomViews.find(v => re.test(v)) : null;
      vid = ex || (window.pCreateDynView ? pCreateDynView(viewId) : viewId);
    }
    MultiView.setSlotView(i, vid);
    if (window.pLoadSlotCamToGlobals) pLoadSlotCamToGlobals(i);
    if (MultiView.renderUI) MultiView.renderUI();
    if (window.syncUIWithActiveSlot) syncUIWithActiveSlot();
    window.pDirty = true;
  };
  const _activeSlotShows = (re) => {
    if (typeof MultiView === 'undefined') return false;
    const mv = MultiView.getSettings();
    if (!mv.slots || !mv.slots.length) return false;
    const i = (typeof mv.activeSlot === 'number') ? mv.activeSlot : 0;
    return re.test(String(mv.slots[i] || ''));
  };
  const V = (id, label, viewId, re, icon) => C.push({
    id, kind: 'view', section: 'Види', label, icon,
    run() { _setActiveSlotView(viewId); },
    isActive() { return _activeSlotShows(re); },
  });
  V('view-iso', 'Ізометрія', 'iso', /^iso(_\d+)?$/,
    S('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12L4 7.5"/>'));
  V('view-persp', 'Перспектива', 'persp', /^persp(_\d+)?$/,
    S('<path d="M4 6l16-3v18l-16-3z"/><path d="M4 6v12"/><path d="M20 3v18"/>'));
  V('view-front', 'Спереду', 'front', /^front$/,
    S('<rect x="4" y="4" width="16" height="16" rx="1"/>'));
  V('view-back', 'Ззаду', 'back', /^back$/,
    S('<rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 2"/>'));
  V('view-left', 'Зліва', 'left', /^left$/,
    S('<rect x="10" y="4" width="10" height="16" rx="1"/><path d="M7 12H2"/><path d="M4.5 9.5 2 12l2.5 2.5"/>'));
  V('view-right', 'Справа', 'right', /^right$/,
    S('<rect x="4" y="4" width="10" height="16" rx="1"/><path d="M17 12h5"/><path d="M19.5 9.5 22 12l-2.5 2.5"/>'));
  V('view-top', 'Зверху', 'top', /^top$/,
    S('<rect x="4" y="10" width="16" height="10" rx="1"/><path d="M12 2v5"/><path d="M9.5 4.5 12 7l2.5-2.5"/>'));
  V('view-bottom', 'Знизу', 'bottom', /^bottom$/,
    S('<rect x="4" y="4" width="16" height="10" rx="1"/><path d="M12 22v-5"/><path d="M9.5 19.5 12 17l2.5 2.5"/>'));
  V('view-table', 'Деталі', 'table', /^table(_\d+)?$/,
    S('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18"/><path d="M3 14h18"/><path d="M9 4v16"/>'));
  V('view-table-full', 'Деталі+фурнітура', 'table_full', /^table_full(_\d+)?$/,
    S('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18"/><path d="M9 4v16"/><path d="M15 4v16"/>'));
  V('view-hw', 'Фурнітура', 'hw_table', /^hw_table(_\d+)?$/,
    S('<circle cx="12" cy="7" r="3.5"/><path d="M12 10.5V20"/><path d="M9.5 13.5h5"/><path d="M9.5 16.5h5"/>'));

  // ======== ПЕРЕМИКАЧІ (click по РІДНОМУ контролу секції — побічки успадковуються) ========
  const T = (id, section, label, ctl, icon) => C.push({
    id, kind: 'toggle', section, label, ctlId: ctl, icon,
    run() { clickCtl(ctl); },
    isActive() { return ctlOn(ctl); },
  });
  T('show-open', 'Відкривання', 'Показ відкривання (2D)', 'pres-showOpen',
    S('<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>'));
  T('physical-open', 'Відкривання', 'Фізичне відкриття (3D)', 'pres-physicalOpen',
    S('<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h20"/><path d="M13 20V4a1 1 0 0 0-1.2-1l-6 1.2A1 1 0 0 0 5 5.2V20"/>'));
  T('frame', 'Рамка', 'Рамка оформлення', 'showFrame',
    S('<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 17h18"/><path d="M14 17v4"/>'));
  T('shadow', 'Освітлення', 'Контактна тінь', 'lt-shadow-on',
    S('<circle cx="12" cy="9" r="5"/><path d="M5 20h14"/>', 2));
  C.push({ // build463 (pres): майстер-тумблер розмірів — типи рендеряться лише коли він увімкнений.
    id: 'dims-on', kind: 'toggle', section: 'Розміри', label: 'Увімкнути розміри', ctlId: 'pres-showDims',
    icon: S('<path d="M2 12h20"/><path d="M5 9v6"/><path d="M9 9v6"/><path d="M13 9v6"/><path d="M17 9v6"/><path d="M21 9v6"/>'),
    run() { if (window.pToggleDims) pToggleDims(); }, // НЕ clickCtl: onchange галки тягне recordState→saveCurrentPageState (скасовує інструменти); pToggleDims робить усе напряму
    isActive() { return ctlOn('pres-showDims'); },
  });
  // build464 (pres): тумблери ТИПІВ розмірів — ОДИН клік вмикає майстер+тип (pToggleDimType), а не просто
  // клікає галку типу (яка без майстра «Увімкнути розміри» нічого не малює). isActive = майстер && тип.
  const DT = (id, label, typeId, icon) => C.push({
    id, kind: 'toggle', section: 'Розміри', label, ctlId: typeId, icon,
    run() { if (window.pToggleDimType) pToggleDimType(typeId); },
    isActive() { return window.pDimTypeActive ? pDimTypeActive(typeId) : ctlOn(typeId); },
  });
  DT('dims-ov', 'Габаритні розміри', 'pres-dimT-ov',
    S('<path d="M3 21 21 3"/><path d="M3 21v-6"/><path d="M3 21h6"/><path d="M21 3v6"/><path d="M21 3h-6"/>'));
  DT('dims-cab', 'Розміри корпусів', 'pres-dimT-cab',
    S('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 12h16"/><path d="M12 3v9"/>'));
  DT('dims-int', 'Внутрішні розміри', 'pres-dimT-int',
    S('<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M8 8v8"/><path d="M16 8v8"/><path d="M8 12h8"/>'));
  DT('dims-nest', 'Розміри вкладень', 'pres-dimT-nest',
    S('<rect x="3" y="3" width="18" height="18" rx="1"/><rect x="8" y="8" width="8" height="8" rx="1"/>')); // build465 (pres): розміри вкладень

  // ======== ВІДОБРАЖЕННЯ (build395, юзер): стиль РЕНДЕРА моделі → у панель швидкого доступу ========
  // Колір/Ч-Б (setPresStyle) і Прозорість/X-Ray (togglePresXRay) керують малюванням моделі, а не
  // самими кнопками. У мультивиді ці функції міняють АКТИВНИЙ слот (pSlotSettings[i].style/.xray),
  // інакше — глобальні presStyle/pXRay; тож isActive рахує ЕФЕКТИВНЕ значення активного слота
  // (слот, якщо явно color/bw/on/off; інакше глобальне) — саме те, що бачить рендер. pDirty-сеттер
  // (движок) будить кадр → msTool.refresh() підсвічує іконку; синхронно з радіо/кнопкою секції в
  // обидва боки. presStyle/pXRay/pSlotSettings — var движка (голі імена); MultiView — const (не window).
  const _mvActiveSlot = () => {
    if (typeof MultiView === 'undefined') return null;
    const mv = MultiView.getSettings();
    // build412: SINGLE ТЕЖ читає pSlotSettings[activeSlot] (раніше повертали null → замороженою глобалкою).
    // Після вар.C стиль/прозорість single живуть у slot[0], а presStyle/pXRay заморожені → спецкейс single
    // ламав би тумблер «Ч/Б» (застрягав) та підсвітку індикаторів. Дзеркало до html-syncUIWithActiveSlot (E9).
    if (!mv || !mv.slots || !mv.slots.length) return null;
    const i = (typeof mv.activeSlot === 'number' && mv.activeSlot >= 0) ? mv.activeSlot : 0;
    return (typeof pSlotSettings !== 'undefined' && pSlotSettings[i]) ? pSlotSettings[i] : null;
  };
  const _effStyle = () => {
    const ss = _mvActiveSlot();
    if (ss && (ss.style === 'color' || ss.style === 'bw')) return ss.style;
    return (typeof presStyle !== 'undefined') ? presStyle : 'color';
  };
  const _effXRay = () => {
    const ss = _mvActiveSlot();
    if (ss && ss.xray === 'on') return true;
    if (ss && ss.xray === 'off') return false;
    return (typeof pXRay !== 'undefined') ? !!pXRay : false;
  };
  C.push({
    id: 'display-bw', kind: 'toggle', section: 'Відображення', label: 'Чорно-білий / Колір',
    icon: S('<path d="M12 2v20"/><rect x="2" y="2" width="20" height="20" rx="2"/>'),
    run() { if (typeof setPresStyle === 'function') setPresStyle(_effStyle() === 'bw' ? 'color' : 'bw'); },
    isActive() { return _effStyle() === 'bw'; },
  });
  C.push({
    id: 'display-xray', kind: 'toggle', section: 'Відображення', label: 'Прозорість (X-Ray)', ctlId: 'style-xray',
    icon: S('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
    run() { clickCtl('style-xray'); }, // #style-xray → togglePresXRay (успадковує всю логіку пер-слот/глобал)
    isActive() { return _effXRay(); },
  });

  // ======== КОМПОНОВКА ЛИСТА (build396, юзер): вибір сітки видів → у панель швидкого доступу ========
  // Генеруються з LAYOUTS (constants.js) — новий лейаут з'явиться в каталозі САМ (як link-команди з
  // DOM, не відстають). Іконка МАЛЮЄТЬСЯ з grid лейауту (% → 24px, зазор 0.8) — завжди відповідає
  // реальній сітці. run = MultiView.setLayout (штатний шлях селекта «Компонування»), isActive =
  // поточний лейаут → підсвітка активної компоновки на панелі.
  const _layoutIcon = (def) => {
    if (!def.grid || !def.grid.length) // 'free' — розкидані бокси (сітки нема)
      return S('<rect x="2" y="3" width="9" height="7" rx="1"/><rect x="13" y="7" width="8" height="6" rx="1"/><rect x="6" y="13" width="11" height="8" rx="1"/>', 1.5);
    const inner = def.grid.map(g =>
      '<rect x="' + (2 + g[0] * 0.2 + 0.4).toFixed(1) + '" y="' + (2 + g[1] * 0.2 + 0.4).toFixed(1) +
      '" width="' + Math.max(0.6, g[2] * 0.2 - 0.8).toFixed(1) +
      '" height="' + Math.max(0.6, g[3] * 0.2 - 0.8).toFixed(1) + '" rx="0.8"/>').join('');
    return S(inner, 1.4);
  };
  if (typeof LAYOUTS !== 'undefined') {
    Object.keys(LAYOUTS).forEach(key => {
      const def = LAYOUTS[key] || {};
      C.push({
        id: 'layout-' + key, kind: 'layout', section: 'Компоновка', label: def.name || key,
        icon: _layoutIcon(def),
        run() {
          if (typeof MultiView === 'undefined' || !MultiView.setLayout) return;
          // build396(ревью): ГАРД «вже цей лейаут». setLayout безумовно регенерує slots/rects/activeSlot
          // і скидає пер-слотові фільтри; рідний селект від цього захищений (повторний вибір тієї ж
          // опції не дає change), а кнопка — ні: клік по ПІДСВІЧЕНІЙ кнопці зносив би налаштовані види,
          // посунуті бокси й фільтри. Найгірше — 'free' (він вмикається сам при drag-drop виду на лист,
          // тож кнопка там завжди активна): setLayout('free') лишає ОДИН бокс iso_1.
          const mv = MultiView.getSettings();
          if (mv && mv.layout === key) return;
          MultiView.setLayout(key);
        },
        isActive() {
          if (typeof MultiView === 'undefined') return false;
          const mv = MultiView.getSettings();
          return !!mv && mv.layout === key;
        },
      });
    });
  }

  // ======== ПОСИЛАННЯ «відкрити секцію» — генеруються з DOM (не відстають від секцій) ========
  document.querySelectorAll('.sidebar-section[id]').forEach(sec => {
    const h3 = sec.querySelector('.section-header h3');
    if (!h3) return;
    const em = h3.querySelector('span');
    const label = (h3.textContent || '').replace(em ? em.textContent : '', '').trim();
    if (!label) return;
    C.push({
      id: 'open-' + sec.id, kind: 'link', section: 'Секції', label: label,
      icon: (em && em.textContent.trim()) || '📂', // emoji заголовка секції
      run() {
        sec.classList.remove('collapsed');
        // build472: НЕ scrollIntoView — він прокручував увесь скрол-контейнер зі smooth-анімацією,
        // що сприймалось як «весь інтерфейс з'їжджає вгору», і кидав секцію ПІД липку шапку кнопок
        // (position:sticky зверху сайдбара). Тепер вручну й МИТТЄВО крутимо САМЕ #sidebar так, щоб
        // заголовок секції став одразу під шапкою; головний холст при цьому не чіпається взагалі.
        try {
          var sb = document.getElementById('sidebar');
          if (sb) {
            var stick = sb.querySelector('.sidebar-section.no-border'); // липкі кнопки зверху (undo/redo + прапори)
            var pad = (stick ? stick.getBoundingClientRect().height : 0) + 6;
            var target = sb.scrollTop + (sec.getBoundingClientRect().top - sb.getBoundingClientRect().top) - pad;
            var maxTop = sb.scrollHeight - sb.clientHeight;
            sb.scrollTop = Math.max(0, Math.min(target, maxTop));
          } else {
            sec.scrollIntoView({ block: 'nearest' });
          }
        } catch (e) { try { sec.scrollIntoView({ block: 'nearest' }); } catch (e2) { } }
      },
    });
  });

  window.MSP_COMMANDS = C;
  window.msCmd = function (id) { for (let i = 0; i < C.length; i++) if (C[i].id === id) return C[i]; return null; };
  window.msRunCmd = function (id) { const c = window.msCmd(id); if (c && c.run) { try { c.run(); } catch (e) { } } };

  // ---------------- msTool: єдина точка стану ----------------
  window.msTool = {
    states: {},
    _subs: [],
    onChange(cb) { this._subs.push(cb); },
    // derived: перечитує isActive() усіх stateful-команд; зветься щокадру з presAnimate
    // (кожен вхід/вихід інструмента ставить pDirty → зміна ловиться в межах кадру)
    refresh() {
      for (let i = 0; i < C.length; i++) {
        const c = C[i];
        if (!c.isActive) continue;
        let on = false; try { on = !!c.isActive(); } catch (e) { }
        if (this.states[c.id] === on) continue;
        this.states[c.id] = on;
        for (let k = 0; k < this._subs.length; k++) { try { this._subs[k](c.id, on, c); } catch (e) { } }
      }
    },
    // централізоване взаємовиключення для панелі/нових споживачів (легасі-проводку не чіпаємо)
    cancelAllTools(exceptId) {
      for (let i = 0; i < C.length; i++) {
        const c = C[i];
        if (c.kind !== 'tool' || c.id === exceptId || !c.cancel) continue;
        let on = false; try { on = !!(c.isActive && c.isActive()); } catch (e) { }
        if (on) { try { c.cancel(); } catch (e) { } }
      }
      this.refresh();
    },
  };

  // ЄДИНА підсвітка: клас .msp-cmd-active на кнопці команди (замінює 3 інлайн-заливки
  // ручних розмірів, gt-active кружків і active-btn редактора дверей — CSS у pres_view.html)
  window.msTool.onChange(function (id, on, c) {
    if (!c.btnId) return;
    const el = $id(c.btnId); if (!el) return;
    el.classList.toggle('msp-cmd-active', on);
  });
})();
