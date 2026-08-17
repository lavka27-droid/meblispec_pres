/**
 * MebliSpec PRO — Shared Constants
 */

const VIEW_TYPES = {
  front: { name: 'Спереду', dir: [0, 0, 1], up: [0, 1, 0] },
  back: { name: 'Ззаду', dir: [0, 0, -1], up: [0, 1, 0] },
  left: { name: 'Зліва', dir: [-1, 0, 0], up: [0, 1, 0] },
  right: { name: 'Справа', dir: [1, 0, 0], up: [0, 1, 0] },
  top: { name: 'Зверху', dir: [0, 1, 0], up: [0, 0, -1] },
  bottom: { name: 'Знизу', dir: [0, -1, 0], up: [0, 0, 1] },
  iso: { name: 'Ізометрія', dir: [1, 1, 1], up: [0, 1, 0] },
  custom: { name: 'Поточний вид', useCurrentCamera: true },
  persp: { name: 'Перспектива', useCurrentCamera: true, isPerspective: true },
  table: { name: 'Деталі', isTable: true },
  table_full: { name: 'Деталі+фурнітура', isTable: true }
};

const LAYOUTS = {
  'single': { name: 'Один вид', slots: 1, grid: [[0, 0, 100, 100]] },
  '2v': { name: '2 вертикально', slots: 2, grid: [[0, 0, 50, 100], [50, 0, 50, 100]] },
  '2x2': { name: '2×2 сітка', slots: 4, grid: [[0, 0, 50, 50], [50, 0, 50, 50], [0, 50, 50, 50], [50, 50, 50, 50]] },
  // build101: 8 видів — 4 стовпці × 2 ряди. Комірки портретні (аспект √2) — добре для високих меблів.
  '4x2': { name: '4×2 сітка (8)', slots: 8, grid: [[0, 0, 25, 50], [25, 0, 25, 50], [50, 0, 25, 50], [75, 0, 25, 50], [0, 50, 25, 50], [25, 50, 25, 50], [50, 50, 25, 50], [75, 50, 25, 50]] },
  // build281: 1 великий вид ліворуч (на всю висоту) + 2 менших праворуч, один над одним.
  '1l2r': { name: '1 ліворуч + 2 праворуч', slots: 3, grid: [[0, 0, 50, 100], [50, 0, 50, 50], [50, 50, 50, 50]] }
};

// build280: за замовчуванням — «Перспектива» (persp), а НЕ «Поточний вид» (custom). Юзер:
// «удаляем Поточний вигляд [зі всіх видів]. По умолчанию оставляем перспектива». Ключ 'custom'
// лишається у VIEW_TYPES (шар нижче) для зворотної сумісності зі старими проектами — просто
// прибраний зі списків вибору у UI (3 місця в core.js/pres_engine.js) і з дефолтів тут.
const LAYOUT_DEFAULT_SLOTS = {
  'single': ['persp'],
  '2v': ['persp', 'front'],
  '2x2': ['front', 'left', 'top', 'persp'],
  '4x2': ['front', 'back', 'left', 'right', 'top', 'bottom', 'iso', 'persp'],
  '1l2r': ['persp', 'front', 'top'] // build281
};

window.VIEW_TYPES = VIEW_TYPES;
window.LAYOUTS = LAYOUTS;
window.LAYOUT_DEFAULT_SLOTS = LAYOUT_DEFAULT_SLOTS;
