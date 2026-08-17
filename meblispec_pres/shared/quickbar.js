// ============================================================================
// build386→389: ПАНЕЛІ ШВИДКОГО ДОСТУПУ (QAT) — рендер із реєстру MSP_COMMANDS (build384).
//
// build388: три незалежні панелі (top/left/right), пер-панельний розмір кнопок.
// build389 (юзер): панелі ВПРИТУЛ ДО ЛИСТА (absolute у #viewport, прив'язка до фактичного
// прямокутника #a4-sheet після scaleSheet — msQabPlace()); НЕ суцільна стрічка, а окремі
// КВАДРАТИКИ зі скругленням у кожної іконки (фон кнопки настроюється, дефолт білий);
// іконка = 90% підложки; перетягування іконок ПРЯМО НА ПАНЕЛІ (поріг 4px, insertBefore,
// серіалізація в items + save) — без походу в налаштування.
// Конфіг: msp_global_settings.quickBars = [{id, on, size, bg, items, groups}]. Міграція v386 {dock}.
// groups = [{items, gap, bg?, color?}] (build397-400). Рамка груп — глобальна (msp_global_settings.qabFrame,
// build401). ⚠️build401: пер-панельний стиль transp/mono (build394) ПРИБРАНО (юзер) — на користь пер-групового
// кольору (build400) і глобальної рамки.
// ============================================================================
(function () {
  'use strict';
  const $id = (id) => document.getElementById(id);
  const tr = (s) => (typeof window.t === 'function') ? window.t(s) : s;
  const PANEL_IDS = ['top', 'left', 'right'];

  // ---------- конфіг (дефолти; згори приїде msp_global_settings.quickBars) ----------
  window.pQuickBars = [
    {
      id: 'top', on: true, size: 30, bg: '#ffffff',
      items: ['refresh-model', 'print-pdf', 'undo', 'redo', 'reset-camera',
        'dim-linear', 'dim-angle', 'dim-radius', 'loupe', 'loupe-node', 'callout',
        'add-image', 'add-text'],
    },
    { // build388: юзер — «усі види в панель, щоб оперативно міняти»
      id: 'left', on: true, size: 30, bg: '#ffffff',
      items: ['view-iso', 'view-persp', 'view-front', 'view-back', 'view-left', 'view-right',
        'view-top', 'view-bottom', 'view-table', 'view-table-full', 'view-hw'],
    },
    { id: 'right', on: false, size: 30, bg: '#ffffff', items: [] },
  ];
  window.msQabPanel = function (pid) { return (window.pQuickBars || []).find(p => p.id === pid) || null; };

  // ---------- build401 (юзер): ГЛОБАЛЬНІ налаштування РАМКИ ГРУП (колір/товщина/відступ від іконки) ----------
  // Одні на всі рамки всіх панелей. Колір/товщина — CSS-змінні (--qab-frame-c/-w на :root); відступ — і
  // CSS-padding бічних панелей (--qab-vpad, щоб рамка не обрізалась overflow), і pad у _qabDrawFrames.
  window.pQabFrame = { color: '#475569', width: 2, pad: 3 };
  window.msQabApplyFrameVars = function () {
    const f = window.pQabFrame || {};
    const root = document.documentElement;
    root.style.setProperty('--qab-frame-c', f.color || '#475569');
    root.style.setProperty('--qab-frame-w', ((f.width | 0) || 2) + 'px');
    root.style.setProperty('--qab-vpad', (Number.isFinite(f.pad) ? Math.max(1, f.pad) : 3) + 'px'); // ≥1: рамка не вилазить за clip
  };
  window.msQabSetFrame = function (patch) {
    const f = window.pQabFrame || (window.pQabFrame = {});
    if (patch && typeof patch.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.color)) f.color = patch.color;
    if (patch && Number.isFinite(patch.width)) f.width = Math.max(1, Math.min(6, patch.width | 0));
    if (patch && Number.isFinite(patch.pad)) f.pad = Math.max(0, Math.min(10, patch.pad | 0));
    window.msQabApplyFrameVars();
    if (window.pSaveGlobalSettings) try { pSaveGlobalSettings(); } catch (e) { }
    msQabRender(); // pad впливає на bbox рамки → перемалювати
    window.msQabSyncUI && msQabSyncUI();
  };
  window.msQabApplyFrameConfig = function (fr) { // з файла (pApplyGlobalSettings)
    if (!fr || typeof fr !== 'object') return;
    const f = window.pQabFrame;
    if (typeof fr.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(fr.color)) f.color = fr.color;
    if (Number.isFinite(fr.width)) f.width = Math.max(1, Math.min(6, fr.width | 0));
    if (Number.isFinite(fr.pad)) f.pad = Math.max(0, Math.min(10, fr.pad | 0));
    window.msQabApplyFrameVars();
  };

  // ============================================================================
  // build397 (юзер): ГРУПИ ІКОНОК на панелі. Shift+клік — мультивибір; Enter — рамка
  // (скруглені кути як у кнопок) навколо ВИБРАНОГО НЕПЕРЕРВНОГО блоку; СКМ по групі —
  // тягнути її вздовж осі у ВІЛЬНУ позицію (порожні слоти-спейсери, gap); ЛКМ-reorder
  // іконки додає/прибирає її з групи (за прилеглістю); ПКМ по згрупованій іконці —
  // розгрупувати. Конфіг: pQuickBars[pid].groups = [{ items:[id...], gap:N }] (група —
  // завжди суцільний під-діапазон items; gap — порожні слоти ПЕРЕД групою).
  // ============================================================================
  const _qabSel = { pid: null, ids: new Set() };
  const _qabGroupOf = (p, id) => (Array.isArray(p && p.groups) ? p.groups.find(g => Array.isArray(g.items) && g.items.indexOf(id) >= 0) : null);

  window.msQabToggleSelect = function (pid, id) {
    if (_qabSel.pid !== pid) { _qabSel.pid = pid; _qabSel.ids.clear(); }
    if (_qabSel.ids.has(id)) _qabSel.ids.delete(id); else _qabSel.ids.add(id);
    _qabRefreshSelClass();
  };
  window.msQabClearSelect = function () {
    if (!_qabSel.ids.size && !_qabSel.pid) return;
    _qabSel.ids.clear(); _qabSel.pid = null; _qabRefreshSelClass();
  };
  function _qabRefreshSelClass() {
    PANEL_IDS.forEach(pid => {
      const bar = $id('msp-qab-' + pid); if (!bar) return;
      bar.querySelectorAll('.msp-qab-btn').forEach(b => {
        b.classList.toggle('msp-qab-selected', _qabSel.pid === pid && _qabSel.ids.has(b.dataset.qabCmd));
      });
    });
  }
  // Enter: група з ВИБРАНОГО суцільного блоку (проміжні невибрані теж входять — рішення юзера)
  window.msQabGroupSelected = function () {
    if (!_qabSel.pid || !_qabSel.ids.size) return;
    const pid = _qabSel.pid, p = window.msQabPanel(pid); if (!p) return;
    const items = Array.isArray(p.items) ? p.items : [];
    const idxs = []; items.forEach((id, i) => { if (_qabSel.ids.has(id)) idxs.push(i); });
    if (!idxs.length) return;
    const span = items.slice(Math.min.apply(null, idxs), Math.max.apply(null, idxs) + 1);
    if (span.length < 2) return; // група з 1 іконки безглузда
    if (!Array.isArray(p.groups)) p.groups = [];
    // прибрати ці id зі старих груп + додати нову; нормалізатор розіб'є розірваний залишок старої
    p.groups.forEach(g => { g.items = (g.items || []).filter(id => span.indexOf(id) < 0); });
    p.groups.push({ items: span, gap: 0 });
    _qabNormalizeGroups(p); // build397(ревью): інваріант непреривності
    window.msQabClearSelect();
    msQabSet({}, pid); // збереже + перерендерить
  };
  window.msQabUngroup = function (pid, gi) {
    const p = window.msQabPanel(pid); if (!p || !Array.isArray(p.groups) || !p.groups[gi]) return;
    p.groups.splice(gi, 1);
    msQabSet({}, pid);
  };

  // build400 (юзер): ПКМ по групі — міні-меню «Колір… / Розгрупувати». Колір відкриває модалку з
  // колорпікерами фону кнопок і кольору іконки (пер-групово, поверх панельних). Уніфіковано з рештою.
  function _qabCloseMenus() {
    document.querySelectorAll('.msp-qab-ctxmenu').forEach(m => { if (m._off) { document.removeEventListener('mousedown', m._off, true); document.removeEventListener('contextmenu', m._off, true); } m.remove(); });
    document.querySelectorAll('.msp-qab-colormodal-backdrop').forEach(m => m.remove());
  }
  function _qabGroupMenu(pid, gi, x, y) {
    _qabCloseMenus();
    const menu = document.createElement('div');
    menu.className = 'msp-qab-ctxmenu';
    menu.style.left = x + 'px'; menu.style.top = y + 'px';
    const add = (label, danger, fn) => {
      const it = document.createElement('div');
      it.className = 'msp-qab-ctxitem' + (danger ? ' danger' : '');
      it.textContent = label;
      it.addEventListener('mousedown', (ev) => { ev.preventDefault(); ev.stopPropagation(); _qabCloseMenus(); fn(); });
      menu.appendChild(it);
    };
    add(tr('Колір…'), false, () => _qabGroupColorModal(pid, gi));
    add(tr('Розгрупувати'), true, () => window.msQabUngroup(pid, gi));
    document.body.appendChild(menu);
    // не вилізти за екран
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = (x - r.width) + 'px';
    if (r.bottom > window.innerHeight) menu.style.top = (y - r.height) + 'px';
    setTimeout(() => { // закрити при кліку/ПКМ поза меню (capture, щоб перехопити раніше)
      const off = (ev) => { if (!menu.contains(ev.target)) _qabCloseMenus(); };
      menu._off = off;
      document.addEventListener('mousedown', off, true);
      document.addEventListener('contextmenu', off, true);
    }, 0);
  }
  function _qabGroupColorModal(pid, gi) {
    const p = window.msQabPanel(pid); if (!p || !p.groups || !p.groups[gi]) return;
    const g = p.groups[gi];
    const back = document.createElement('div');
    back.className = 'msp-qab-colormodal-backdrop';
    back.addEventListener('mousedown', (ev) => { if (ev.target === back) _qabCloseMenus(); });
    const box = document.createElement('div');
    box.className = 'msp-qab-colormodal';
    box.addEventListener('mousedown', (ev) => ev.stopPropagation());
    const title = document.createElement('div'); title.className = 'msp-qab-cm-title'; title.textContent = tr('Колір групи'); box.appendChild(title);
    const mkRow = (labelText, cur, def, apply, reset) => {
      const row = document.createElement('div'); row.className = 'msp-qab-cm-row';
      const lb = document.createElement('span'); lb.textContent = tr(labelText); lb.className = 'msp-qab-cm-lb'; row.appendChild(lb);
      const inp = document.createElement('input'); inp.type = 'color'; inp.value = cur || def;
      inp.addEventListener('input', () => apply(inp.value));
      inp.addEventListener('change', () => apply(inp.value));
      row.appendChild(inp);
      const rb = document.createElement('button'); rb.type = 'button'; rb.textContent = tr('Скинути'); rb.className = 'msp-qab-cm-reset';
      rb.addEventListener('click', () => { reset(); inp.value = def; });
      row.appendChild(rb);
      box.appendChild(row);
      return inp;
    };
    const panelBg = (p.bg || '#ffffff');
    mkRow('Фон кнопок:', g.bg, panelBg, (v) => { g.bg = v; msQabSet({}, pid); }, () => { delete g.bg; msQabSet({}, pid); });
    mkRow('Колір іконки:', g.color, '#334155', (v) => { g.color = v; msQabSet({}, pid); }, () => { delete g.color; msQabSet({}, pid); });
    const done = document.createElement('button'); done.type = 'button'; done.className = 'msp-qab-cm-done'; done.textContent = tr('Готово');
    done.addEventListener('click', () => _qabCloseMenus());
    box.appendChild(done);
    back.appendChild(box);
    document.body.appendChild(back);
  }
  // build397(ревью): ЄДИНИЙ нормалізатор інваріанту «група — суцільний під-діапазон items».
  // Ріже кожну групу на maximal-contiguous прогони за позиціями в items[], лишає прогони >=2,
  // дедуп id (перша група claim'ає), викидає id поза items. Зветься з усіх мутаторів груп +
  // з applyConfig (само-ремонт збереженого биття). БЕЗ нього: групування внутрішності старої
  // групи лишало розірваний залишок [голова..хвіст] → рамка налазила на чужу групу.
  function _qabNormalizeGroups(p, order) {
    if (!p || !Array.isArray(p.groups)) return;
    // order — актуальний порядок items (reconcile передає НОВИЙ порядок, бо p.items ще не оновлено)
    const items = Array.isArray(order) ? order : (Array.isArray(p.items) ? p.items : []);
    const pos = {}; items.forEach((id, i) => { pos[id] = i; });
    const used = new Set(), out = [];
    p.groups.forEach(g => {
      if (!g || !Array.isArray(g.items)) return;
      const gap = Math.max(0, Math.min(30, g.gap | 0));
      const extra = {}; // build400: пер-групові кольори (фон/іконка) — проносимо крізь нормалізацію
      if (typeof g.bg === 'string') extra.bg = g.bg;
      if (typeof g.color === 'string') extra.color = g.color;
      const ids = g.items.filter(id => pos[id] !== undefined && !used.has(id)).sort((a, b) => pos[a] - pos[b]);
      let run = [];
      const flush = () => { if (run.length >= 2) { run.forEach(id => used.add(id)); out.push(Object.assign({ items: run.slice(), gap }, extra)); } run = []; };
      ids.forEach(id => { if (run.length && pos[id] !== pos[run[run.length - 1]] + 1) flush(); run.push(id); });
      flush();
    });
    p.groups = out;
  }
  window.msQabNormalizeGroups = _qabNormalizeGroups; // для смоуку

  // після reorder ЛКМ: іконка movedId могла зайти у групу (прилягла до її члена) або вийти.
  // build402: dropId — кнопка ПІД КУРСОРОМ на дропі. Якщо вона в групі → входимо САМЕ в неї (знімає
  // неоднозначність на межі двох суміжних груп: раніше prev вигравав і іконка «відскакувала» назад).
  window.msQabReconcileGroups = function (pid, newItems, movedId, dropId) {
    const p = window.msQabPanel(pid); if (!p || !Array.isArray(p.groups) || !p.groups.length) return;
    p.groups.forEach(g => { g.items = (g.items || []).filter(id => id !== movedId); }); // прибрати moved звідусіль
    let g = null;
    if (dropId && dropId !== movedId) g = p.groups.find(gr => gr.items.indexOf(dropId) >= 0); // ЦІЛЬ дропу вирішує
    if (!g) { // фолбек (dropId поза групами / нема) — прилеглість prev/next, як build397
      const idx = newItems.indexOf(movedId);
      if (idx >= 0) {
        const prev = newItems[idx - 1], next = newItems[idx + 1];
        g = p.groups.find(gr => gr.items.indexOf(prev) >= 0) || p.groups.find(gr => gr.items.indexOf(next) >= 0);
      }
    }
    if (g) g.items = g.items.concat([movedId]); // впорядкуємо нижче
    // нормалізувати за НОВИМ порядком (p.items оновиться пізніше в msQabSet): непреривність, дедуп, >=2
    _qabNormalizeGroups(p, newItems);
  };
  // рамки груп — absolute-оверлеї в bar (не в потоці flex); малюються за bbox кнопок групи
  function _qabDrawFrames(bar, pid) {
    bar.querySelectorAll('.msp-qab-group-frame').forEach(el => el.remove());
    const cfg = window.msQabPanel(pid) || {};
    const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
    groups.forEach((g, gi) => {
      if (!Array.isArray(g.items) || !g.items.length) return;
      const btns = g.items.map(id => bar.querySelector('.msp-qab-btn[data-qab-cmd="' + id + '"]')).filter(Boolean);
      if (!btns.length) return;
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      btns.forEach(x => { l = Math.min(l, x.offsetLeft); t = Math.min(t, x.offsetTop); r = Math.max(r, x.offsetLeft + x.offsetWidth); b = Math.max(b, x.offsetTop + x.offsetHeight); });
      const pad = (window.pQabFrame && Number.isFinite(pQabFrame.pad)) ? pQabFrame.pad : 3; // build401: глобальний відступ
      const f = document.createElement('div');
      f.className = 'msp-qab-group-frame';
      f.dataset.qabGroup = String(gi);
      f.style.left = (l - pad) + 'px'; f.style.top = (t - pad) + 'px';
      f.style.width = (r - l + pad * 2) + 'px'; f.style.height = (b - t + pad * 2) + 'px';
      bar.appendChild(f);
    });
  }
  // build400: спільний ghost-блок (клон кнопок групи, fixed під курсором) — для gap-drag і reorder-drag.
  function _qabMakeGhost(bar, vert, btns, startX, startY) {
    const fr = btns[0].getBoundingClientRect();
    const gh = document.createElement('div');
    gh.className = 'msp-reorder-ghost msp-qab-groupghost';
    const cs = getComputedStyle(bar);
    gh.style.cssText = 'position:fixed; z-index:9999; pointer-events:none; display:flex; gap:4px; padding:3px; box-sizing:border-box; flex-direction:' + (vert ? 'column' : 'row') + ';';
    gh.style.setProperty('--qab', cs.getPropertyValue('--qab'));
    gh.style.setProperty('--qab-bg', cs.getPropertyValue('--qab-bg'));
    btns.forEach(b => { const c = b.cloneNode(true); c.classList.remove('msp-reorder-placeholder', 'msp-qab-selected'); gh.appendChild(c); });
    document.body.appendChild(gh);
    return { el: gh, offX: startX - fr.left, offY: startY - fr.top };
  }

  // build400 (юзер): СКМ (без Shift) — тягнути групу у ВІЛЬНУ позицію (gap). Тепер СУСІДИ НЕ ЇДУТЬ під
  // час драга: рухається лише ghost + тонка ЛІНІЯ-ІНДИКАТОР показує, куди стане верх групи; сам зсув
  // (gap) застосовується ТІЛЬКИ на відпусканні. Вниз (+) → gap росте; вгору → gap до 0.
  function _qabGroupDragSCM(bar, pid, gi, e) {
    const p = window.msQabPanel(pid); if (!p || !p.groups || !p.groups[gi]) return;
    const g = p.groups[gi];
    const vert = bar.classList.contains('msp-qab-v');
    const sel = '.msp-qab-btn';
    const step = Math.max(20, Math.min(56, (p.size | 0) || 30)) + 4;
    const inGroup = (b) => !!b && g.items.indexOf(b.dataset.qabCmd) >= 0;
    const groupBtns = () => [].slice.call(bar.querySelectorAll(sel)).filter(inGroup);
    const startX = e.clientX, startY = e.clientY;
    const baseGap = g.gap | 0;
    let dragging = false, ghost = null, offX = 0, offY = 0, ind = null, newGap = baseGap;
    const moveGhost = (x, y) => { if (ghost) { ghost.style.left = (x - offX) + 'px'; ghost.style.top = (y - offY) + 'px'; } };
    const positionInd = () => {
      if (!ind) return;
      const btns = groupBtns(); if (!btns.length) return;
      const shift = (newGap - baseGap) * step; // куди зʼїде ВЕРХ групи (сусіди НЕ рухаємо — тільки лінія)
      const fb = btns[0];
      if (vert) { ind.style.left = '2px'; ind.style.right = '2px'; ind.style.top = (fb.offsetTop + shift - 1) + 'px'; }
      else { ind.style.top = '2px'; ind.style.bottom = '2px'; ind.style.left = (fb.offsetLeft + shift - 1) + 'px'; }
    };
    const begin = () => {
      dragging = true;
      bar.querySelectorAll('.msp-qab-group-frame').forEach(f => f.remove());
      const btns = groupBtns(); if (!btns.length) { dragging = false; return; }
      const gh = _qabMakeGhost(bar, vert, btns, startX, startY); ghost = gh.el; offX = gh.offX; offY = gh.offY;
      btns.forEach(b => b.classList.add('msp-reorder-placeholder'));
      ind = document.createElement('div'); ind.className = 'msp-qab-dropline' + (vert ? '' : ' h'); bar.appendChild(ind);
      document.body.style.cursor = 'grabbing'; document.body.style.userSelect = 'none';
      moveGhost(startX, startY); positionInd();
    };
    const onMove = (em) => {
      if (!dragging) { if (Math.abs(em.clientX - startX) < 4 && Math.abs(em.clientY - startY) < 4) return; begin(); if (!dragging) return; }
      moveGhost(em.clientX, em.clientY);
      const d = vert ? (em.clientY - startY) : (em.clientX - startX);
      newGap = Math.max(0, Math.min(30, baseGap + Math.round(d / step)));
      positionInd();
    };
    let done = false;
    const up = () => {
      if (done) return; done = true;
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', up);
      document.removeEventListener('mouseleave', up); window.removeEventListener('blur', up);
      document.body.style.cursor = ''; document.body.style.userSelect = '';
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      if (ind && ind.parentNode) ind.parentNode.removeChild(ind);
      if (!dragging) return;
      g.gap = newGap; // застосовуємо gap ТІЛЬКИ тут (сусіди зсуваються на відпусканні)
      if (window.pSaveGlobalSettings) try { pSaveGlobalSettings(); } catch (e2) { }
      msQabRender();
    };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', up);
    document.addEventListener('mouseleave', up); window.addEventListener('blur', up);
  }

  // build398 (юзер): СКМ+Shift — переставити ВСЮ групу як БЛОК за/перед іншими групами/іконками.
  // Модель «юнітів»: кожна група — один юніт (її items), кожна негрупована іконка — юніт з 1.
  // Група-юніт переставляється серед юнітів (перестрибує сусідів ЦІЛКОМ, не рве їх); gap їде з нею.
  function _qabUnits(p) {
    const items = Array.isArray(p.items) ? p.items : [];
    const groups = Array.isArray(p.groups) ? p.groups : [];
    const gOf = (id) => groups.find(g => Array.isArray(g.items) && g.items.indexOf(id) >= 0);
    // build398(ревью): НЕ довіряти g.items.length — беремо ФАКТИЧНИЙ непреривний run тієї ж групи в
    // items[] + `seen` (не переемітити групу двічі при десинхроні). Кожен items[i] емітиться РІВНО раз,
    // i завжди росте ≥1 → ні втрати, ні дублів навіть якщо група розсинхронилась із items.
    const units = [], seen = new Set(); let i = 0;
    while (i < items.length) {
      const g = gOf(items[i]);
      if (g && !seen.has(g)) {
        const ids = [];
        while (i < items.length && gOf(items[i]) === g) { ids.push(items[i]); i++; }
        seen.add(g);
        units.push({ group: g, ids: ids });
      } else { units.push({ group: null, ids: [items[i]] }); i++; }
    }
    return units;
  }
  // чиста перестановка групи-юніта перед/після цільової іконки — тестується окремо
  window.msQabMoveGroupUnit = function (pid, gi, targetId, after) {
    const p = window.msQabPanel(pid); if (!p || !p.groups || !p.groups[gi]) return;
    const g = p.groups[gi];
    if (g.items.indexOf(targetId) >= 0) return; // ціль усередині нашої групи — no-op
    const units = _qabUnits(p);
    const ui = units.findIndex(u => u.group === g); if (ui < 0) return;
    const [uOur] = units.splice(ui, 1);
    const ti = units.findIndex(u => u.ids.indexOf(targetId) >= 0);
    if (ti < 0) { units.splice(ui, 0, uOur); return; } // ціль зникла — повернути на місце
    units.splice(after ? ti + 1 : ti, 0, uOur);
    p.items = units.reduce((a, u) => a.concat(u.ids), []);
  };
  // build399 (юзер): АНІМОВАНИЙ блок-перенос — ghost усього блоку летить за курсором, сусіди плавно
  // розʼїжджаються (FLIP), як у сторінок. Через DOM-маніпуляцію (insertBefore блоку + FLIP) замість
  // миттєвого msQabRender: рамки прибираємо на час драга, на commit серіалізуємо DOM→items+нормалізація.
  function _qabGroupReorderSCM(bar, pid, gi, e) {
    const p = window.msQabPanel(pid); if (!p || !p.groups || !p.groups[gi]) return;
    const g = p.groups[gi];
    const vert = bar.classList.contains('msp-qab-v');
    const sel = '.msp-qab-btn';
    const inGroup = (btn) => !!btn && g.items.indexOf(btn.dataset.qabCmd) >= 0;
    const groupBtns = () => [].slice.call(bar.querySelectorAll(sel)).filter(inGroup);
    const startX = e.clientX, startY = e.clientY;
    let dragging = false, ghost = null, offX = 0, offY = 0;

    const begin = () => {
      dragging = true;
      bar.querySelectorAll('.msp-qab-group-frame').forEach(f => f.remove()); // рамки стануть застарілими
      const btns = groupBtns(); if (!btns.length) { dragging = false; return; }
      const gh = _qabMakeGhost(bar, vert, btns, startX, startY); ghost = gh.el; offX = gh.offX; offY = gh.offY; // build400: спільний ghost
      btns.forEach(b => b.classList.add('msp-reorder-placeholder'));
      document.body.style.cursor = 'grabbing'; document.body.style.userSelect = 'none';
      _moveGhost(startX, startY);
    };
    const _moveGhost = (x, y) => { if (ghost) { ghost.style.left = (x - offX) + 'px'; ghost.style.top = (y - offY) + 'px'; } };
    const flipMove = (ref) => { // перемістити ВЕСЬ блок перед ref + FLIP сусідів (блок не анімуємо — він «в руці»)
      const all = [].slice.call(bar.querySelectorAll(sel));
      const first = new Map(all.map(t => { const r = t.getBoundingClientRect(); return [t, [r.left, r.top]]; }));
      groupBtns().forEach(b => bar.insertBefore(b, ref));
      all.forEach(t => { t.style.transition = 'none'; t.style.transform = ''; });
      const last = new Map(all.map(t => { const r = t.getBoundingClientRect(); return [t, [r.left, r.top]]; }));
      all.forEach(t => {
        if (inGroup(t)) return;
        const dx = first.get(t)[0] - last.get(t)[0], dy = first.get(t)[1] - last.get(t)[1];
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) t.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      requestAnimationFrame(() => { all.forEach(t => { if (inGroup(t) || !t.style.transform) return; t.style.transition = 'transform 0.15s ease'; t.style.transform = ''; }); });
    };
    const onMove = (em) => {
      if (!dragging) { if (Math.abs(em.clientX - startX) < 4 && Math.abs(em.clientY - startY) < 4) return; begin(); if (!dragging) return; }
      _moveGhost(em.clientX, em.clientY);
      const under = document.elementFromPoint(em.clientX, em.clientY);
      const tgt = (under && under.closest) ? under.closest(sel) : null;
      if (!tgt || tgt.parentElement !== bar || inGroup(tgt)) return;
      let ref;
      const tg = _qabGroupOf(p, tgt.dataset.qabCmd);
      if (tg && tg !== g) {
        // build399(ревью): ціль — член ЧУЖОЇ групи → снапимо ref до ЇЇ ГРАНИЦІ (не рвемо чужу групу;
        // блок завжди стає ЦІЛКОМ до/після неї, як у юніт-моделі build398). after — за центром УСЬОГО чужого блоку.
        const tb = [].slice.call(bar.querySelectorAll(sel)).filter(b => tg.items.indexOf(b.dataset.qabCmd) >= 0);
        if (!tb.length) return;
        const fr = tb[0].getBoundingClientRect(), lr = tb[tb.length - 1].getBoundingClientRect();
        const after = vert ? (em.clientY > (fr.top + lr.bottom) / 2) : (em.clientX > (fr.left + lr.right) / 2);
        ref = after ? tb[tb.length - 1].nextSibling : tb[0];
      } else {
        const r = tgt.getBoundingClientRect();
        const after = vert ? (em.clientY > r.top + r.height / 2) : (em.clientX > r.left + r.width / 2);
        ref = after ? tgt.nextSibling : tgt;
      }
      const gb = groupBtns();
      if (ref === gb[0] || gb[gb.length - 1].nextSibling === ref) return; // уже на місці
      flipMove(ref);
    };
    let done = false;
    const up = () => {
      if (done) return; done = true;
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', up);
      document.removeEventListener('mouseleave', up); window.removeEventListener('blur', up);
      document.body.style.cursor = ''; document.body.style.userSelect = '';
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      if (!dragging) return; // клік без драга
      const ids = [].slice.call(bar.querySelectorAll(sel)).map(b => b.dataset.qabCmd).filter(Boolean);
      p.items = ids;
      _qabNormalizeGroups(p); // блок лишився суцільним (insertBefore усіх кнопок разом)
      if (window.pSaveGlobalSettings) try { pSaveGlobalSettings(); } catch (e2) { }
      msQabRender(); // зніме placeholder-класи + перемалює spacer/рамки на новому місці
    };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', up);
    document.addEventListener('mouseleave', up); window.addEventListener('blur', up);
  }

  // клавіатура (один раз): Enter — згрупувати вибране, Esc — зняти вибір
  if (!window.__qabKeysBound) {
    window.__qabKeysBound = true;
    document.addEventListener('keydown', (e) => {
      if (!_qabSel.pid || !_qabSel.ids.size) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      if (e.key === 'Enter') { e.preventDefault(); window.msQabGroupSelected(); }
      else if (e.key === 'Escape') { window.msQabClearSelect(); }
    });
  }

  // ---------- рендер усіх панелей ----------
  window.msQabRender = function () {
    PANEL_IDS.forEach(pid => {
      const bar = $id('msp-qab-' + pid); if (!bar) return;
      const cfg = window.msQabPanel(pid) || {};
      const cmds = (Array.isArray(cfg.items) ? cfg.items : [])
        .map(id => (window.msCmd ? msCmd(id) : null)).filter(Boolean); // невідомі id — мовчки повз
      if (!cfg.on || !cmds.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
      const size = Math.max(20, Math.min(56, cfg.size | 0 || 30));
      bar.style.setProperty('--qab', size + 'px');
      bar.style.setProperty('--qab-bg', cfg.bg || '#ffffff');
      bar.innerHTML = '';
      // build397: рендер по items (а не cmds) — потрібен порядок id + межі груп/спейсери
      const items = Array.isArray(cfg.items) ? cfg.items : [];
      const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
      const step = size + 4;
      const gOf = (id) => groups.find(g => Array.isArray(g.items) && g.items.indexOf(id) >= 0);
      items.forEach(id => {
        const c = window.msCmd ? msCmd(id) : null; if (!c) return; // невідомі id — мовчки повз
        const g = gOf(id);
        if (g && g.items[0] === id && (g.gap | 0) > 0) { // build397: порожні слоти ПЕРЕД групою (вільна позиція)
          const sp = document.createElement('div');
          sp.className = 'msp-qab-spacer';
          sp.style.flex = '0 0 ' + ((g.gap | 0) * step) + 'px';
          bar.appendChild(sp);
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'msp-qab-btn' + (c.danger ? ' msp-qab-danger' : '');
        b.dataset.qabCmd = c.id;
        if (g) {
          b.dataset.qabGroup = String(groups.indexOf(g)); b.classList.add('msp-qab-grouped');
          if (g.bg) b.style.background = g.bg;     // build400: пер-груповий фон кнопок
          if (g.color) b.style.color = g.color;    // build400: пер-груповий колір іконки (currentColor)
        }
        if (_qabSel.pid === pid && _qabSel.ids.has(c.id)) b.classList.add('msp-qab-selected');
        b.title = tr(c.label);
        b.innerHTML = String(c.icon || '').startsWith('<svg') ? c.icon : ('<span style="font-size:14px;line-height:1;">' + (c.icon || '•') + '</span>');
        let on = false; try { on = !!(c.isActive && c.isActive()); } catch (e) { }
        b.classList.toggle('msp-cmd-active', on);
        // build389: клік І перетягування на одній кнопці — поріг 4px вирішує (клік = run, драг = reorder)
        b.addEventListener('mousedown', (e) => _qabBtnDown(bar, pid, b, c, e));
        if (g) b.addEventListener('contextmenu', (ev) => { ev.preventDefault(); ev.stopPropagation(); _qabGroupMenu(pid, groups.indexOf(g), ev.clientX, ev.clientY); }); // build400: ПКМ — міні-меню (Колір/Розгрупувати)
        bar.appendChild(b);
      });
      bar.style.display = 'flex';
      _qabDrawFrames(bar, pid); // build397: рамки груп поверх (absolute, поза flex)
    });
    if (window.scaleSheet) try { scaleSheet(); } catch (e) { } // перевпише лист і викличе msQabPlace
    window.msQabPlace();
  };

  // ---------- build389: прив'язка панелей ВПРИТУЛ до фактичного прямокутника листа ----------
  // Панелі absolute у #viewport; #a4-sheet масштабується transform:scale — беремо його
  // getBoundingClientRect ВІДНОСНО viewport. Зветься з msQabRender і з кінця scaleSheet (core.js).
  window.msQabPlace = function () {
    const vp = $id('viewport'), sheet = $id('a4-sheet'); if (!vp || !sheet) return;
    const vr = vp.getBoundingClientRect(), sr = sheet.getBoundingClientRect();
    const GAP = 6;
    const px = (n) => Math.round(n) + 'px';
    const top = $id('msp-qab-top');
    if (top && top.style.display !== 'none') {
      top.style.maxWidth = px(sr.width); // спочатку ширина: від неї залежить перенос рядів (flex-wrap)
      void top.offsetWidth;              // reflow — нижче offsetHeight вже АКТУАЛЬНОЇ обгортки
      top.style.left = px(sr.left - vr.left);
      top.style.top = px(Math.max(GAP, sr.top - vr.top - top.offsetHeight - GAP)); // build391: зверху теж 6px
    }
    const left = $id('msp-qab-left');
    if (left && left.style.display !== 'none') {
      left.style.left = px(Math.max(GAP, sr.left - vr.left - left.offsetWidth - GAP));
      left.style.top = px(sr.top - vr.top);
      left.style.maxHeight = px(sr.height);
    }
    const right = $id('msp-qab-right');
    if (right && right.style.display !== 'none') {
      right.style.left = px(Math.min(vr.width - right.offsetWidth - GAP, sr.right - vr.left + GAP));
      right.style.top = px(sr.top - vr.top);
      right.style.maxHeight = px(sr.height);
    }
  };

  // підсвітка активних на ВСІХ панелях (та сама шина, що для кнопок секцій)
  if (window.msTool) {
    msTool.onChange((id, on) => {
      PANEL_IDS.forEach(pid => {
        const bar = $id('msp-qab-' + pid); if (!bar) return;
        bar.querySelectorAll('[data-qab-cmd="' + id + '"]').forEach(el => el.classList.toggle('msp-cmd-active', on));
      });
    });
  }

  // ---------- build389→391: клік/перетягування кнопки прямо на панелі — спільний Trello-reorder ----------
  function _qabBtnDown(bar, pid, btn, cmd, e) {
    // build397: Shift+клік — мультивибір (без запуску/reorder)
    if (e.button === 0 && e.shiftKey) { e.preventDefault(); window.msQabToggleSelect(pid, cmd.id); return; }
    // build397/398: СКМ по ЗГРУПОВАНІЙ кнопці — Shift: переставити групу-БЛОК за/перед інші (build398);
    // без Shift: тягнути групу у вільну позицію (gap, build397).
    if (e.button === 1) {
      const gi = btn.dataset.qabGroup;
      if (gi != null && gi !== '') {
        e.preventDefault();
        if (e.shiftKey) _qabGroupReorderSCM(bar, pid, parseInt(gi, 10), e);
        else _qabGroupDragSCM(bar, pid, parseInt(gi, 10), e);
      }
      return;
    }
    if (e.button !== 0) return;
    if (!window.msWireReorderDrag) { if (window.msRunCmd) msRunCmd(cmd.id); return; }
    msWireReorderDrag(btn, e, {
      container: bar, itemSelector: '.msp-qab-btn',
      axis: bar.classList.contains('msp-qab-v') ? 'y' : 'x',
      onCommit: (nodes, lastTgt) => {
        const ids = [].slice.call(bar.querySelectorAll('.msp-qab-btn')).map(b => b.dataset.qabCmd).filter(Boolean);
        const dropId = (lastTgt && lastTgt.dataset) ? lastTgt.dataset.qabCmd : null; // build402: над якою кнопкою відпустили
        window.msQabReconcileGroups(pid, ids, cmd.id, dropId); // build397/402: іконка могла зайти/вийти з групи
        msQabSet({ items: ids }, pid);
      },
      onClick: () => { window.msQabClearSelect(); if (window.msRunCmd) msRunCmd(cmd.id); }, // build397: клік знімає вибір
    });
  }

  // ---------- зміна конфігу панелі ----------
  let _curPanel = 'top'; // яку панель зараз редагуємо в налаштуваннях
  window.msQabSet = function (patch, pid) {
    const p = window.msQabPanel(pid || _curPanel); if (!p) return;
    Object.assign(p, patch || {});
    // build398(ревью, КОРІНЬ): будь-яка зміна items (✕/чекбокси каталогу/reorder «Обрані» — усі через
    // msQabSet({items})) могла лишити групу з ghost-id / несуміжною → _qabUnits при блочному drag
    // переїжджав через сусіда (втрата/дубль іконок). Нормалізатор ідемпотентний — хто вже нормалізував
    // (msQabGroupSelected/onCommit) НЕ страждає, бо там patch без items.
    if (patch && patch.items) _qabNormalizeGroups(p);
    if (window.pSaveGlobalSettings) try { pSaveGlobalSettings(); } catch (e) { }
    msQabRender();
    msQabSyncUI();
  };
  window.msQabSelectPanel = function (pid) {
    if (PANEL_IDS.indexOf(pid) < 0) return;
    _curPanel = pid;
    msQabSyncUI();
    msQabBuildSettings();
  };
  // синк статичних контролів підрозділу зі станом ОБРАНОЇ панелі
  window.msQabSyncUI = function () {
    const p = window.msQabPanel(_curPanel) || {};
    const sel = $id('qab-panel'); if (sel) sel.value = _curPanel;
    const chk = $id('qab-on'); if (chk) chk.checked = (p.on !== false);
    const sz = $id('qab-size'); if (sz) sz.value = p.size || 30;
    const bg = $id('qab-bg'); if (bg) bg.value = p.bg || '#ffffff';
    // build401: глобальні контроли рамки груп (не пер-панельні) синкаємо теж
    const fc = $id('qab-frame-color'); if (fc) fc.value = (window.pQabFrame && pQabFrame.color) || '#475569';
    const fw = $id('qab-frame-w'); if (fw) fw.value = (window.pQabFrame && pQabFrame.width) || 2;
    const fp = $id('qab-frame-pad'); if (fp) fp.value = (window.pQabFrame && Number.isFinite(pQabFrame.pad)) ? pQabFrame.pad : 3;
  };

  // ---------- UI налаштувань: «Обрані» (порядок ⣿ + ✕) і «Каталог» (чекбокси) для ОБРАНОЇ панелі ----------
  const GROUP_ORDER = ['Проєкт', 'Компоновка', 'Відображення', 'Види', 'Розміри', 'Аннотації', 'Відкривання', 'Переріз', 'Секції'];
  window.msQabBuildSettings = function () {
    const box = $id('msp-qab-settings'); if (!box || !window.MSP_COMMANDS) return;
    const p = window.msQabPanel(_curPanel) || { items: [] };
    const items = Array.isArray(p.items) ? p.items.slice() : [];
    box.innerHTML = '';

    const selTitle = document.createElement('div');
    selTitle.className = 'label-ui';
    selTitle.textContent = tr('На панелі (тягніть ⣿, ✕ — прибрати):');
    box.appendChild(selTitle);
    const selList = document.createElement('div');
    selList.id = 'qab-selected';
    selList.style.cssText = 'display:flex; flex-direction:column; gap:2px; margin:4px 0 8px;';
    items.forEach(id => {
      const c = window.msCmd ? msCmd(id) : null; if (!c) return;
      const row = document.createElement('div');
      row.className = 'msp-qs-row';
      row.dataset.cmd = c.id;
      const grip = document.createElement('span');
      grip.textContent = '⣿';
      grip.style.cssText = 'cursor:grab; color:#94a3b8; font-size:11px; padding:0 2px; user-select:none;';
      grip.addEventListener('mousedown', (e) => _qabReorderStart(row, e));
      row.appendChild(grip);
      const ic = document.createElement('span');
      ic.className = 'msp-qs-ic';
      ic.innerHTML = String(c.icon || '').startsWith('<svg') ? c.icon : (c.icon || '•');
      row.appendChild(ic);
      const lb = document.createElement('span');
      lb.style.cssText = 'flex:1; font-size:10.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
      lb.textContent = tr(c.label);
      row.appendChild(lb);
      const del = document.createElement('button');
      del.type = 'button'; del.textContent = '✕'; del.title = tr('Прибрати з панелі');
      del.style.cssText = 'border:none; background:none; color:#dc2626; cursor:pointer; font-size:10px; padding:0 3px;';
      del.addEventListener('click', () => { _qabToggleItem(c.id, false); });
      row.appendChild(del);
      selList.appendChild(row);
    });
    if (!items.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:10px; color:#94a3b8; margin:2px 0 8px;';
      empty.textContent = tr('Панель порожня — поставте галочки в каталозі нижче.');
      selList.appendChild(empty);
    }
    box.appendChild(selList);

    const catTitle = document.createElement('div');
    catTitle.className = 'label-ui';
    catTitle.textContent = tr('Каталог команд:');
    box.appendChild(catTitle);
    const bySec = {};
    window.MSP_COMMANDS.forEach(c => { (bySec[c.section] = bySec[c.section] || []).push(c); });
    const secs = GROUP_ORDER.filter(s => bySec[s]).concat(Object.keys(bySec).filter(s => GROUP_ORDER.indexOf(s) < 0));
    secs.forEach(secName => {
      const h = document.createElement('div');
      h.style.cssText = 'font-size:10px; font-weight:700; color:#475569; margin:6px 0 2px;';
      h.textContent = tr(secName);
      box.appendChild(h);
      bySec[secName].forEach(c => {
        const row = document.createElement('label');
        row.className = 'msp-qs-row';
        row.style.cursor = 'pointer';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.style.cssText = 'width:12px; height:12px; margin:0;';
        chk.checked = items.indexOf(c.id) >= 0;
        chk.addEventListener('change', () => _qabToggleItem(c.id, chk.checked));
        row.appendChild(chk);
        const ic = document.createElement('span');
        ic.className = 'msp-qs-ic';
        ic.innerHTML = String(c.icon || '').startsWith('<svg') ? c.icon : (c.icon || '•');
        row.appendChild(ic);
        const lb = document.createElement('span');
        lb.style.cssText = 'flex:1; font-size:10.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
        lb.textContent = tr(c.label);
        row.appendChild(lb);
        box.appendChild(row);
      });
    });
  };

  function _qabToggleItem(id, on) {
    const p = window.msQabPanel(_curPanel); if (!p) return;
    const items = (p.items || []).slice();
    const i = items.indexOf(id);
    if (on && i < 0) items.push(id);
    if (!on && i >= 0) items.splice(i, 1);
    msQabSet({ items });
    msQabBuildSettings();
  }

  // build391: список «Обрані» — спільний Trello-reorder
  function _qabReorderStart(row, e) {
    if (!window.msWireReorderDrag) return;
    msWireReorderDrag(row, e, {
      container: $id('qab-selected'), itemSelector: '.msp-qs-row', axis: 'y',
      onCommit: () => {
        const list = $id('qab-selected'); if (!list) return;
        const ids = [].slice.call(list.querySelectorAll('.msp-qs-row')).map(r => r.dataset.cmd).filter(Boolean);
        msQabSet({ items: ids });
      },
    });
  }

  // ---------- застосування конфігу з файла (зве pApplyGlobalSettings) ----------
  window.msQabApplyConfig = function (arr) {
    if (!Array.isArray(arr)) return;
    arr.forEach(qb => {
      if (!qb || typeof qb !== 'object') return;
      // міграція v386 — одна панель {dock, on, items} без id → панель відповідного дока
      const pid = qb.id || qb.dock || 'top';
      const p = window.msQabPanel(pid); if (!p) return;
      if (typeof qb.on === 'boolean') p.on = qb.on;
      if (Number.isFinite(qb.size)) p.size = Math.max(20, Math.min(56, qb.size));
      if (typeof qb.bg === 'string' && /^#[0-9a-fA-F]{6}$/.test(qb.bg)) p.bg = qb.bg;
      if (Array.isArray(qb.items)) p.items = qb.items.slice();
      // build397: групи іконок {items:[...], gap}. Валідуємо + НОРМАЛІЗУЄМО (непреривність, дедуп,
      // >=2, тільки id з items) — само-ремонт збереженого биття зі старих версій/ручних правок.
      if (Array.isArray(qb.groups)) {
        const hex = (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : undefined; // build400
        p.groups = qb.groups
          .filter(g => g && Array.isArray(g.items) && g.items.length >= 2)
          .map(g => { const o = { items: g.items.slice(), gap: Math.max(0, Math.min(30, g.gap | 0)) }; const b = hex(g.bg), c = hex(g.color); if (b) o.bg = b; if (c) o.color = c; return o; });
        _qabNormalizeGroups(p); // build397(ревью): p.items уже застосовано вище
      }
    });
  };

  // build387(ревью): БЕЗ рендера на завантаженні — перший рендер робить pApplyGlobalSettings.
})();
