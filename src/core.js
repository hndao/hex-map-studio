export const PALETTE_ID = 'hex-palette-six-v1';
export const RULESET = 'hex-relaxed-partial-v1';
export const MAX_CELLS = 4096;
export const PALETTE = Object.freeze([
  { id: 1, name: 'Ngọc', hex: '#08B6BC' }, { id: 2, name: 'Vàng', hex: '#F9B915' },
  { id: 3, name: 'San hô', hex: '#F35664' }, { id: 4, name: 'Tím', hex: '#9A48E5' },
  { id: 5, name: 'Xanh trời', hex: '#2788EF' }, { id: 6, name: 'Xanh lá', hex: '#72CD72' }
].map(c => Object.freeze(c)));
const DIRECTIONS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const key = c => `${c.q},${c.r}`;
const integer = (n, min, max, name) => {
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${name}: cần số nguyên từ ${min} đến ${max}.`);
};
const shape = (value, keys, name) => {
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k)))
    throw new Error(`${name}: trường dữ liệu không đúng schema v2.`);
};
const equal = (a, b, name) => { if (a !== b) throw new Error(`${name}: giá trị không được hỗ trợ.`); };

// Same flat-top geometry as the runtime. Screen Y is the inverse of world Y.
export function position(c) { return { x: 1.5 * c.q, y: -Math.sqrt(3) * (c.r + c.q / 2) }; }
export function bounds(cells) {
  if (!cells.length) throw new Error('Map chưa có ô.');
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const c of cells) {
    const p = position(c); left = Math.min(left, p.x - 1); right = Math.max(right, p.x + 1);
    top = Math.min(top, p.y - Math.sqrt(3) / 2); bottom = Math.max(bottom, p.y + Math.sqrt(3) / 2);
  }
  return { left, top, width: right - left, height: bottom - top };
}
export function grid(columns, rows) {
  integer(columns, 2, 64, 'Số cột'); integer(rows, 2, 64, 'Số hàng');
  const cells = [];
  for (let q = 0; q < columns; q++)
    for (let row = 0; row < rows; row++) cells.push({ q, r: -row - Math.floor(q / 2) });
  return cells.sort((a, b) => a.q - b.q || a.r - b.r);
}

function lab(rgb) {
  const [r, g, b] = rgb.map(v => { const x = v / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
  const f = x => x > 216 / 24389 ? Math.cbrt(x) : x * (24389 / 27) / 116 + 16 / 116;
  const x = f((r * .4124564 + g * .3575761 + b * .1804375) / .95047);
  const y = f(r * .2126729 + g * .7151522 + b * .0721750);
  const z = f((r * .0193339 + g * .1191920 + b * .9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const paletteLab = PALETTE.map(c => ({ id: c.id, lab: lab(c.hex.slice(1).match(/../g).map(s => parseInt(s, 16))) }));
export function nearestColor(rgb, ids = PALETTE.map(c => c.id)) {
  if (!ids.length || ids.some(id => !PALETTE.some(c => c.id === id))) throw new Error('Chọn ít nhất một màu có sprite trong game.');
  const input = lab(rgb); let best = null, distance = Infinity;
  for (const c of paletteLab) if (ids.includes(c.id)) {
    const d = c.lab.reduce((n, v, i) => n + (v - input[i]) ** 2, 0);
    if (d < distance) { best = c.id; distance = d; }
  }
  return best;
}
export function sampleImage({ width, height, data }, { columns = 30, rows = 38, alphaThreshold = 128,
  colors = PALETTE.map(c => c.id) } = {}) {
  integer(width, 1, 4096, 'Chiều rộng ảnh'); integer(height, 1, 4096, 'Chiều cao ảnh');
  if (width * height > 16777216 || data.length !== width * height * 4) throw new Error('Dữ liệu ảnh không hợp lệ.');
  integer(alphaThreshold, 1, 255, 'Ngưỡng alpha'); nearestColor([0, 0, 0], colors);
  const cells = grid(columns, rows), box = bounds(cells);
  // Contain the image without stretching. Outside-image samples are transparent.
  const scale = Math.min(box.width / width, box.height / height);
  const ox = box.left + (box.width - width * scale) / 2, oy = box.top + (box.height - height * scale) / 2;
  const offsets = [[0, 0], [.38, 0], [-.38, 0], [.19, .33], [-.19, .33], [.19, -.33], [-.19, -.33]];
  const result = [];
  for (const c of cells) {
    const p = position(c); let alpha = 0, red = 0, green = 0, blue = 0;
    for (const [dx, dy] of offsets) {
      const x = Math.floor((p.x + dx - ox) / scale), y = Math.floor((p.y + dy - oy) / scale);
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = (y * width + x) * 4, a = data[i + 3];
      alpha += a; red += data[i] * a; green += data[i + 1] * a; blue += data[i + 2] * a;
    }
    if (alpha / offsets.length < alphaThreshold) continue;
    result.push({ ...c, targetColorId: nearestColor([red / alpha, green / alpha, blue / alpha], colors) });
  }
  if (!result.length) throw new Error('Không tìm được slot. Giảm ngưỡng alpha hoặc chọn ảnh khác.');
  return result;
}

export function seededRandom(seed) {
  integer(seed, 0, 2147483647, 'Seed'); let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
}
export function makeLevel(targets, { levelId = 'picture-01', seed = 1, mode = 'relaxed', timerSeconds = 0, totalSlots = 5 } = {}) {
  if (!Array.isArray(targets) || targets.length < 1 || targets.length > MAX_CELLS) throw new Error('Map cần 1–4096 ô.');
  const cells = targets.map(c => ({ q: c.q, r: c.r, targetColorId: c.targetColorId }))
    .sort((a, b) => a.q - b.q || a.r - b.r);
  const colors = cells.map(c => c.targetColorId), random = seededRandom(seed);
  for (let i = colors.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [colors[i], colors[j]] = [colors[j], colors[i]]; }
  if (colors.every((c, i) => c === cells[i].targetColorId)) {
    const j = colors.findIndex(c => c !== colors[0]);
    if (j >= 0) [colors[0], colors[j]] = [colors[j], colors[0]];
  }
  const level = { schemaVersion: 2, contentKind: 'hex-picture-level', rulesetId: RULESET, levelId,
    grid: 'flat-top-axial', seed, paletteId: PALETTE_ID, mode, timerSeconds,
    spare: { totalSlots, initialUnlockedSlots: 3 }, revive: { maximumPerAttempt: 1, addedSeconds: 60 },
    rewardPolicyId: 'first-clear-v1', cells: cells.map((c, i) => ({ ...c, initialBeanColorId: colors[i] })) };
  validateLevel(level); return level;
}
export function validateLevel(level) {
  shape(level, ['schemaVersion', 'contentKind', 'rulesetId', 'levelId', 'grid', 'seed', 'paletteId', 'mode',
    'timerSeconds', 'spare', 'revive', 'rewardPolicyId', 'cells'], 'Map');
  equal(level.schemaVersion, 2, 'Phiên bản'); equal(level.contentKind, 'hex-picture-level', 'Loại map');
  equal(level.rulesetId, RULESET, 'Luật'); equal(level.grid, 'flat-top-axial', 'Lưới');
  equal(level.paletteId, PALETTE_ID, 'Bảng màu'); equal(level.rewardPolicyId, 'first-clear-v1', 'Thưởng');
  if (typeof level.levelId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(level.levelId) || /\s/.test(level.levelId)) throw new Error('Tên map dùng 1–64 chữ thường, số hoặc dấu gạch ngang.');
  integer(level.seed, 0, 2147483647, 'Seed'); integer(level.timerSeconds, 0, 600, 'Thời gian');
  if (!['relaxed', 'timed'].includes(level.mode) || (level.mode === 'timed' ? level.timerSeconds === 0 : level.timerSeconds !== 0)) throw new Error('Thời gian phải bằng 0 cho thư giãn, 1–600 cho tính giờ.');
  shape(level.spare, ['totalSlots', 'initialUnlockedSlots'], 'Khay'); integer(level.spare.totalSlots, 5, 7, 'Số khay'); equal(level.spare.initialUnlockedSlots, 3, 'Khay mở');
  shape(level.revive, ['maximumPerAttempt', 'addedSeconds'], 'Hồi sinh'); equal(level.revive.maximumPerAttempt, 1, 'Lần hồi sinh'); equal(level.revive.addedSeconds, 60, 'Giây hồi sinh');
  if (!Array.isArray(level.cells)) throw new Error('Thiếu danh sách ô.'); integer(level.cells.length, 1, MAX_CELLS, 'Số ô');
  const seen = new Set(), supply = Array(7).fill(0), demand = Array(7).fill(0);
  for (const c of level.cells) {
    shape(c, ['q', 'r', 'targetColorId', 'initialBeanColorId'], 'Ô'); integer(c.q, -128, 128, 'q'); integer(c.r, -128, 128, 'r');
    integer(c.targetColorId, 1, 6, 'Màu đích'); integer(c.initialBeanColorId, 1, 6, 'Màu ban đầu');
    if (seen.has(key(c))) throw new Error('Tọa độ ô bị trùng.'); seen.add(key(c)); demand[c.targetColorId]++; supply[c.initialBeanColorId]++;
  }
  if (supply.some((n, i) => n !== demand[i])) throw new Error('Số đá và số slot đích không cân bằng theo màu.');
  return { cells: level.cells.length, colors: demand.filter(n => n > 0).length,
    initiallyMatched: level.cells.filter(c => c.targetColorId === c.initialBeanColorId).length, demand: demand.slice(1) };
}

// Offline authoring model. It does not run Unity or implement the game's future session/spare commands.
function model(level) {
  validateLevel(level);
  const index = new Map(level.cells.map((c, i) => [key(c), i]));
  return { target: level.cells.map(c => c.targetColorId), board: level.cells.map(c => c.initialBeanColorId),
    spare: Array.from({ length: 3 }, () => ({ color: 0, count: 0 })),
    adj: level.cells.map(c => DIRECTIONS.map(([q, r]) => index.get(`${c.q + q},${c.r + r}`)).filter(i => i !== undefined)) };
}
function flood(m, seed, predicate) {
  if (!Number.isInteger(seed) || seed < 0 || seed >= m.board.length || !predicate(seed)) return [];
  const queue = [seed], seen = new Set(queue);
  for (let n = 0; n < queue.length; n++) for (const i of m.adj[queue[n]]) if (!seen.has(i) && predicate(i)) { seen.add(i); queue.push(i); }
  return queue;
}
function apply(m, a) {
  const boardSource = a.kind === 'store' || a.kind === 'board-place';
  const color = boardSource ? m.board[a.source] : m.spare[a.slot]?.color;
  if (!color) throw new Error('Lời giải chọn nguồn trống.');
  const source = boardSource ? flood(m, a.source, i => m.board[i] === color && m.target[i] !== color) : null;
  const count = boardSource ? source.length : m.spare[a.slot].count;
  if (!count) throw new Error('Lời giải chọn đá đã khớp.');
  if (a.kind === 'store') {
    if (!m.spare[a.slot] || m.spare[a.slot].count) throw new Error('Khay không còn trống.');
    for (const i of source) m.board[i] = 0;
    m.spare[a.slot] = { color, count }; return count;
  }
  if (!['board-place', 'spare-place'].includes(a.kind)) throw new Error('Loại bước giải không hợp lệ.');
  const destination = flood(m, a.destination, i => m.board[i] === 0 && m.target[i] === color);
  const moved = Math.min(count, destination.length); if (!moved) throw new Error('Không có slot đích phù hợp.');
  if (boardSource) for (const i of source.slice(0, moved)) m.board[i] = 0;
  else m.spare[a.slot] = count > moved ? { color, count: count - moved } : { color: 0, count: 0 };
  for (const i of destination.slice(0, moved)) m.board[i] = color;
  return moved;
}
const won = m => m.board.every((c, i) => c === m.target[i]) && m.spare.every(s => s.count === 0);
export function solveLevel(level) {
  const m = model(level), actions = [];
  while (!won(m)) {
    if (actions.length >= 2 * m.board.length + 1) throw new Error('Vượt giới hạn kiểm tra lời giải.');
    let a = null;
    for (let destination = 0; destination < m.board.length && !a; destination++) if (m.board[destination] === 0) {
      const color = m.target[destination], slot = m.spare.findIndex(s => s.count > 0 && s.color === color);
      if (slot >= 0) a = { kind: 'spare-place', source: -1, destination, slot };
      else { const source = m.board.findIndex((c, i) => c === color && m.target[i] !== color);
        if (source >= 0) a = { kind: 'board-place', source, destination, slot: -1 }; }
    }
    if (!a) {
      const source = m.board.findIndex((c, i) => c !== 0 && c !== m.target[i]), slot = m.spare.findIndex(s => s.count === 0);
      if (source < 0 || slot < 0) throw new Error('Không tìm được bước đi; chưa cho phép xuất map.');
      a = { kind: 'store', source, destination: -1, slot };
    }
    actions.push({ ...a, moved: apply(m, a) });
  }
  return { rulesetId: RULESET, levelId: level.levelId, scope: 'offline-model-not-Unity-or-device', actions };
}
export function replaySolution(level, witness) {
  if (witness.rulesetId !== RULESET || witness.levelId !== level.levelId || !Array.isArray(witness.actions) || witness.actions.length > 2 * level.cells.length + 1) throw new Error('Lời giải không thuộc map này.');
  const m = model(level);
  for (const a of witness.actions) if (apply(m, a) !== a.moved) throw new Error('Số đá trong bước giải không khớp.');
  if (!won(m)) throw new Error('Lời giải chưa hoàn thành map.');
  return true;
}
