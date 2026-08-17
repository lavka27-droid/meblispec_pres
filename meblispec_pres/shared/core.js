/* MebliSpec PRO — Core JS (Shared Logic) */

// build424: спільний формат розмірів — ФАКТИЧНЕ значення з десятою («364.0»), а не заокруглене
// до цілого. Основне визначення живе в engines/pres_engine.js; тут — фолбек на випадок, якщо
// core.js виконається раніше за рушій (специфікація малюється й до першого рендера 3D).
if (typeof window.pMm1 !== 'function') window.pMm1 = function (v) { return Math.round(v * 10) / 10; };
if (typeof window.pFmtMm !== 'function') window.pFmtMm = function (v) {
  return (typeof v === 'number' && isFinite(v)) ? (Math.round(v * 10) / 10).toFixed(1) : String(v);
};

let currentMode = null;
let pages = [];
let activePageId = null;
let pageIdCounter = 0;

// build77: ПРЕСЕТИ зберігаються у ФАЙЛАХ поряд із плагіном (<plugin>/presets/*.json) через Ruby-міст,
// а не в localStorage браузера (той прив'язаний до версії SketchUp і губиться з кешем).
// Тут — дзеркало в пам'яті + тонка обгортка; гідрація з диска при старті (+ одноразова міграція з localStorage).
window.__msPresets = window.__msPresets || { msp_page_presets: '{}', msp_proj_presets: '{}', msp_light_presets: '{}', msp_autodraw_presets: '{}' };
window.msPresetGet = function (key) {
  const v = window.__msPresets[key];
  if (typeof v !== 'string') return '{}';
  try { JSON.parse(v); return v; } catch (e) { return '{}'; }
};
window.msPresetSet = function (key, val) {
  window.__msPresets[key] = val;
  if (window.sketchup && sketchup.save_presets) sketchup.save_presets({ key: key, data: val });
};
window.onPresetsHydrate = function (all) {
  const isEmpty = (s) => { try { return Object.keys(JSON.parse(s || '{}')).length === 0; } catch (e) { return true; } };
  ['msp_page_presets', 'msp_proj_presets', 'msp_light_presets', 'msp_autodraw_presets'].forEach(k => {
    let v = (all && typeof all[k] === 'string') ? all[k] : '{}';
    // одноразова міграція старих пресетів із localStorage у файл, якщо у файлі ще порожньо
    if (isEmpty(v)) {
      let ls = null; try { ls = localStorage.getItem(k); } catch (e) { }
      if (ls && !isEmpty(ls)) { v = ls; if (window.sketchup && sketchup.save_presets) sketchup.save_presets({ key: k, data: v }); }
    }
    window.__msPresets[k] = v;
  });
  if (window.loadPresetsUI) loadPresetsUI();
  if (window.pLoadLightPresetsUI) pLoadLightPresetsUI();
  if (window.updateAutodrawPresetDropdown) updateAutodrawPresetDropdown();
};
window.requestPresetsFromDisk = function () {
  if (window.sketchup && sketchup.request_presets) sketchup.request_presets();
};
// build460: ГЛОБАЛЬНІ налаштування (конфіг панелей швидкого доступу тощо) — у localStorage. Переживає
// переоткриття діалогу й перезапуск SketchUp, глобально для всіх проєктів (аналог msp_global_settings
// SpecDraft, але без Ruby-файла/рестарту). quickbar.js зве pSaveGlobalSettings при КОЖНІЙ зміні.
window.pSaveGlobalSettings = function () {
  try {
    const gs = {
      quickBars: (Array.isArray(window.pQuickBars) ? window.pQuickBars : null),
      qabFrame: (window.pQabFrame && typeof window.pQabFrame === 'object') ? window.pQabFrame : null,
      // build492: СТИЛІ типів авторозмірів (маркер/колір/шрифт/обводка/зсуви — без .on) теж глобальні,
      // інакше при перезапуску плагіна кольори/шрифти скидались (юзер-баг #2: «постоянно нужно все менять»).
      dimTypeDefaults: (window.pDimTypeDefaults && typeof window.pDimTypeDefaults === 'object') ? window.pDimTypeDefaults : null
    };
    localStorage.setItem('msp_global_settings', JSON.stringify(gs));
  } catch (e) { }
};
window.pApplyGlobalSettings = function () {
  try {
    const gs = JSON.parse(localStorage.getItem('msp_global_settings') || 'null');
    if (!gs) return;
    if (Array.isArray(gs.quickBars) && window.msQabApplyConfig) msQabApplyConfig(gs.quickBars);
    if (gs.qabFrame && window.msQabApplyFrameConfig) msQabApplyFrameConfig(gs.qabFrame);
    // build492: відновлюємо глобальні стилі авторозмірів ДО initPres (той мержить window.pDimTypeDefaults у _defDims).
    if (gs.dimTypeDefaults && typeof gs.dimTypeDefaults === 'object') window.pDimTypeDefaults = gs.dimTypeDefaults;
  } catch (e) { }
};

let mvState = {
  enabled: false,
  layout: 'single',
  slots: ['persp', 'front', 'left', 'top'], // build280: дефолт «Перспектива» замість «Поточний вид»
  secondaryScale: 1.0,
  activeSlot: 0
};

const MultiView = {
  init() {
    this.renderUI();
  },

  getSettings() {
    return mvState;
  },

  setLayout(layoutId) {
    mvState.layout = layoutId;
    mvState.enabled = (layoutId !== 'single');
    mvState.activeSlot = 0;

    // Reset slots to defaults for the new layout
    const defaults = LAYOUT_DEFAULT_SLOTS[layoutId] || ['persp']; // build280
    mvState.slots = JSON.parse(JSON.stringify(defaults));

    this.renderUI();
    this.triggerRender();
  },

  setSlotView(slotIdx, viewType) {
    const oldView = mvState.slots[slotIdx];
    mvState.slots[slotIdx] = viewType;
    // build147: зріз пам'ятається ОКРЕМО для кожного типу виду — інакше «прилипав» при зміні виду
    if (oldView !== viewType && window.pSwapClipForView) window.pSwapClipForView(slotIdx, oldView, viewType);
    this.triggerRender();
  },

  setSecondaryScale(val) {
    mvState.secondaryScale = parseFloat(val);
    this.triggerRender();
  },

  triggerRender() {
    if (window.dr) window.dr();
    if (window.pDirty !== undefined) window.pDirty = true;
  },

  renderUI() {
    const container = document.getElementById('mv-layout-container');
    if (!container) return;

    container.innerHTML = '';

    // 1. Single Dropdown for Layout (build134: компактний рядок label+select)
    const layoutRow = document.createElement('div');
    layoutRow.style.cssText = 'display:flex; align-items:center; gap:6px; margin-bottom:6px;';
    const layoutLabel = document.createElement('span');
    layoutLabel.className = 'label-ui';
    layoutLabel.style.cssText = 'margin:0; white-space:nowrap; flex:0 0 auto;';
    layoutLabel.textContent = 'Компонування:';
    layoutRow.appendChild(layoutLabel);

    const layoutSelect = document.createElement('select');
    layoutSelect.className = 'select-ui';
    layoutSelect.style.height = '24px';
    layoutSelect.style.flex = '1';

    Object.keys(LAYOUTS).forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = LAYOUTS[id].name;
      if (mvState.layout === id) opt.selected = true;
      layoutSelect.appendChild(opt);
    });

    layoutSelect.onchange = (e) => this.setLayout(e.target.value);
    layoutRow.appendChild(layoutSelect);
    container.appendChild(layoutRow);

    const isMulti = mvState.enabled;
    // Видимість легенди — централізовано (тільки 1-й лист, тільки одиночний вид).
    updateLegendVisibility();

    if (isMulti) {
      // 3. Grid of selects: Налаштування видів
      const configLabel = document.createElement('span');
      configLabel.className = 'label-ui';
      configLabel.textContent = 'Налаштування видів:';
      container.appendChild(configLabel);

      const slotsGrid = document.createElement('div');
      slotsGrid.className = 'mv-slots-grid';
      const layout = LAYOUTS[mvState.layout];
      slotsGrid.style.gridTemplateColumns = '1fr'; // build136: один стовпець — кожен слот горизонтальний рядок

      for (let i = 0; i < layout.slots; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'mv-slot-item';
        slotDiv.style.cssText = 'display:flex; align-items:center; gap:4px; padding:3px 5px;'; // build136: горизонтальний рядок

        // Візуальне виділення активного слота
        const isActive = (i === (mvState.activeSlot || 0));
        slotDiv.style.border = isActive ? '1.5px solid #3b82f6' : '1px solid #e2e8f0';
        slotDiv.style.backgroundColor = isActive ? '#eff6ff' : '#ffffff';
        slotDiv.style.cursor = 'pointer';

        // build137: тільки цифра (крупніша); НЕ вибрано → у кружечку, вибрано → без кружечка
        const slotTitle = document.createElement('div');
        slotTitle.textContent = (i + 1);
        slotTitle.style.cssText = 'flex:0 0 auto; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; border-radius:50%; line-height:1;';
        if (isActive) {
          slotTitle.style.color = '#2563eb'; slotTitle.style.border = 'none'; slotTitle.style.background = 'transparent';
        } else {
          slotTitle.style.color = '#64748b'; slotTitle.style.border = '1.5px solid #cbd5e1'; slotTitle.style.background = '#fff';
        }
        slotDiv.appendChild(slotTitle);

        const select = document.createElement('select');
        select.className = 'select-ui'; select.title = 'Тип виду';
        select.style.cssText = 'font-size:10px; padding:2px; height:24px; flex:1.5; min-width:0;';

        const isPresMode = document.getElementById('pres-wrap') !== null;
        Object.keys(VIEW_TYPES).forEach(vId => {
        // if (isPresMode && (vId === 'table' || vId === 'table_full')) return; // Skip BOM in Presentation
          if (vId === 'custom') return; // build280: «Поточний вид» прибрано зі списку вибору (лишається лише як легасі-значення старих проектів)
          const opt = document.createElement('option');
          opt.value = vId; opt.textContent = VIEW_TYPES[vId].name;
          if (mvState.slots[i] === vId) opt.selected = true;
          select.appendChild(opt);
        });

        select.onchange = (e) => {
          this.setSlotView(i, e.target.value);
        };

        slotDiv.onclick = (e) => {
          // Не змінюємо активний слот, якщо клік був по випадаючому списку
          if (e.target.tagName !== 'SELECT') {
            mvState.activeSlot = i;
            this.renderUI();
            if (window.syncUIWithActiveSlot) window.syncUIWithActiveSlot();
          }
        };

        slotDiv.appendChild(select);

        if (isPresMode) {
          const styleSelect = document.createElement('select');
          styleSelect.className = 'select-ui'; styleSelect.title = 'Стиль виду';
          styleSelect.style.cssText = 'font-size:9px; padding:1px 2px; height:24px; flex:1; min-width:0;'; // build136: горизонтально

          const optG = document.createElement('option'); optG.value = ''; optG.textContent = 'Стиль';
          const optC = document.createElement('option'); optC.value = 'color'; optC.textContent = 'Колір';
          const optB = document.createElement('option'); optB.value = 'bw'; optB.textContent = 'Ч/Б';

          styleSelect.appendChild(optG); styleSelect.appendChild(optC); styleSelect.appendChild(optB);

          if (window.pSlotSettings && window.pSlotSettings[i] && window.pSlotSettings[i].style) {
            styleSelect.value = window.pSlotSettings[i].style;
          } else {
            styleSelect.value = '';
          }

          styleSelect.onchange = (e) => {
            if (window.pSlotSettings) {
              if (!window.pSlotSettings[i]) window.pSlotSettings[i] = { dims: {} };
              window.pSlotSettings[i].style = e.target.value;
              if (window.pDirty !== undefined) window.pDirty = true;
            }
          };
          slotDiv.appendChild(styleSelect);
          const xraySelect = document.createElement('select');
          xraySelect.className = 'select-ui'; xraySelect.title = 'Прозорість виду';
          xraySelect.style.cssText = 'font-size:9px; padding:1px 2px; height:24px; flex:1; min-width:0;'; // build136: горизонтально

          const optXG = document.createElement('option'); optXG.value = ''; optXG.textContent = 'Прозор.';
          const optXOn = document.createElement('option'); optXOn.value = 'on'; optXOn.textContent = 'Вкл';
          const optXOff = document.createElement('option'); optXOff.value = 'off'; optXOff.textContent = 'Викл';

          xraySelect.appendChild(optXG); xraySelect.appendChild(optXOn); xraySelect.appendChild(optXOff);

          if (window.pSlotSettings && window.pSlotSettings[i] && window.pSlotSettings[i].xray) {
            xraySelect.value = window.pSlotSettings[i].xray;
          } else {
            xraySelect.value = '';
          }

          xraySelect.onchange = (e) => {
            if (window.pSlotSettings) {
              if (!window.pSlotSettings[i]) window.pSlotSettings[i] = { dims: {} };
              window.pSlotSettings[i].xray = e.target.value;
              if (window.pDirty !== undefined) window.pDirty = true;
            }
          };
          slotDiv.appendChild(xraySelect);
        }

        slotsGrid.appendChild(slotDiv);
      }
      container.appendChild(slotsGrid);



    } else {
      // Single View: Camera selector (build134: компактний рядок)
      const camRow = document.createElement('div');
      camRow.style.cssText = 'display:flex; align-items:center; gap:6px; margin-bottom:4px;';
      const camLabel = document.createElement('span');
      camLabel.className = 'label-ui';
      camLabel.style.cssText = 'margin:0; white-space:nowrap; flex:0 0 auto;';
      camLabel.textContent = 'Вид:';
      camRow.appendChild(camLabel);

      const select = document.createElement('select');
      select.className = 'select-ui';
      select.style.height = '24px';
      select.style.flex = '1';
      const isPresMode = document.getElementById('pres-wrap') !== null;
      Object.keys(VIEW_TYPES).forEach(vId => {
        // if (isPresMode && (vId === 'table' || vId === 'table_full')) return; // Skip BOM in Presentation
        if (vId === 'custom') return; // build280: «Поточний вид» прибрано зі списку вибору
        const opt = document.createElement('option');
        opt.value = vId; opt.textContent = VIEW_TYPES[vId].name;
        if (mvState.slots[0] === vId) opt.selected = true;
        select.appendChild(opt);
      });
      select.onchange = (e) => {
        const vId = e.target.value;
        this.setSlotView(0, vId);
        if (vId !== 'custom' && window.setViewAngle) window.setViewAngle(vId);
      };
      camRow.appendChild(select);
      container.appendChild(camRow);
    }

    if (window.translateDOM) window.translateDOM(container);
  }
};

// === LEGEND VISIBILITY ===
// Легенда матеріалів показується ЛИШЕ на першому (титульному) листі і лише в одиночному
// виді. На решті сторінок ховається, щоб не дублюватись у перегляді та в експорті PDF.
function isFirstPresPage() {
  if (typeof pages === 'undefined' || !pages.length) return true;
  return pages[0].id === activePageId;
}
window.isFirstPresPage = isFirstPresPage;

function updateLegendVisibility() {
  const legend = document.getElementById('pres-legend');
  if (!legend) return;
  const isMulti = (typeof mvState !== 'undefined' && mvState.enabled);
  // build82: показуємо легенду й на НЕ-першому листі, якщо на ньому є зовнішні (спарсені) матеріали —
  // їх дозволено додавати на будь-який лист (авто-матеріали моделі лишаються лише на першому).
  const hasExt = (typeof pData !== 'undefined' && pData && pData.extMaterials && pData.extMaterials.length > 0);
  legend.style.display = ((isFirstPresPage() || hasExt) && !isMulti) ? 'flex' : 'none';
}
window.updateLegendVisibility = updateLegendVisibility;

// === PAGE MANAGEMENT ===
function initPages(mode) {
  currentMode = mode;
  pages = [];
  pageIdCounter = 0;
  if (window.showLoader) showLoader();
  addPage(); // Create first page
  MultiView.init();
}

function getDefaultPageState(type) {
  return {
    camera: null,
    explode: (type === 'assembly'),
    labels: (type === 'assembly'),
    hideHardware: (type === 'install'),
    mv: JSON.parse(JSON.stringify(mvState)), // Clone default MV state
    subPages: [],
    activeSubPageIndex: -1
  };
}

function addPage(type = 'pres') {
  if (!currentMode) return;
  saveCurrentPageState();

  const currentPage = pages.find(p => p.id === activePageId);
  // На нову сторінку переноситься тільки модель з 1 сторінки
  const inheritedData = (pages.length > 0 && pages[0].data) ? pages[0].data : (currentPage ? currentPage.data : null);

  const newState = getDefaultPageState(type);
  // З 1 сторінки на нову переносяться ТІЛЬКИ: рамка оформлення + відкривання дверей.
  // Всі інші параметри (стиль, вид, зум, розміри, перерізи, освітлення) — строго дефолтні.
  const firstState = (pages.length > 0 && pages[0].state) ? pages[0].state : null;

  // Рамка оформлення — якщо увімкнена на 1 сторінці
  if (firstState && firstState.frame && firstState.frame.show) {
    newState.frame = JSON.parse(JSON.stringify(firstState.frame));
    newState.frame.title = ''; // Очищаємо заголовок для нової сторінки
  }

  // Відкривання дверей — завжди з 1 сторінки (конфігурація єдина для всього проекту)
  if (firstState && Array.isArray(firstState.doors)) {
    newState.doors = JSON.parse(JSON.stringify(firstState.doors));
  } else {
    newState.doors = [];
  }

  // build133: освітлення — СПІЛЬНЕ для проекту → нова сторінка успадковує поточне (а не скидає на заводське).
  if (firstState && firstState.lights) {
    newState.lights = JSON.parse(JSON.stringify(firstState.lights));
  }

  pageIdCounter++;

  let typeName = 'Стор.';
  if (type === 'install') typeName = 'Монтаж';
  if (type === 'assembly') typeName = 'Збірка';
  if (type === 'drawing') typeName = 'Креслення';

  const pgName = typeName + ' ' + (pages.length + 1);
  const pg = { id: pageIdCounter, name: pgName, type: type, state: newState, data: inheritedData };
  pages.push(pg);

  activePageId = pg.id;

  if (currentMode === 'pres' && typeof pActivePageId !== 'undefined') {
    pActivePageId = activePageId;
  }

  renderTabs();
  updateA4Footer(pg);

  if (pg.data) {
    if (currentMode === 'pres' && window.initPres) {
      if (typeof pData !== 'undefined' && pg.state) {
        pData.legendPos = pg.state.legendPos ? JSON.parse(JSON.stringify(pg.state.legendPos)) : null;
      }
      initPres(pg.data, activePageId);
    }
  } else {
    if (window.clearViewport) clearViewport();
  }

  restorePageState(pg.state);
}

function switchToPage(id) {
  if (id === activePageId) return;
  saveCurrentPageState();
  activePageId = id;
  renderTabs();

  const pg = pages.find(p => p.id === id);
  if (pg) {
    if (pg.data) {
      if (currentMode === 'pres' && window.initPres) {
        // pData може бути ОГОЛОШЕНОЮ і при цьому null (до першого initPres).
        // typeof null === "object", тому перевірка на 'undefined' його НЕ ловила:
        // присвоєння падало з "Cannot set properties of null (setting 'legendPos')",
        // виняток обривав _projBuildFromDecoded на кроці 5 — і сторінка лишалась
        // недобудованою (виглядало як «плагін бачить половину проєкту»).
        if (typeof pData !== 'undefined' && pData && pg.state) {
          pData.legendPos = pg.state.legendPos ? JSON.parse(JSON.stringify(pg.state.legendPos)) : null;
        }
        initPres(pg.data, activePageId);
      }
    } else {
      if (window.clearViewport) clearViewport();
    }
    restorePageState(pg.state);
    updateA4Footer(pg);
  }
}

function removePage(id) {
  if (pages.length <= 1) return;
  const idx = pages.findIndex(p => p.id === id);
  if (idx < 0) return;
  pages.splice(idx, 1);

  // Перенумерація сторінок
  pages.forEach((pg, i) => {
    const isDefault = /^(Стор\.|Монтаж|Збірка|Креслення|Pg\.|Install|Assembly|Drawing)\s\d+$/.test(pg.name); // build90: + EN-назви
    if (isDefault) {
      let tName = 'Стор.';
      if (pg.type === 'install') tName = 'Монтаж';
      if (pg.type === 'assembly') tName = 'Збірка';
      if (pg.type === 'drawing') tName = 'Креслення';
      pg.name = tName + ' ' + (i + 1);
    }
  });

  if (activePageId === id) {
    activePageId = pages[Math.min(idx, pages.length - 1)].id;
    const newActiveId = activePageId;
    activePageId = null;
    switchToPage(newActiveId);
  } else {
    renderTabs();
    const activePg = pages.find(p => p.id === activePageId);
    if (activePg) updateA4Footer(activePg);
  }
}

function renderTabs() {
  const tabsEl = document.getElementById('pages-tabs');
  if (!tabsEl) return;
  tabsEl.innerHTML = '';
  pages.forEach(pg => {
    const tab = document.createElement('div');
    tab.className = 'page-tab' + (pg.id === activePageId ? ' active' : '');
    tab.innerHTML = '<span class="page-tab-name">' + pg.name + '</span>' +
      (pages.length > 1 ? '<span class="page-tab-close" onclick="event.stopPropagation();removePage(' + pg.id + ')">✕</span>' : '');
    tab.onclick = () => switchToPage(pg.id);

    tab.ondblclick = (e) => {
      e.stopPropagation();
      const nameEl = tab.querySelector('.page-tab-name');
      const input = document.createElement('input');
      input.type = 'text'; input.value = pg.name; input.className = 'page-tab-name';
      input.style.cssText = 'width:80px;font-size:11px;padding:0;border:1px solid #007bff;outline:none;';
      nameEl.replaceWith(input); input.focus(); input.select();
      const finish = () => { pg.name = input.value || pg.name; renderTabs(); };
      input.onblur = finish; input.onkeydown = (ev) => { if (ev.key === 'Enter') finish(); };
    };

    // Drag and Drop (Сортування вкладок ЛКМ)
    tab.draggable = true;
    tab.ondragstart = (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', pg.id);
      tab.style.opacity = '0.5';
    };
    tab.ondragend = () => {
      tab.style.opacity = '';
      document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('drag-over'));
    };
    tab.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };
    tab.ondragenter = () => {
      tab.classList.add('drag-over');
    };
    tab.ondragenter.bind(tab);
    tab.ondragleave = () => {
      tab.classList.remove('drag-over');
    };
    tab.ondrop = (e) => {
      e.preventDefault();
      const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (draggedId !== pg.id) {
        const draggedIndex = pages.findIndex(p => p.id === draggedId);
        const targetIndex = pages.findIndex(p => p.id === pg.id);
        if (draggedIndex !== -1 && targetIndex !== -1) {
          if (window.UndoManager && !window.UndoManager.isRestoring) {
            window.UndoManager.recordState();
          }
          const [draggedPage] = pages.splice(draggedIndex, 1);
          pages.splice(targetIndex, 0, draggedPage);

          // Перенумерація сторінок (як при видаленні)
          pages.forEach((p, i) => {
            const isDefault = /^(Стор\.|Монтаж|Збірка|Креслення|Pg\.|Install|Assembly|Drawing)\s\d+$/.test(p.name);
            if (isDefault) {
              let tName = 'Стор.';
              if (p.type === 'install') tName = 'Монтаж';
              if (p.type === 'assembly') tName = 'Збірка';
              if (p.type === 'drawing') tName = 'Креслення';
              p.name = tName + ' ' + (i + 1);
            }
          });

          if (window.saveCurrentPageState) window.saveCurrentPageState();
          renderTabs();
          const activePg = pages.find(p => p.id === activePageId);
          if (activePg && window.updateA4Footer) window.updateA4Footer(activePg);
          // build326: легенда матеріалів видима лише на pages[0] (isFirstPresPage) — після
          // drag-перестановки вкладок сам масив pages змінюється, а видимість легенди (простий
          // display:flex/none, виставлений МИНУЛОГО разу) ніхто не перераховував → на новій
          // 1-й сторінці легенда лишалась схованою (юзер: «при перемещении страниц с первой
          // страницы пропадает легенда материалов»).
          if (window.updateLegendVisibility) window.updateLegendVisibility();
          if (window.pDirty !== undefined) window.pDirty = true;
        }
      }
    };

    tabsEl.appendChild(tab);
  });
  if (window.translateDOM) translateDOM(tabsEl); // build90: переклад назв вкладок (Стор./Монтаж/...)
}

function refreshModel() {
  // build86: звичайне «Оновити модель» завжди скидає режим «Оновити проект» —
  // інакше після невдалого project-update наступний refresh пішов би не тим шляхом.
  window.__msProjUpdateMode = false;
  // Clear any physical door animations in presentation mode
  if (window.pDoorData !== undefined) window.pDoorData = [];
  if (window.pageDoors !== undefined) window.pageDoors = [];

  // Clear manual annotations for the active page
  if (typeof activePageId !== 'undefined') {
    if (window.pManualDims) { window.pManualDims.forEach(m => { if (m.pageId === activePageId && m.div) m.div.remove(); }); window.pManualDims = window.pManualDims.filter(m => m.pageId !== activePageId); }
    if (window.pCallouts) { window.pCallouts.forEach(m => { if (m.pageId === activePageId && m.div) m.div.remove(); if (m.pageId === activePageId && m.toolbar) m.toolbar.remove(); }); window.pCallouts = window.pCallouts.filter(m => m.pageId !== activePageId); }
    if (window.pLoupes) { window.pLoupes.forEach(m => { if (m.pageId === activePageId) { if (m.canvas) m.canvas.remove(); if (m.textDiv) m.textDiv.remove(); if (m.toolbar) m.toolbar.remove(); } }); window.pLoupes = window.pLoupes.filter(m => m.pageId !== activePageId); }
    if (window.pDescBlocks) { window.pDescBlocks.forEach(m => { if (m.pageId === activePageId && m.div) m.div.remove(); if (m.pageId === activePageId && m.toolbar) m.toolbar.remove(); }); window.pDescBlocks = window.pDescBlocks.filter(m => m.pageId !== activePageId); }
  }

  // Reset the current page state to defaults so it's a completely fresh start
  if (typeof pages !== 'undefined' && typeof activePageId !== 'undefined' && window.getDefaultPageState) {
    const pg = pages.find(p => p.id === activePageId);
    if (pg) {
      pg.state = window.getDefaultPageState();
      if (window.restorePageState) window.restorePageState(pg.state);
    }
  } else if (typeof saveCurrentPageState === 'function') {
    saveCurrentPageState();
  }

  if (window.showLoader) showLoader();
  const quality = document.getElementById('qualityMode')?.value || 'low';
  if (window.sketchup) sketchup.refresh({ quality: quality, threshold: 500 });
}

async function clearModel() {
  if (!await msConfirm('Очистити 3D геометрію на цій сторінці? (Зовнішні матеріали і анотації залишаться)', { danger: true })) return;

  if (typeof pages !== 'undefined' && typeof activePageId !== 'undefined') {
    const pg = pages.find(p => p.id === activePageId);
    if (pg) {
      // Ensure data object exists so we can store external materials
      if (!pg.data) {
        pg.data = { parts: [], global: { l: 1000, w: 1000, h: 1000, max: 1000 } };
      }

      // Wipe 3D parts from the page's saved data
      // Deep clone to detach from previous page if inherited!
      pg.data = JSON.parse(JSON.stringify(pg.data));
      pg.data.parts = [];

      // If we are actively in Presentation mode, instantly re-initialize the 3D scene
      if (typeof currentMode !== 'undefined' && currentMode === 'pres' && window.initPres) {
        window.initPres(pg.data, pg.id);
        if (window.restorePageState && pg.state) {
          setTimeout(() => { window.restorePageState(pg.state); }, 50);
        }
      }

      if (typeof window.pDirty !== 'undefined') window.pDirty = true;
    }
  }
}

// Geometry Binary Decoding
const GeometryUtils = {
  b64ToAB(b64) {
    if (!b64) return new ArrayBuffer(0);
    try {
      const cleaned = b64.replace(/\s/g, '');
      const bin = atob(cleaned);
      const buf = new ArrayBuffer(bin.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
      return buf;
    } catch (e) {
      console.error("Base64 Decode Error:", e);
      return new ArrayBuffer(0);
    }
  },
  decodeBuffer(b64, type = 'float32') {
    const ab = this.b64ToAB(b64);
    if (type === 'uint32') return new Uint32Array(ab);
    if (type === 'uint16') return new Uint16Array(ab);
    return new Float32Array(ab);
  },
  decodeDataAsync(data, callback) {
    // build86: parts може прийти зіпсованим із зовні редагованого файлу проекту
    // (не-масив, null-елементи) — гарантуємо рівно ОДИН виклик callback за будь-якого збою,
    // інакше відновлення проекту зависає з вічним лоадером.
    if (!data || !Array.isArray(data.parts)) {
      callback(data);
      return;
    }

    const workerCode = `
      function b64ToAB(b64) {
        if (!b64) return new ArrayBuffer(0);
        try {
          const cleaned = b64.replace(/\\s/g, '');
          const bin = atob(cleaned);
          const buf = new ArrayBuffer(bin.length);
          const view = new Uint8Array(buf);
          for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
          return buf;
        } catch (e) {
          return new ArrayBuffer(0);
        }
      }

      self.onmessage = function(e) {
        const { parts } = e.data;
        const transferables = [];
        const decodedGeoms = [];

        parts.forEach((p, idx) => {
          if (p && p.geom) {
            const g = p.geom;
            const item = { idx: idx, v: null, i: null, uv: null, e: null };
            if (g.v) {
              item.v = b64ToAB(g.v);
              transferables.push(item.v);
            }
            if (g.i) {
              item.i = b64ToAB(g.i);
              transferables.push(item.i);
            }
            if (g.uv) {
              item.uv = b64ToAB(g.uv);
              transferables.push(item.uv);
            }
            // build85: контурні рёбра теж декодуємо у worker'і — раніше edgesDecoded ніде
            // не виставлявся, і initPres atob-декодував рёбра синхронно на головному потоці.
            if (g.edges) {
              item.e = b64ToAB(g.edges);
              transferables.push(item.e);
            }
            decodedGeoms.push(item);
          }
        });

        self.postMessage({ decodedGeoms }, transferables);
      };
    `;

    // build86: синхронний фолбек-декодер (onerror воркера / збій створення воркера)
    const syncDecode = () => {
      data.parts.forEach(p => {
        if (p && p.geom) {
          if (p.geom.v) p.geom.vDecoded = GeometryUtils.decodeBuffer(p.geom.v, 'float32');
          if (p.geom.i) p.geom.iDecoded = GeometryUtils.decodeBuffer(p.geom.i, 'uint32');
          if (p.geom.uv) p.geom.uvDecoded = GeometryUtils.decodeBuffer(p.geom.uv, 'float32');
          if (p.geom.edges) p.geom.edgesDecoded = GeometryUtils.decodeBuffer(p.geom.edges, 'float32');
        }
      });
    };

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));

      // build86: callback рівно один раз, що б не сталося (onmessage І onerror можуть
      // спрацювати обидва; виняток усередині обробника не повинен «з'їсти» callback)
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        try { worker.terminate(); } catch (e) { }
        callback(data);
      };

      worker.onmessage = function (e) {
        try {
          const { decodedGeoms } = e.data;
          decodedGeoms.forEach(item => {
            const p = data.parts[item.idx];
            if (p && p.geom) {
              if (item.v) p.geom.vDecoded = new Float32Array(item.v);
              if (item.i) p.geom.iDecoded = new Uint32Array(item.i);
              if (item.uv) p.geom.uvDecoded = new Float32Array(item.uv);
              if (item.e) p.geom.edgesDecoded = new Float32Array(item.e);
            }
          });
        } catch (err) {
          console.error("Decode apply error:", err);
        } finally {
          finish();
        }
      };

      worker.onerror = function (err) {
        console.error("Worker Error:", err);
        try { syncDecode(); } catch (e) { console.error("Sync decode error:", e); }
        finish();
      };

      worker.postMessage({ parts: data.parts });
    } catch (err) {
      console.warn("Worker creation failed, falling back to sync decoding:", err);
      try { syncDecode(); } catch (e) { console.error("Sync decode error:", e); }
      callback(data);
    }
  }
};

function backToSelector() {
  if (window.sketchup) sketchup.back_to_landing();
}

window.updateData = function (data) {
  if (window.showLoader) showLoader();
  GeometryUtils.decodeDataAsync(data, (decodedData) => {
    // build85: лоадер ховаємо ПІСЛЯ побудови сцени (initPres — найважча синхронна фаза);
    // раніше він зникав ДО неї, і діалог виглядав «завислим» без індикатора.
    try {
      // build86: режим «Оновити проект» — свіжа геометрія застосовується до ВСІХ сторінок
      // зі збереженням станів, розмірів і анотацій (обробник у inline-скрипті pres_view.html).
      // Намір розпізнаємо за маркером У ДАНИХ (надійно, не залежить від таймінгу) АБО за
      // глобальним флагом (сумісність). Маркер у даних — головний шлях.
      const _projUpd = (decodedData && decodedData.__projUpdate) || window.__msProjUpdateMode;
      if (_projUpd && window.__msApplyProjectUpdate) {
        window.__msProjUpdateMode = false;
        if (decodedData) delete decodedData.__projUpdate; // не лишати службове поле в pg.data
        window.__msApplyProjectUpdate(decodedData);
      } else {
        const pg = pages.find(p => p.id === activePageId);
        if (pg) {
          pg.data = decodedData;
          // build348 (порт specdraft build271): якщо чекає автопроект (.skp) — НЕ будуємо
          // дефолтну сторінку, її замінять сторінки зі стану (та сама геометрія роздається
          // всім нижче через __msApplyAutoState).
          if (currentMode === 'pres' && window.initPres && !window.__pendingAutoState) initPres(decodedData, activePageId);
          // build176: список тегів для «Приховати за тегом» будується з pData.parts, який
          // щойно з'явився — без цього виклику панель лишалась порожньою до першого
          // перемикання сторінки (те й давало б restorePageState).
          if (window.pRenderTagFilterUI) pRenderTagFilterUI();
        }
        // build348: автозавантаження проекту зі стану, збереженого в атрибуті моделі.
        // Геометрію (decodedData) роздаємо всім сторінкам через _projBuildFromDecoded.
        if (window.__pendingAutoState && window.__msApplyAutoState) {
          const _st = window.__pendingAutoState; window.__pendingAutoState = null;
          try { window.__msApplyAutoState(_st, decodedData); } catch (e) { console.error('autoState', e); if (window.hideLoader) window.hideLoader(); }
        }
      }
    } finally {
      // build348: дані застосовані (включно з відновленням знімка) → тіки автосейву можна знову
      window.__msAwaitRestore = false;
      if (window.hideLoader) hideLoader();
    }
  });
};

function setupLoader() {
  if (document.getElementById('global-loader')) return;
  const style = document.createElement('style');
  style.innerHTML = `
    #global-loader { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(241, 245, 249, 0.4); z-index: 9999; justify-content: center; align-items: center; }
    .loader-box { background: #fff; padding: 30px 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); display: flex; flex-direction: column; align-items: center; gap: 15px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .loader-text { font-size: 14px; color: #475569; font-family: sans-serif; }
  `;
  document.head.appendChild(style);
  const loader = document.createElement('div');
  loader.id = 'global-loader';
  loader.innerHTML = '<div class="loader-box"><div class="spinner"></div><div class="loader-text">' + (window.t ? t('Обробка...') : 'Обробка...') + '</div></div>';
  document.body.appendChild(loader);
}

function showLoader() { setupLoader(); const el = document.getElementById('global-loader'); if (el) el.style.display = 'flex'; }
window.showLoader = showLoader;
function hideLoader() { const loader = document.getElementById('global-loader'); if (loader) loader.style.display = 'none'; }
window.hideLoader = hideLoader;

function updateFooterDate() {
  const now = new Date();
  const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} р.`;
  const el = document.getElementById('footer-date');
  if (el) el.innerText = dateStr;
}

function scaleSheet() {
  const container = document.getElementById('viewport');
  const sheet = document.getElementById('a4-sheet');
  if (!container || !sheet) return;
  const padding = 30;
  // build457: резервуємо місце під панелі швидкого доступу (top/left/right), інакше при щільному
  // фіті лист заповнює viewport і панелі налазять на нього (порт логіки SpecDraft build390/392).
  // Лист центрований → бічний зазор = (W − sw·scale)/2; щоб зазор ≥ w+2·GAP, резерв = 2·(w+12) − padding.
  let _qabReserve = 0, _qabH0 = 0, _qabReserveW = 0;
  const _qabTop = document.getElementById('msp-qab-top');
  const _qabSideW = () => {
    let w = 0;
    ['msp-qab-left', 'msp-qab-right'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none' && el.offsetWidth > w) w = el.offsetWidth;
    });
    return w;
  };
  const _qabW0 = _qabSideW();
  if (_qabW0) {
    _qabReserveW = Math.max(0, 2 * (_qabW0 + 12) - padding);
    _qabReserveW = Math.min(_qabReserveW, Math.max(0, container.clientWidth - padding - 60)); // листу мінімум 60px
  }
  if (_qabTop && _qabTop.style.display !== 'none' && _qabTop.offsetHeight) {
    _qabH0 = _qabTop.offsetHeight;
    _qabReserve = Math.max(0, 2 * (_qabH0 + 12) - padding);
    _qabReserve = Math.min(_qabReserve, Math.max(0, container.clientHeight - padding - 40));
  }
  const cw = container.clientWidth - padding - _qabReserveW, ch = container.clientHeight - padding - _qabReserve;
  const sw = sheet.offsetWidth, sh = sheet.offsetHeight;
  const scale = Math.max(0.05, Math.min(cw / sw, ch / sh));
  sheet.style.transform = `scale(${scale})`;
  if (window.msQabPlace) msQabPlace(); // build455/457: панелі швидкого доступу липнуть до країв листа
  // build457: якщо від нової ширини листа змінилась к-сть рядів верхньої панелі (flex-wrap) — один репас
  const _topChanged = _qabTop && _qabTop.style.display !== 'none' && _qabTop.offsetHeight !== _qabH0;
  if ((_topChanged || _qabSideW() !== _qabW0) && !window.__qabRepass) {
    window.__qabRepass = true;
    try { scaleSheet(); } finally { window.__qabRepass = false; }
  }
}

// build457: Trello-стиль reorder (ghost-клон + placeholder + FLIP-розʼїзд сусідів) — порт зі SpecDraft
// core.js. Потрібен quickbar.js для перетягування іконок ПРЯМО НА ПАНЕЛІ та списку «Обрані» в налаштуваннях.
// opts: { container, itemSelector, axis:'x'|'y'|'grid', canTarget?(tgt), onCommit?(items,lastTgt), onClick?() }
window.msWireReorderDrag = function (itemEl, e, opts) {
  if (e.button !== 0) return;
  const container = opts.container || itemEl.parentElement; if (!container) return;
  const sel = opts.itemSelector;
  e.preventDefault(); if (e.stopPropagation) e.stopPropagation();
  const startX = e.clientX, startY = e.clientY;
  let dragging = false, ghost = null, offX = 0, offY = 0, lastTgt = null;
  const begin = () => {
    dragging = true;
    const rect = itemEl.getBoundingClientRect();
    offX = startX - rect.left; offY = startY - rect.top;
    ghost = itemEl.cloneNode(true);
    ghost.classList.add('msp-reorder-ghost');
    ghost.style.width = rect.width + 'px'; ghost.style.height = rect.height + 'px';
    ghost.style.left = (startX - offX) + 'px'; ghost.style.top = (startY - offY) + 'px';
    document.body.appendChild(ghost);
    itemEl.classList.add('msp-reorder-placeholder');
    document.body.style.cursor = 'grabbing'; document.body.style.userSelect = 'none';
  };
  const flip = (ref) => {
    const items = [].slice.call(container.querySelectorAll(sel));
    const first = new Map(items.map(t => { const r = t.getBoundingClientRect(); return [t, [r.left, r.top]]; }));
    container.insertBefore(itemEl, ref);
    items.forEach(t => { t.style.transition = 'none'; t.style.transform = ''; });
    const last = new Map(items.map(t => { const r = t.getBoundingClientRect(); return [t, [r.left, r.top]]; }));
    items.forEach(t => {
      if (t === itemEl) return;
      const dx = first.get(t)[0] - last.get(t)[0], dy = first.get(t)[1] - last.get(t)[1];
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) t.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    requestAnimationFrame(() => {
      items.forEach(t => {
        if (t === itemEl || !t.style.transform) return;
        t.style.transition = 'transform 0.15s ease';
        t.style.transform = '';
      });
    });
  };
  const onMove = (em) => {
    if (!dragging) {
      if (Math.abs(em.clientX - startX) < 4 && Math.abs(em.clientY - startY) < 4) return;
      begin();
    }
    ghost.style.left = (em.clientX - offX) + 'px';
    ghost.style.top = (em.clientY - offY) + 'px';
    const under = document.elementFromPoint(em.clientX, em.clientY);
    const tgt = (under && under.closest) ? under.closest(sel) : null;
    if (!tgt || tgt === itemEl || tgt.parentElement !== container) return;
    if (opts.canTarget && !opts.canTarget(tgt)) return;
    lastTgt = tgt;
    const r = tgt.getBoundingClientRect();
    let after;
    if (opts.axis === 'y') after = em.clientY > r.top + r.height / 2;
    else if (opts.axis === 'grid') {
      if (em.clientY < r.top) after = false;
      else if (em.clientY > r.bottom) after = true;
      else after = em.clientX > r.left + r.width / 2;
    }
    else after = em.clientX > r.left + r.width / 2;
    const ref = after ? tgt.nextSibling : tgt;
    if (ref === itemEl || itemEl.nextSibling === ref) return;
    flip(ref);
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('mouseleave', onUp);
    document.body.style.cursor = ''; document.body.style.userSelect = '';
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    itemEl.classList.remove('msp-reorder-placeholder');
    if (!dragging) { if (opts.onClick) { try { opts.onClick(); } catch (e2) { } } return; }
    if (opts.onCommit) { try { opts.onCommit([].slice.call(container.querySelectorAll(sel)), lastTgt); } catch (e2) { } }
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('mouseleave', onUp);
};

function updateA4Footer(pg) {
  const titleEl = document.getElementById('footer-title');
  const pageEl = document.getElementById('footer-page');
  if (titleEl && pg) {
    let suffix = ' | ' + (window.t ? t('Презентація') : 'Презентація');
    titleEl.innerText = pg.name + suffix;
    if (window.translateDOM) translateDOM(titleEl); // build90: переклад назви сторінки у футері
  }
  if (pageEl && pg) {
    const idx = pages.findIndex(p => p.id === pg.id);
    // build200: коли активна підсторінка (Специфікація-продовження/Креслення) — додаємо
    // «/N» (номер підсторінки, з 1), щоб на екрані й у друкованому PDF було видно, яка саме
    // частина сторінки зараз показана — інакше всі підсторінки однієї сторінки виглядали
    // однаково пронумерованими («2»), не розрізнити «Специфікація 2» від «Специфікація 3».
    const subIdx = (pg.state && typeof pg.state.activeSubPageIndex === 'number') ? pg.state.activeSubPageIndex : -1;
    pageEl.innerText = 'A4 ' + (idx + 1) + (subIdx >= 0 ? ('/' + (subIdx + 1)) : '');
  }
  if (typeof updateStamp === 'function') {
    updateStamp();
  }
}

function renderSubPages() {
  const bar = document.getElementById('sub-pages-bar');
  if (!bar) return;
  const pg = pages.find(p => p.id === activePageId);
  if (!pg || !pg.state.subPages || !pg.state.subPages.length) { bar.style.display = 'none'; switchSubView('model'); return; }
  bar.style.display = 'flex';
  bar.innerHTML = '<div class="sub-tab ' + (pg.state.activeSubPageIndex === -1 ? 'active' : '') + '" onclick="switchToSubPage(-1)">3D Вид</div>';
  pg.state.subPages.forEach((s, idx) => {
    bar.innerHTML += '<div class="sub-tab ' + (pg.state.activeSubPageIndex === idx ? 'active' : '') + '" onclick="switchToSubPage(' + idx + ')">' + s.name + '</div>';
  });
}

function switchToSubPage(idx) {
  const pg = pages.find(p => p.id === activePageId);
  if (!pg) return;
  if (!Array.isArray(pg.state.subPages)) pg.state.subPages = [];
  if (idx >= pg.state.subPages.length) idx = -1; // сторінка/дані застаріли — не падаємо, а йдемо на 3D вид
  pg.state.activeSubPageIndex = idx;
  // build443: на «3D Вид» теж перемальовуємо дошку фурнітури — інакше при поверненні з вкладки
  // «Фурнітура 2/3» лишався зріз тієї вкладки (слайс 1), а не слайс 0 (перші 36). renderHwBoard
  // безпечний і на звичайних листах (без hwBoard просто прибирає контейнер).
  if (idx === -1) { switchSubView('model'); if (window.renderHwBoard) setTimeout(() => window.renderHwBoard(), 30); if (window.renderHwQtyTable) setTimeout(() => window.renderHwQtyTable(), 30); }
  else {
    const sub = pg.state.subPages[idx];
    if (!sub) { switchSubView('model'); }
    else if (sub.type === 'bom') {
      switchSubView('bom');
      if (pg.data) {
        // Пагінація (авто-«Специфікація 2/3/…») перераховується лише коли заходимо на
        // ПЕРШУ (первинну) сторінку специфікації — природна точка, де дані вже могли
        // змінитися (модель/сортування/фурнітура/фільтр корпусів). На продовженнях просто
        // рендеримо збережений зріз без перепланування (інакше вкладки «стрибали» б).
        const bomSubs = pg.state.subPages.filter(s => s.type === 'bom');
        if (sub === bomSubs[0]) fillBOM(pg.data);
        else renderBOMSubPageSlice(pg, sub);
      }
    }
    else if (sub.type === 'drawing') { switchSubView('drawing'); if (window.renderPartDrawing) { setTimeout(() => renderPartDrawing(sub.part), 50); } }
    // build442: підсторінка дошки фурнітури — той самий чистий лист (model-view), але renderHwBoard
    // покаже ЗРІЗ саме цієї вкладки (по 36 карток). Слайс 0 живе на «3D Вид», продовження — тут.
    // build564-fix (юзер: «накладывание» — картки «Фурнітура 2» лишались в DOM поверх нової
    // таблиці «Кількість», бо ця гілка кликала ЛИШЕ renderHwQtyTable): обидва контейнери
    // (#pres-hwboard/#pres-hwqty) сидять в ОДНОМУ батьківському місці (поряд з легендою) —
    // кожна model-view гілка МУСИТЬ викликати ОБИДВІ функції, бо кожна сама вирішує прибрати
    // себе, коли активна підсторінка — не її тип (інакше стара лишається видимою під новою).
    else if (sub.type === 'hwboard') {
      switchSubView('model');
      if (window.renderHwBoard) setTimeout(() => window.renderHwBoard(), 30);
      if (window.renderHwQtyTable) setTimeout(() => window.renderHwQtyTable(), 30);
    }
    else if (sub.type === 'hwqty') {
      switchSubView('model');
      if (window.renderHwBoard) setTimeout(() => window.renderHwBoard(), 30);
      if (window.renderHwQtyTable) setTimeout(() => window.renderHwQtyTable(), 30);
    }
  }
  renderSubPages();
  // build200: оновлюємо номер у футері («A4 N» чи «A4 N/M») щоразу при зміні підсторінки —
  // updateA4Footer раніше викликався лише при switchToPage (перемиканні МІЖ листами), тож
  // номер підсторінки в футері не оновлювався при перемиканні МІЖ вкладками ОДНІЄЇ сторінки.
  if (typeof updateA4Footer === 'function') updateA4Footer(pg);
}

function switchSubView(viewType) {
  const modelWrap = document.getElementById('c-wrap') || document.getElementById('pres-wrap');
  const bomPage = document.getElementById('bom-page');
  const drawingOverlay = document.getElementById('drawing-overlay');
  if (modelWrap) modelWrap.style.display = (viewType === 'model') ? 'block' : 'none';
  if (bomPage) bomPage.style.display = (viewType === 'bom') ? 'block' : 'none';
  if (drawingOverlay) drawingOverlay.style.display = (viewType === 'drawing') ? 'flex' : 'none';
  // Лупа працює лише над 3D-моделлю; на аркушах BOM/креслення її вимикаємо.
  const loupeBtn = document.getElementById('btn-loupe');
  if (loupeBtn) {
    const off = (viewType !== 'model');
    loupeBtn.disabled = off;
    loupeBtn.style.opacity = off ? '0.4' : '';
    loupeBtn.style.cursor = off ? 'not-allowed' : '';
    loupeBtn.title = off ? 'Лупа доступна лише у 3D-виді' : 'Додати лупу';
  }
  if (viewType === 'model' && window.res) res();
  if (viewType === 'model' && window.pDirty !== undefined) pDirty = true;
}

// Той самий спосіб визначення «корпуса» деталі/фурнітури, що й у
// pres_engine.js (pPartCabId): modulePid у пріоритеті, moduleId — резерв.
function bomCabId(row) {
  if (row.modulePid != null && row.modulePid !== '') return String(row.modulePid);
  if (row.moduleId != null && row.moduleId !== '') return String(row.moduleId);
  return null;
}

// build326: технологічні маркери ABF-плагіна («ABF_holeBXF» — точки свердління/фрезерування,
// «ABF_Intersect» — точки стикування тощо) несуть is-board=true, а isTech у них ЧАСТО НЕ
// виставлений (на відміну від візуальних hole-циліндрів рендера, які взагалі не є pData.parts) —
// тому «if (p.isTech) return» у getBOMData їх не ловив, і вони протікали у Специфікацію (юзер:
// «в специфікацію попадають технологічні отвори»). Той самий regex, що вже рятував список
// «Приховати окремі деталі» (pRenderPartFilterUI, _isTechMarkerName) — тепер і тут.
function _isAbfTechMarkerName(p) {
  const raw = (p && (p.name || (p.meta && p.meta.full))) || '';
  return /^ABF[_-]/i.test(String(raw).trim());
}
function getBOMData(parts) {
  if (!parts) return [];
  const sortMode = document.getElementById('bom-sort-mode')?.value || 'tag';
  const hasLeaves = parts.some(p => !p.isForn && p.hasAbf && !p.hasBoardChild);
  const groups = {};
  parts.forEach(p => {
    if (p.isForn || p.isTech || _isAbfTechMarkerName(p)) return;
    if (hasLeaves && p.isMain && p.hasBoardChild) return;
    if (!p.hasAbf && !p.hasBoardChild) return;
    const dims = [p.lx, p.ly, p.lz].sort((a, b) => b - a);
    if (dims[2] < 1) return;
    const tag = p.tag || 'Без тегу';
    const mat = p.mat || 'Без матеріалу';
    // «За модулем» — верхній рівень ієрархії (корпус), той самий modulePid/moduleId +
    // moduleName, що й у фільтрі «Корпуси на сторінці» (bomCabId/pCabinetList).
    const modId = bomCabId(p);
    const moduleName = modId ? (p.moduleName || ('#' + modId)) : 'Без модуля';
    // build198: «За модулем + матеріалом» — один комбінований заголовок «[Модуль] — Матеріал»
    // на групу. Сортування за цим же рядком природно впорядковує СПЕРШУ за модулем (він —
    // префікс рядка), а В МЕЖАХ модуля — за матеріалом, без окремого дворівневого рендеру.
    const groupKey = sortMode === 'mat' ? mat
      : (sortMode === 'module' ? moduleName
      : (sortMode === 'module_mat' ? (moduleName + ' — ' + mat)
      : tag));
    // build418: кромка по сторонах — у ключ групування, щоб однакові за розміром
    // деталі з РІЗНОЮ кромкою не злипались в один рядок.
    const _eb = p.edges || null;
    const _ebS = _eb && _eb.sides
      ? ['L', 'R', 'T', 'B'].filter(k => _eb.sides[k]).join('')
      : '';
    // build424: габарити ФАКТИЧНІ, з десятою (364.0 / 363.7) — і в ключі групування теж,
    // інакше деталі 363.7 і 364.2 злипались би в один рядок «364», хоча це різні заготовки.
    const _l = pMm1(dims[0]), _w = pMm1(dims[1]), _t = pMm1(dims[2]);
    const key = `${groupKey}_${p.name}_${_l}_${_w}_${_t}_${_ebS}_${_eb ? _eb.thick : ''}`;
    if (!groups[key]) groups[key] = { groupKey, tag, mat, name: p.name, l: _l, w: _w, t: _t, count: 0, eb: _eb, ebS: _ebS };
    groups[key].count++;
  });

  const vals = Object.values(groups);
  vals.sort((a, b) => {
    if (a.groupKey !== b.groupKey) return a.groupKey.localeCompare(b.groupKey);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return b.l - a.l;
  });

  const finalData = [];
  let currentGroup = null;
  vals.forEach(v => {
    if (v.groupKey !== currentGroup) {
      currentGroup = v.groupKey;
      finalData.push({ isHeader: true, name: currentGroup });
    }
    finalData.push(v);
  });

  return finalData;
}

// Специфікація на сторінці показує ТІ САМІ корпуси, що обрані у розділі «Корпуси на
// сторінці» (pActiveCabFilter). null/порожній фільтр = усі.
function getFilteredPartsAndHardware(data) {
  let parts = data ? data.parts : null;
  let hardware = data ? data.hardware : null;
  if (typeof pActiveCabFilter !== 'undefined' && pActiveCabFilter && pActiveCabFilter.size) {
    if (parts) parts = parts.filter(p => { const id = bomCabId(p); return id === null || pActiveCabFilter.has(id); });
    if (hardware) hardware = hardware.filter(h => { const id = bomCabId(h); return id === null || pActiveCabFilter.has(id); });
  }
  // build176/177: «Приховати за тегом» (пер-сторінковий, панель «Корпуси на сторінці») — той
  // самий тег, що й у SketchUp-моделі, не захардкоджений шаблон назви. build177: фурнітура
  // ТЕПЕР теж несе tag (тег сутності, на якій знайдена — див. collector.rb hw_tag), тож
  // фільтруємо і її — інакше фурнітура прихованого ящика лишалась «висіти» у специфікації.
  if (typeof pActiveHiddenTags !== 'undefined' && pActiveHiddenTags && pActiveHiddenTags.size) {
    if (parts) parts = parts.filter(p => !pActiveHiddenTags.has(p.tag));
    if (hardware) hardware = hardware.filter(h => !pActiveHiddenTags.has(h.tag));
  }
  // build269: «Приховати деталі» (пер-сторінковий чекбокс-список) — фільтр за ідентичністю
  // об'єкта з data.parts (parts вище вже може бути копією, індекси зсунуті).
  if (parts && typeof pActiveHiddenParts !== 'undefined' && pActiveHiddenParts && pActiveHiddenParts.size && data && data.parts) {
    const _hidP = new Set(); pActiveHiddenParts.forEach(i => { if (data.parts[i]) _hidP.add(data.parts[i]); });
    parts = parts.filter(p => !_hidP.has(p));
  }
  // build275: «В таблиці — те, що я бачу». Специфікація показує ЛИШЕ деталі, чиї 3D-групи реально
  // ВИДИМІ на активній сторінці (g.visible). Це охоплює будь-яке приховування — фільтр корпусів,
  // приховані теги/деталі, приховані фасади, а також коли на сторінці зібрано кілька корпусів, а
  // видно один (решта g.visible=false). Застосовуємо ТІЛЬКИ для активної сторінки, дані якої
  // відповідають поточному pGroup (data.parts === pData.parts) — інакше мапінг pIdx недійсний.
  if (parts && typeof pGroup !== 'undefined' && pGroup && pGroup.children &&
      typeof pData !== 'undefined' && data && data.parts === pData.parts) {
    const _visObjs = new Set();      // видимі деталі (об'єкти data.parts)
    const _visCabs = new Set();      // cabId видимих деталей — для фільтра фурнітури
    pGroup.children.forEach(g => {
      if (!g.userData || g.userData.pIdx === undefined) return;
      if (g.visible === false) return;
      const p = data.parts[g.userData.pIdx];
      if (!p) return;
      _visObjs.add(p);
      const cid = bomCabId(p); if (cid !== null) _visCabs.add(cid);
    });
    // Фільтруємо лише якщо взагалі є видимі деталі (інакше — не чіпаємо, щоб не спорожнити таблицю помилково)
    if (_visObjs.size) {
      parts = parts.filter(p => _visObjs.has(p));
      // фурнітура: лишаємо ту, чий корпус видимий (cabId у _visCabs) або без прив'язки до корпусу
      if (hardware) hardware = hardware.filter(h => { const cid = bomCabId(h); return cid === null || _visCabs.has(cid); });
    }
    // build339: WYSIWYG і для САМОСТІЙНОЇ фурнітури (TANDEM/труба/погонаж — те, що існує
    // окремим 3D-обʼєктом). Рядок несе pids сутностей-джерел (collector.rb add_hw), part-запис
    // того самого обʼєкта — pid. Якщо ВСІ повʼязані обʼєкти рядка зараз приховані на сторінці
    // (галочка «Приховати окремі деталі», тег, фільтр корпусів — байдуже, чим саме) — рядок
    // не потрапляє в таблицю. Вкладена в плити фурнітура (шурупи/стяжки-лічильники) звʼязки
    // не має і фільтрується, як раніше (тегом плити-контейнера та видимістю корпусу).
    if (hardware && hardware.length) {
      const _rendPids = new Set(), _hidPids = new Set();
      pGroup.children.forEach(g => {
        if (!g.userData || g.userData.pIdx === undefined) return;
        const p = data.parts[g.userData.pIdx];
        if (!p || p.pid == null) return;
        _rendPids.add(p.pid);
        if (g.visible === false) _hidPids.add(p.pid);
      });
      if (_rendPids.size) {
        hardware = hardware.filter(h => {
          if (!Array.isArray(h.pids) || !h.pids.length) return true;
          const linked = h.pids.filter(x => _rendPids.has(x));
          if (!linked.length) return true;
          return linked.some(x => !_hidPids.has(x));
        });
      }
    }
  }
  return { parts, hardware };
}

function getPieceHwRows(hardware) {
  return hardware ? hardware.filter(h => {
    const u = (h.odvm || '').trim();
    return !u || u === 'шт' || u === 'компл' || u === 'пара';
  }) : [];
}

function getLengthHwRows(hardware) {
  return hardware ? hardware.filter(h => {
    const u = (h.odvm || '').trim();
    return u && u !== 'шт' && u !== 'компл' && u !== 'пара';
  }) : [];
}

// Мінімальний читабельний шрифт у таблицях специфікації (див. BOM_FLOOR_SCALE нижче) —
// менше scaleBOMSheet текст не стискає; якщо контент і на мінімумі не вміщується,
// planBOMPagination() створює під-сторінку(и)-продовження «Специфікація 2/3/…».
const BOM_MIN_FONT_PX = 8.5;
const BOM_BASE_FONT_PX = 8.5 * 4 / 3; // .tech-table td font-size: 8.5pt → px (1pt = 4/3px)
const BOM_FLOOR_SCALE = BOM_MIN_FONT_PX / BOM_BASE_FONT_PX;

// id модуля (bomCabId) → людська назва. Фурнітура САМА не несе moduleName (лише
// modulePid/moduleId, див. collector.rb) — назву тягнемо з ДЕТАЛЕЙ того ж модуля,
// той самий підхід, що й pCabinetList() у pres_engine.js для фільтра «Корпуси на сторінці».
function getModuleNameMap(parts) {
  const map = {};
  (parts || []).forEach(p => {
    const id = bomCabId(p);
    if (id && !map[id]) map[id] = p.moduleName || ('#' + id);
  });
  return map;
}

// build193: коли активне сортування «За модулем», фурнітуру ТРЕБА відсортувати за модулем
// ЩЕ ДО пагінації — так само, як getBOMData() уже робить для деталей (groupKey). Раніше
// pieceHwFull/lenHwFull лишались у «сирому» порядку з collector.rb (sort_by nazva, тобто
// за АЛФАВІТОМ), а групування за модулем (_hwPageItems) застосовувалось лише ПІСЛЯ того,
// як planBOMPagination уже нарізала масив на сторінки за індексом. Фурнітура ОДНОГО модуля,
// розкидана по алфавіту (CLIP.../Дюбель.../Ексцентрикова.../Саморізи.../Шкант...), через це
// потрапляла на РІЗНІ сторінки «Специфікація 2/3» — на конкретній сторінці лишався лише
// фрагмент списку модуля.
function _sortHwByModule(rows, moduleNameMap) {
  const sortMode = document.getElementById('bom-sort-mode')?.value || 'tag';
  // build198: фурнітура не несе «матеріал» — у режимі «За модулем + матеріалом» вона
  // групується так само, як у звичайному «За модулем» (матеріал стосується лише плит/деталей).
  if ((sortMode !== 'module' && sortMode !== 'module_mat') || !moduleNameMap || !rows || !rows.length) return rows;
  const modNameOf = (row) => {
    const id = bomCabId(row);
    return id ? (moduleNameMap[id] || ('#' + id)) : 'Без модуля';
  };
  return rows.slice().sort((a, b) => modNameOf(a).localeCompare(modNameOf(b)));
}

// build328: collector.rb рахує hardware_counts ОКРЕМО на кожен корпус (ключ включає cab_id) —
// це потрібно, щоб працював фільтр «Корпуси на сторінці» (можна відняти фурнітуру ОДНОГО
// корпусу) і сортування «За модулем» (bomCabId на кожному рядку). Але в «плоскому» показі
// (не «За модулем») та сама фурнітура з РІЗНИХ корпусів приходить у JS окремими рядками з
// ОДНАКОВОЮ назвою — виглядає як дублікати («Дюбель...» ×5 замість ×1 із сумою). Зливаємо за
// nazva+art, підсумовуючи count. У «За модулем»/«За модулем+матеріалом» НЕ зливаємо — там
// рядок мусить лишатись прив'язаним до СВОГО корпусу (bomCabId), інакше групування зламається.
function _mergeHwRows(rows) {
  const sortMode = document.getElementById('bom-sort-mode')?.value || 'tag';
  if (sortMode === 'module' || sortMode === 'module_mat' || !rows || rows.length < 2) return rows;
  const map = new Map();
  const order = [];
  rows.forEach(row => {
    const key = (row.nazva || '') + '|' + (row.art || '');
    if (map.has(key)) {
      map.get(key).count = (parseFloat(map.get(key).count) || 0) + (parseFloat(row.count) || 0);
      // build339: обʼєднуємо і звʼязки з 3D-обʼєктами (persistent_id джерел рядка)
      if (Array.isArray(row.pids) && row.pids.length) {
        const m = map.get(key);
        m.pids = (Array.isArray(m.pids) ? m.pids : []).concat(row.pids);
      }
    } else {
      const merged = Object.assign({}, row);
      merged.count = parseFloat(row.count) || 0;
      map.set(key, merged);
      order.push(key);
    }
  });
  return order.map(k => map.get(k));
}

// Групує рядки фурнітури ОДНІЄЇ сторінки за модулем (заголовок-роздільник між групами),
// коли активна сортування «За модулем». В інших режимах — як було, плоским списком.
// Нумерація — послідовна у порядку показу (продовжується з hStartNum між сторінками).
function _hwPageItems(rows, startNum, moduleNameMap) {
  const sortMode = document.getElementById('bom-sort-mode')?.value || 'tag';
  if ((sortMode !== 'module' && sortMode !== 'module_mat') || !moduleNameMap || !rows.length) {
    return rows.map((row, i) => ({ isHeader: false, row: row, num: startNum + i + 1 }));
  }
  const withMod = rows.map(row => {
    const id = bomCabId(row);
    return { row: row, modName: id ? (moduleNameMap[id] || ('#' + id)) : 'Без модуля' };
  });
  withMod.sort((a, b) => a.modName.localeCompare(b.modName));
  const items = [];
  let cur = null, num = startNum;
  withMod.forEach(({ row, modName }) => {
    if (modName !== cur) { cur = modName; items.push({ isHeader: true, name: modName }); }
    num++;
    items.push({ isHeader: false, row: row, num: num });
  });
  return items;
}

// Рендер ОДНОГО зрізу таблиць у вже наявні DOM-таблиці (#bom-body/#hw-body/#hw-length-body).
// slice = null/undefined → повний вміст (без обрізки) — використовується для першого
// виміру природної висоти рядків у fillBOM(), перед плануванням пагінації.
// slice = { partsFrom, partsTo, hwFrom, hwTo, hwStartNum, hwLenFrom, hwLenTo, hwLenStartNum }
// moduleNameMap — див. getModuleNameMap(); потрібна лише для угруповання фурнітури «За модулем».
function renderBOMSlice(bomDataFull, pieceHwFull, lenHwFull, slice, moduleNameMap) {
  slice = slice || {};
  const pFrom = slice.partsFrom || 0;
  const pTo = (slice.partsTo != null) ? slice.partsTo : bomDataFull.length;
  const hFrom = slice.hwFrom || 0;
  const hTo = (slice.hwTo != null) ? slice.hwTo : pieceHwFull.length;
  const hStartNum = slice.hwStartNum || 0;
  const lFrom = slice.hwLenFrom || 0;
  const lTo = (slice.hwLenTo != null) ? slice.hwLenTo : lenHwFull.length;
  const lStartNum = slice.hwLenStartNum || 0;

  const tb = document.getElementById('bom-body');
  if (tb) {
    tb.innerHTML = '';
    bomDataFull.slice(pFrom, pTo).forEach((row) => {
      const tr = document.createElement('tr');
      // build418: колонка КРОМКИ — «Л:0.4 П:0.4 В:0.4 Н:0.4» кольором самої кромки
      // (#008000 для 0.4, #fa6d08 для 0.8 — колір із ABF edge-band-types). Рядок
      // довгий і сам по собі в аркуш не вписується — під нього таблиця деталей
      // переходить на дрібніший шрифт (клас .with-edges, див. pres_view.html).
      const _showEb = !!(window.__msBomEdges);
      let _ebCell = '';
      if (_showEb) {
        const eb = row.eb;
        let txt = '', col = '#334155';
        if (eb && eb.sides) {
          const map = { L: 'Л', R: 'П', T: 'В', B: 'Н' };
          const th = (eb.thick != null) ? eb.thick : '';
          txt = ['L', 'R', 'T', 'B'].filter(k => eb.sides[k]).map(k => `${map[k]}:${th}`).join(' ');
          if (eb.color) col = eb.color;
        }
        _ebCell = `<td style="color:${col}; white-space:nowrap;">${txt}</td>`;
      }
      if (row.isHeader) {
        // build166: № прибрано зі списку деталей (плутав — не збігався з номером на
        // кресленні А4) → 5 колонок замість 6.
        tr.innerHTML = `<td colspan="${_showEb ? 6 : 5}" style="text-align:left; font-weight:bold; background:#e0e0e0; padding-left:10px;">${row.name}</td>`;
      } else {
        // build424: габарити з десятою — «364.0», а не «364»
        tr.innerHTML = `<td>${row.name}</td><td>${pFmtMm(row.l)}</td><td>${pFmtMm(row.w)}</td><td>${pFmtMm(row.t)}</td><td>${row.count}</td>${_ebCell}`;
      }
      tb.appendChild(tr);
    });
  }

  const hwTb = document.getElementById('hw-body');
  if (hwTb) {
    hwTb.innerHTML = '';
    _hwPageItems(pieceHwFull.slice(hFrom, hTo), hStartNum, moduleNameMap).forEach((it) => {
      const tr = document.createElement('tr');
      if (it.isHeader) {
        tr.innerHTML = `<td colspan="3" style="text-align:left; font-weight:bold; background:#e0e0e0; padding-left:10px;">${it.name}</td>`;
      } else {
        tr.innerHTML = `<td>${it.num}</td><td>${it.row.nazva || '-'}</td><td>${Math.round(it.row.count) || 0}</td>`;
      }
      hwTb.appendChild(tr);
    });
  }

  const hwLenTb = document.getElementById('hw-length-body');
  const hwLenTitle = document.getElementById('hw-length-title');
  const hwLenTable = document.getElementById('hw-length-table');
  if (hwLenTb && hwLenTitle && hwLenTable) {
    hwLenTb.innerHTML = '';
    const lenSlice = lenHwFull.slice(lFrom, lTo);
    if (lenSlice.length > 0) {
      hwLenTitle.style.display = '';
      hwLenTable.style.display = '';
      _hwPageItems(lenSlice, lStartNum, moduleNameMap).forEach((it) => {
        const tr = document.createElement('tr');
        if (it.isHeader) {
          tr.innerHTML = `<td colspan="3" style="text-align:left; font-weight:bold; background:#e0e0e0; padding-left:10px;">${it.name}</td>`;
        } else {
          const cnt = parseFloat(it.row.count) || 0;
          const cntStr = cnt % 1 === 0 ? cnt.toString() : cnt.toFixed(3).replace(/\.?0+$/, '');
          tr.innerHTML = `<td>${it.num}</td><td>${it.row.nazva || '-'}</td><td>${cntStr} ${it.row.odvm || ''}</td>`;
        }
        hwLenTb.appendChild(tr);
      });
    } else {
      hwLenTitle.style.display = 'none';
      hwLenTable.style.display = 'none';
    }
  }
}

// Точка входу для ПЕРВИННОЇ сторінки специфікації: рендерить ПОВНІ дані (щоб виміряти
// природну висоту рядків), тоді scaleBOMSheet()+planBOMPagination() вирішують, чи
// вміщується все на один лист, чи потрібні «Специфікація 2/3/…».
function fillBOM(data) {
  const pg = pages.find(p => p.id === activePageId);
  const { parts, hardware } = getFilteredPartsAndHardware(data);
  const bomDataFull = parts ? getBOMData(parts) : [];
  const moduleNameMap = getModuleNameMap(parts);
  const pieceHwFull = _mergeHwRows(_sortHwByModule(getPieceHwRows(hardware), moduleNameMap));
  const lenHwFull = _mergeHwRows(_sortHwByModule(getLengthHwRows(hardware), moduleNameMap));

  if (!document.getElementById('bom-body')) return;
  renderBOMSlice(bomDataFull, pieceHwFull, lenHwFull, null, moduleNameMap);

  // build197: раніше чекали фіксовані 10мс перед виміром — якщо колонки (bom-hardware-col
  // тощо) щойно стали видимими вперше (display:none → block, напр. одразу після галочки
  // «Фурнітура»), браузер міг не встигнути завершити layout за ці 10мс — вимір scrollHeight
  // ловив НЕПОВНИЙ/старий розмір, і пагінація помилково вважала, що все влазить на 1 лист
  // (виправлялось лише повторним заходом на сторінку — 3D-вид і назад — бо ДРУГИЙ виклик уже
  // застав завершений layout). Подвійний requestAnimationFrame — надійніший спосіб дочекатись
  // «після наступного перемальовування», ніж довільний таймаут.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        scaleBOMSheet();
        planBOMPagination(pg, bomDataFull, pieceHwFull, lenHwFull, moduleNameMap);
      } catch (e) {
        // build169: якщо пагінація впаде — показуємо помилку ПРЯМО НА ЕКРАНІ (в HtmlDialog
        // немає простого доступу до devtools), інакше вона тихо гине і сторінка лишається
        // нерозрізаною (виглядає, ніби пагінація «не працює»).
        console.error('planBOMPagination failed:', e);
        const badge = document.getElementById('ms-version-badge');
        if (badge) { badge.style.background = '#fee2e2'; badge.style.borderColor = '#ef4444'; badge.textContent = 'BOM PAGINATION ERROR: ' + e.message; }
      }
    });
  });
}

// Рендер КОНКРЕТНОЇ (можливо, продовження) під-сторінки специфікації за вже збереженим
// у ній зрізом — БЕЗ перепланування пагінації (щоб перегляд вкладок не «стрибав»).
function renderBOMSubPageSlice(pg, sub) {
  if (!pg || !document.getElementById('bom-body')) return;
  const { parts, hardware } = getFilteredPartsAndHardware(pg.data);
  const bomDataFull = parts ? getBOMData(parts) : [];
  const moduleNameMap = getModuleNameMap(parts);
  const pieceHwFull = _mergeHwRows(_sortHwByModule(getPieceHwRows(hardware), moduleNameMap));
  const lenHwFull = _mergeHwRows(_sortHwByModule(getLengthHwRows(hardware), moduleNameMap));
  renderBOMSlice(bomDataFull, pieceHwFull, lenHwFull, sub, moduleNameMap);
  setTimeout(scaleBOMSheet, 10);
}

// Планує «Специфікація 2/3/…». Замість вимірювання висоти КОЖНОГО рядка окремо (крихко —
// залежить від точного стану reflow у момент виміру) читаємо ПОВНУ природну висоту КОЖНОЇ
// КОЛОНКИ ЦІЛКОМ (той самий надійний прийом, що вже перевірено працює у scaleBOMSheet через
// wrap.scrollWidth/Height) і ділимо на кількість рядків — середня висота рядка. Похибка
// середнього (заголовки/thead розмазані по рядках) завжди йде у БЕЗПЕЧНИЙ бік — трохи більше
// сторінок, а не переповнення.
function planBOMPagination(pg, bomDataFull, pieceHwFull, lenHwFull, moduleNameMap) {
  if (!pg || !pg.state || !Array.isArray(pg.state.subPages)) return;
  const bomPage = document.getElementById('bom-page');
  const wrap = document.getElementById('bom-tables-wrap');
  const leftCol = document.getElementById('bom-details-col');
  if (!bomPage || !wrap || !leftCol) return;
  const bomSubs = pg.state.subPages.filter(s => s.type === 'bom');
  const primary = bomSubs[0];
  if (!primary) return;

  const availH = parseFloat(bomPage.dataset.msAvailH) || (bomPage.clientHeight - 30);
  const budget = availH / BOM_FLOOR_SCALE; // натуральний (без стиснення) бюджет висоти на 1 лист

  const prevZoom = wrap.style.zoom;
  wrap.style.zoom = 1; // виміри мають бути в «сирих» (натуральних) px, без масштабу

  const leftRowCount = bomDataFull.length;
  const leftTitleEl = leftCol.querySelector('.bom-section-title');
  const leftTitleH = (leftTitleEl ? leftTitleEl.offsetHeight : 0) + 6; // + margin-bottom заголовка
  const leftTableH = Math.max(0, leftCol.scrollHeight - leftTitleH);
  const leftAvgRow = leftRowCount > 0 ? (leftTableH / leftRowCount) : 18;

  const hwCol = document.getElementById('bom-hardware-col');
  const hwColVisible = !!(hwCol && getComputedStyle(hwCol).display !== 'none');
  const hwCount = hwColVisible ? pieceHwFull.length : 0;
  const hwRowCount = hwColVisible ? (pieceHwFull.length + lenHwFull.length) : 0;
  // build196: у режимі «За модулем» кожен перехід між модулями додає ОКРЕМИЙ рядок-заголовок,
  // якого немає у hwRowCount (лічить лише дані) — реальна візуальна висота (hwCol.scrollHeight)
  // БІЛЬША за прогноз на цю кількість заголовків, тож rightAvgRow занижувався → бюджет сторінки
  // переоцінював, скільки РЯДКІВ ФУРНІТУРИ насправді влізе → переповнення листа й задрібний
  // шрифт (scaleBOMSheet стискав, щоб «втиснути» зайве). Рахуємо СПРАВЖНЮ кількість візуальних
  // рядків (дані+заголовки) тією ж функцією, що й реальний рендер (_hwPageItems).
  const hwRenderCount = hwColVisible
    ? (_hwPageItems(pieceHwFull, 0, moduleNameMap).length + _hwPageItems(lenHwFull, 0, moduleNameMap).length)
    : 0;
  const rightAvgRow = (hwColVisible && hwRenderCount > 0) ? (hwCol.scrollHeight / hwRenderCount) : 18;
  // Заголовки «за модулем» «роздувають» візуальний рядковий бюджет відносно СИРОЇ кількості
  // даних (hwRowCount) — переводимо «скільки візуальних рядків влізе» назад у «скільки СИРИХ
  // рядків даних це відповідає» тим самим коефіцієнтом роздуття, інакше подальша нарізка масиву
  // за hwFrom/hwTo (СИРИМИ індексами) знову не врахує заголовки.
  const hwInflation = (hwRenderCount > 0 && hwRowCount > 0) ? (hwRowCount / hwRenderCount) : 1;

  wrap.style.zoom = prevZoom;

  let leftRowsPerPage = leftAvgRow > 0 ? Math.max(1, Math.floor(budget / leftAvgRow)) : Math.max(1, leftRowCount);
  let rightRowsPerPage = (hwColVisible && rightAvgRow > 0)
    ? Math.max(1, Math.floor((budget / rightAvgRow) * hwInflation))
    : Math.max(1, hwRowCount);

  const leftPagesNeeded = leftRowCount > 0 ? Math.ceil(leftRowCount / leftRowsPerPage) : 1;
  const rightPagesNeeded = hwRowCount > 0 ? Math.ceil(hwRowCount / rightRowsPerPage) : 1;
  const MAX_PAGES = 20; // запобіжник від зациклення при некоректному вимірі
  let totalPages = Math.min(MAX_PAGES, Math.max(1, leftPagesNeeded, rightPagesNeeded));

  // «Скільки сторінок насправді треба» звіряємо з ВЖЕ ДОВЕДЕНИМ числом scaleBOMSheet
  // (msReqH = реальна scrollHeight повного контенту, той самий механізм, що коректно
  // ловить обрізання по ширині) — пропорційно, а не просто «мінімум 2», щоб і при
  // великому перевищенні (втричі більше листа) вистачило сторінок. Якщо оцінка по
  // рядках вище дала МЕНШЕ — довіряємо доведеному виміру.
  const naturalReqH = parseFloat(bomPage.dataset.msReqH) || 0;
  const reqHPagesNeeded = naturalReqH > 0 ? Math.ceil(naturalReqH / budget) : 1;
  totalPages = Math.min(MAX_PAGES, Math.max(totalPages, reqHPagesNeeded));

  // Коли сторінок > 1, ділимо РІВНОМІРНО ЗА КІЛЬКІСТЮ рядків (а не за оцінкою висоти вище) —
  // гарантує, що дані ДІЙСНО переїдуть на наступну сторінку, навіть якщо оцінка висоти рядка
  // була неточною (саме через це totalPages могло форсуватись вище, а leftRowsPerPage лишався
  // >= leftRowCount → сторінка 2 вийшла б порожньою).
  if (totalPages > 1) {
    leftRowsPerPage = Math.max(1, Math.ceil(leftRowCount / totalPages));
    // build196: те саме роздуття (hwInflation) — рівномірний поділ RAW-рядків на totalPages
    // не враховував би, що частина «бюджету» кожної сторінки йде на заголовки модулів.
    rightRowsPerPage = Math.max(1, Math.floor(Math.ceil(hwRowCount / totalPages) * hwInflation));
  }

  const newSlices = [];
  for (let i = 0; i < totalPages; i++) {
    const pFrom = Math.min(i * leftRowsPerPage, leftRowCount);
    const pTo = Math.min(pFrom + leftRowsPerPage, leftRowCount);
    const rFrom = Math.min(i * rightRowsPerPage, hwRowCount);
    const rTo = Math.min(rFrom + rightRowsPerPage, hwRowCount);
    const hwFrom = Math.min(rFrom, hwCount);
    const hwTo = Math.min(rTo, hwCount);
    const hwLenFrom = Math.max(0, rFrom - hwCount);
    const hwLenTo = Math.max(0, rTo - hwCount);
    newSlices.push({
      partsFrom: pFrom, partsTo: pTo,
      hwFrom: hwFrom, hwTo: hwTo, hwStartNum: hwFrom,
      hwLenFrom: hwLenFrom, hwLenTo: hwLenTo, hwLenStartNum: hwLenFrom
    });
  }

  Object.assign(primary, newSlices[0]);
  // прибрати старі auto-продовження (лишаємо primary і будь-які НЕ-auto bom-записи, якщо
  // такі колись з'являться, — захист на майбутнє; зараз усі continuation завжди auto)
  pg.state.subPages = pg.state.subPages.filter(s => s.type !== 'bom' || s === primary || !s.auto);

  let insertAt = pg.state.subPages.indexOf(primary) + 1;
  for (let i = 1; i < totalPages; i++) {
    const cont = Object.assign(
      { id: 'bom-cont-' + Date.now() + '-' + i, name: 'Специфікація ' + (i + 1), type: 'bom', auto: true },
      newSlices[i]
    );
    pg.state.subPages.splice(insertAt, 0, cont);
    insertAt++;
  }

  if (pg.state.activeSubPageIndex >= pg.state.subPages.length) pg.state.activeSubPageIndex = pg.state.subPages.indexOf(primary);
  if (window.renderSubPages) renderSubPages();

  const curSub = pg.state.subPages[pg.state.activeSubPageIndex];
  if (curSub && curSub.type === 'bom') {
    renderBOMSlice(bomDataFull, pieceHwFull, lenHwFull, curSub, moduleNameMap);
    setTimeout(scaleBOMSheet, 10);
  }
}

function scaleBOMSheet() {
  const bomPage = document.getElementById('bom-page');
  const wrap = document.getElementById('bom-tables-wrap');
  if (!bomPage || !wrap || bomPage.style.display === 'none') return;

  wrap.style.zoom = 1;
  wrap.style.width = ''; // build418: виміри — на натуральній ширині (див. компенсацію нижче)

  // Печатна область: коли ввімкнена рамка оформлення — тримаємо таблиці в її межах
  // (поля + штамп знизу), інакше рамка ріже праву колонку («К-ть» фурнітури) і нижні рядки.
  const mm = 3.78;
  const frameOn = !!(document.getElementById('showFrame') && document.getElementById('showFrame').checked);
  let padT = 15, padR = 20, padB = 15, padL = 20; // базові паддінги #bom-page
  if (frameOn) {
    const gv = (id, d) => { const el = document.getElementById(id); const v = el ? parseFloat(el.value) : NaN; return isNaN(v) ? d : v; };
    padT = Math.max(padT, gv('frame-margin-top', 5) * mm + 6);
    padR = Math.max(padR, gv('frame-margin-right', 5) * mm + 6);
    padL = Math.max(padL, gv('frame-margin-left', 5) * mm + 6);
    padB = Math.max(padB, (gv('frame-margin-bottom', 5) + gv('frame-stamp-height', 7.5)) * mm + 6);
  }
  bomPage.style.padding = padT + 'px ' + padR + 'px ' + padB + 'px ' + padL + 'px';

  // Масштаб по ОБОХ вимірах: по висоті (рядки не лізуть під рамку) і по ширині
  // (права колонка вміщується). scrollWidth/Height — реальний розмір контенту при zoom=1.
  const availW = bomPage.clientWidth - padL - padR;
  const availH = bomPage.clientHeight - padT - padB;
  bomPage.dataset.msAvailH = availH; // для planBOMPagination (натуральний бюджет = availH/floorScale)
  const reqW = wrap.scrollWidth;
  const reqH = wrap.scrollHeight;
  bomPage.dataset.msReqH = reqH; // «чи влазить взагалі» planBOMPagination звіряє САМЕ з цим числом
  let scale = 1;
  if (reqW > availW && reqW > 0) scale = Math.min(scale, availW / reqW);
  if (reqH > availH && reqH > 0) scale = Math.min(scale, availH / reqH);
  // Мінімальний читабельний шрифт: далі текст НЕ стискаємо — за брак місця відповідає
  // planBOMPagination() (додає «Специфікація 2/3/…»), а не нескінченне зменшення кегля.
  scale = Math.max(scale, BOM_FLOOR_SCALE);
  // build418: zoom стискає вміст в ОБОХ напрямках. По висоті це і потрібно, а по ширині
  // давало порожню смугу справа на друці (таблиці займали ~75% листа, юзер: «в плагине
  // таблицы на весь лист, в печати смотри сколько пустого места остаётся»). Компенсуємо:
  // розкладаємо wrap на availW/scale — після zoom він займе рівно availW. Кегль від цього
  // не змінюється, просто колонки отримують ту ширину, яку zoom у них забирав; заразом це
  // дає місце новій колонці «Кромка».
  if (scale < 1) {
    wrap.style.zoom = scale;
    wrap.style.width = Math.floor(availW / scale) + 'px';
  }
}

// --- HW Auto-Replacement Logic ---
let hwRules = [];

function openHwReplaceModal() {
  document.getElementById('hw-replace-modal').style.display = 'flex';
  sketchup.get_hw_replacements();
}

function closeHwReplaceModal() {
  document.getElementById('hw-replace-modal').style.display = 'none';
}

function receiveHwReplacements(data) {
  hwRules = Array.isArray(data) ? data : [];
  renderHwRules();
}

function renderHwRules() {
  const container = document.getElementById('hw-rules-container');
  container.innerHTML = '';
  hwRules.forEach((rule, rIdx) => {
    let itemsHtml = '';
    rule.items.forEach((item, iIdx) => {
      itemsHtml += `
        <div style="display:flex; gap:8px; margin-top:8px; align-items:center;">
          <input type="text" placeholder="Назва складової" value="${item.nazva || ''}" style="flex:2; padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px;" onchange="updateHwItem(${rIdx}, ${iIdx}, 'nazva', this.value)">
          <input type="text" placeholder="Артикул" value="${item.art || ''}" style="flex:1; padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px;" onchange="updateHwItem(${rIdx}, ${iIdx}, 'art', this.value)">
          <input type="number" placeholder="К-сть" value="${item.quantity || 1}" style="width:60px; padding:6px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px;" onchange="updateHwItem(${rIdx}, ${iIdx}, 'quantity', this.value)">
          <button onclick="removeHwItem(${rIdx}, ${iIdx})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:18px; font-weight:bold; padding:0 5px;" title="Видалити складову">&times;</button>
        </div>
      `;
    });
    
    container.innerHTML += `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:15px; position:relative;">
        <button onclick="removeHwRule(${rIdx})" style="position:absolute; top:12px; right:12px; background:none; border:none; color:#ef4444; cursor:pointer; font-size:20px; padding:0;" title="Видалити правило">&times;</button>
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:12px; color:#64748b; font-weight:bold; margin-bottom:4px;">Оригінальна назва (з ABF):</label>
          <input type="text" value="${rule.setting_name || ''}" style="width:95%; padding:8px; border:1px solid #cbd5e1; border-radius:4px; font-weight:bold; font-size:14px;" onchange="updateHwRuleName(${rIdx}, this.value)">
        </div>
        <div style="font-size:12px; color:#64748b; font-weight:bold; margin-bottom:4px;">Складові деталі:</div>
        <div id="rule-items-${rIdx}">
          ${itemsHtml}
        </div>
        <button onclick="addHwItem(${rIdx})" style="margin-top:12px; padding:6px 12px; background:#fff; border:1px dashed #cbd5e1; border-radius:4px; cursor:pointer; font-size:12px; color:#3b82f6; font-weight:bold;">+ Додати складову</button>
      </div>
    `;
  });
  if(hwRules.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:30px; font-size:14px;">Немає жодного правила.<br>Натисніть "+ Додати правило" внизу.</div>';
  }
}

function updateHwRuleName(rIdx, val) { hwRules[rIdx].setting_name = val; }
function updateHwItem(rIdx, iIdx, field, val) { hwRules[rIdx].items[iIdx][field] = field === 'quantity' ? parseInt(val)||1 : val; }
function removeHwRule(rIdx) { hwRules.splice(rIdx, 1); renderHwRules(); }
function removeHwItem(rIdx, iIdx) { hwRules[rIdx].items.splice(iIdx, 1); renderHwRules(); }

function addHwRule() {
  hwRules.unshift({ setting_name: '', items: [{ nazva: '', art: '', quantity: 1, post: '' }] });
  renderHwRules();
}

function addHwItem(rIdx) {
  hwRules[rIdx].items.push({ nazva: '', art: '', quantity: 1, post: '' });
  renderHwRules();
}

function saveHwRules() {
  const cleanRules = hwRules.filter(r => r.setting_name && r.setting_name.trim() !== '').map(r => {
    return {
      setting_name: r.setting_name.trim(),
      items: r.items.filter(i => i.nazva && i.nazva.trim() !== '')
    };
  });
  sketchup.save_hw_replacements(JSON.stringify(cleanRules));
  closeHwReplaceModal();
}

// ===================================================================
// 🤖 АВТО-КРЕСЛЕННЯ — автоматичне розкладання проекту на сторінки по
// модулях (порт із MebliSpec TECH, адаптований під PRES).
// Замість tech-підходу (force_details + розрізання даних на підмножини)
// використовуємо РІДНИЙ пер-сторінковий фільтр «Корпуси на сторінці»
// (state.cabinetFilter): камера кадрує видимі корпуси (pComputeFilteredFrame,
// build131), специфікація фільтрується (getFilteredPartsAndHardware), а
// дані сторінок лишаються СПІЛЬНИМИ (pages[0].data) — як у addPage.
// Пресет (msp_autodraw_presets) = module-agnostic «look» сторінки-шаблону:
// стиль/ракурс/розкладка слотів/розміри/рамка/виноски — БЕЗ прив'язки до
// конкретного модуля і БЕЗ глобальних для проекту речей (двері/світло).
// ===================================================================

function _autodrawT(s) { return window.t ? t(s) : s; }

function _autodrawStore() {
  try { return JSON.parse(msPresetGet('msp_autodraw_presets')) || {}; } catch (e) { return {}; }
}

window.updateAutodrawPresetDropdown = function () {
  const sel = document.getElementById('preset-select-project');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '';
  const baseOpt = document.createElement('option');
  baseOpt.value = ''; baseOpt.textContent = _autodrawT('-- Базові налаштування --');
  sel.appendChild(baseOpt);
  const store = _autodrawStore();
  Object.keys(store).sort((a, b) => a.localeCompare(b)).forEach(k => {
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = k;
    sel.appendChild(opt);
  });
  if (cur && store[cur]) sel.value = cur;
};

window.saveAutodrawPreset = async function () {
  const name = await msPrompt(_autodrawT('Введіть назву пресету:'), '');
  if (!name || !String(name).trim()) return;

  // Зафіксувати живий DOM у стан активної сторінки і зняти повний знімок «look».
  if (window.saveCurrentPageState) saveCurrentPageState();
  const pg = pages.find(p => p.id === activePageId);
  const pageState = (pg && pg.state)
    ? JSON.parse(JSON.stringify(pg.state))
    : (window.getDefaultPageState ? window.getDefaultPageState() : {});

  // Module-agnostic чистка: прибираємо прив'язане до конкретної моделі/модуля
  // (фільтр, легенда, пан/зум, креслення-підсторінки) та ГЛОБАЛЬНІ для проекту
  // речі (двері/світло — saveCurrentPageState розносить їх на всі сторінки,
  // з пресету вони б «отруїли» відкритий проект). Зі специфікації лишаємо ЛИШЕ
  // першу bom-вкладку: «продовження» (Специфікація 2/3) — результат пагінації
  // конкретних даних, fillBOM перерахує їх на кожному модулі сам.
  pageState.subPages = Array.isArray(pageState.subPages)
    ? pageState.subPages.filter(s => s && s.type === 'bom').slice(0, 1)
    : [];
  pageState.activeSubPageIndex = -1;
  pageState.cabinetFilter = null;
  pageState.legendPos = null;
  pageState.offX = 0; pageState.offY = 0; pageState.zoom = 1.0;
  delete pageState.doors;
  delete pageState.lights;
  if (pageState.frame) pageState.frame.title = '';

  const store = _autodrawStore();
  store[String(name).trim()] = { v: 3, pageState: pageState };
  msPresetSet('msp_autodraw_presets', JSON.stringify(store));
  updateAutodrawPresetDropdown();
  const sel = document.getElementById('preset-select-project');
  if (sel) sel.value = String(name).trim();
};

window.runAlgorithmProject = function () {
  const baseData = (pages.length && pages[0].data && pages[0].data.parts && pages[0].data.parts.length)
    ? pages[0].data : null;
  if (!baseData) { alert(_autodrawT('Немає даних моделі. Спочатку натисніть «Оновити модель».')); return; }

  const selEl = document.getElementById('preset-select-project');
  const presetName = selEl ? selEl.value : '';
  const store = _autodrawStore();
  const preset = (presetName && store[presetName]) ? store[presetName] : null;

  // Групування деталей за корпусом — той самий ключ (modulePid → moduleId),
  // що й у фільтра «Корпуси на сторінці» та специфікації (bomCabId/pPartCabId).
  const modules = {};
  const order = [];
  baseData.parts.forEach(p => {
    const cid = bomCabId(p);
    if (!cid) return;
    if (!modules[cid]) { modules[cid] = { name: '', hasBoard: false }; order.push(cid); }
    if (!modules[cid].name && p.moduleName) modules[cid].name = p.moduleName;
    // «Меблевий» модуль = містить хоч одну плиту (відсіює побутову техніку/декор)
    if (p.hasBoardChild || (p.hasAbf && !p.isForn && !p.isTech)) modules[cid].hasBoard = true;
  });
  const valid = order.filter(cid => modules[cid].hasBoard);

  if (valid.length === 0) { alert(_autodrawT('У моделі не знайдено меблевих модулів.')); return; }
  if (valid.length === 1) { alert(_autodrawT('У цій моделі знайдено лише 1 меблевий модуль — розкладати нема на що.')); return; }

  // Стан активної сторінки — у pages ДО будь-яких маніпуляцій зі списком сторінок.
  if (window.saveCurrentPageState) saveCurrentPageState();

  // Повторний запуск: сторінки минулого прогону прибираємо, ручні (і Стор.1) лишаємо.
  for (let i = pages.length - 1; i >= 0; i--) { if (pages[i] && pages[i]._autodrawGen) pages.splice(i, 1); }

  const firstState = (pages[0] && pages[0].state) ? pages[0].state : null;
  let firstGenId = null;

  valid.forEach(cid => {
    const mod = modules[cid];
    const modName = mod.name || ('#' + cid);

    // База стану: глибокий клон пресетного pageState або дефолт PRES.
    const newState = (preset && preset.pageState)
      ? JSON.parse(JSON.stringify(preset.pageState))
      : (window.getDefaultPageState ? window.getDefaultPageState() : {});

    // Пер-модульні оверрайди.
    newState.cabinetFilter = [cid];                            // показуємо ЛИШЕ цей модуль
    newState.offX = 0; newState.offY = 0; newState.zoom = 1.0; // авто-кадр по модулю (build131)
    newState.legendPos = null;
    // Глобальні для проекту речі — успадковуємо від Стор.1, НЕ від пресету.
    newState.doors = (firstState && Array.isArray(firstState.doors)) ? JSON.parse(JSON.stringify(firstState.doors)) : [];
    if (firstState && firstState.lights) newState.lights = JSON.parse(JSON.stringify(firstState.lights));
    // Рамка: шаблон із пресету (якщо був), інакше — від Стор.1; заголовок = назва модуля.
    if (!newState.frame && firstState && firstState.frame) newState.frame = JSON.parse(JSON.stringify(firstState.frame));
    if (!newState.frame) newState.frame = {};
    newState.frame.title = modName;

    pageIdCounter++;
    // Підсторінка специфікації з пресету — ре-ID, щоб не колізувала між сторінками.
    newState.subPages = Array.isArray(newState.subPages)
      ? newState.subPages.filter(s => s && s.type === 'bom').slice(0, 1)
          .map((s, i) => Object.assign({}, s, { id: 'bom-' + pageIdCounter + '-' + i + '-' + Date.now() }))
      : [];
    newState.activeSubPageIndex = -1;

    const pg = { id: pageIdCounter, name: modName, type: 'pres', state: newState, data: baseData, _autodrawGen: true };
    pages.push(pg);
    if (firstGenId === null) firstGenId = pg.id;
  });

  renderTabs();
  // Перехід на першу згенеровану сторінку. activePageId=null, щоб switchToPage
  // НЕ зберігав поточний DOM ще раз (стан уже зафіксовано вище) — і не писав
  // його у видалену сторінку минулого прогону, якщо вона була активною.
  activePageId = null;
  if (typeof pActivePageId !== 'undefined') pActivePageId = null;
  switchToPage(firstGenId);
};

window.addEventListener('load', () => { updateFooterDate(); scaleSheet(); scaleBOMSheet(); if (window.requestPresetsFromDisk) requestPresetsFromDisk(); if (window.pApplyGlobalSettings) pApplyGlobalSettings(); if (window.msQabApplyFrameVars) msQabApplyFrameVars(); if (window.msQabRender) msQabRender(); if (window.msQabSyncUI) msQabSyncUI(); if (window.msQabRender) scaleSheet(); }); // build455/457: перший рендер панелі швидкого доступу (у SpecDraft його робив pApplyGlobalSettings, якого в pres нема) + повторний scaleSheet, щоб резерв місця під панелі порахувався вже з побудованими панелями
window.addEventListener('resize', () => { scaleSheet(); scaleBOMSheet(); });
setTimeout(scaleSheet, 500);
