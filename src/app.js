import { PALETTE, grid, bounds, position, sampleImage, makeLevel, validateLevel, solveLevel, replaySolution } from './core.js';

const $ = id => document.getElementById(id), canvas = $('board'), ctx = canvas.getContext('2d');
let targets = [], sourceImage = null, sourcePixels = null, view = 'target', history = [], verified = null;
let samplingDirty = false, camera = { x: 0, y: 0, scale: 12 }, dragging = null, busy = false, revision = 0, imageRequest = 0;
const colorHex = id => PALETTE.find(c => c.id === id)?.hex || '#f5f8f5';
function status(text, state = '') { $('status').textContent = text; $('status').parentElement.dataset.state = state; }
function metadata() { return { levelId: $('level-id').value, seed: Number($('seed').value), mode: $('mode').value,
  timerSeconds: $('mode').value === 'timed' ? Number($('timer').value) : 0, totalSlots: Number($('slots').value) }; }
function invalidate(message = 'Map đã đổi. Kiểm tra lại trước khi xuất.') {
  revision++;
  verified = null; $('download').disabled = $('report').disabled = true;
  $('json-preview').textContent = 'Chưa có bản xuất đã kiểm tra.'; status(message); summary(); draw();
}
function summary() {
  const items = [[targets.length.toLocaleString('vi-VN'), 'ô lục giác'], [new Set(targets.map(c => c.targetColorId)).size, 'màu đang dùng'],
    [verified ? verified.witness.actions.length : '—', 'bước trong lời giải'], [verified ? `${(new TextEncoder().encode(verified.json).length / 1024).toFixed(1)} KB` : '—', 'dữ liệu JSON']];
  $('map-summary').replaceChildren(...items.map(([n, label]) => { const span = document.createElement('span'), strong = document.createElement('strong'); strong.textContent = n; span.append(strong, document.createTextNode(label)); return span; }));
  $('undo').disabled = history.length === 0;
}
function fit() {
  if (!targets.length) return;
  const b = bounds(targets); camera = { x: b.left + b.width / 2, y: b.top + b.height / 2,
    scale: Math.min((canvas.clientWidth - 50) / b.width, (canvas.clientHeight - 60) / b.height) }; draw();
}
function hex(x, y, radius) {
  ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath();
}
function candidate() { return makeLevel(targets, metadata()); }
function draw() {
  const ratio = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) { canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#e1e9e4'; ctx.fillRect(0, 0, w, h);
  if (view === 'source') {
    if (sourceImage) { const scale = Math.min((w - 36) / sourceImage.width, (h - 45) / sourceImage.height); ctx.drawImage(sourceImage, (w - sourceImage.width * scale) / 2, (h - sourceImage.height * scale) / 2, sourceImage.width * scale, sourceImage.height * scale); }
    else { ctx.fillStyle = '#617470'; ctx.textAlign = 'center'; ctx.font = '14px sans-serif'; ctx.fillText('Chọn ảnh để xem nguồn tại đây.', w / 2, h / 2); }
    return;
  }
  let cells = targets;
  if (view === 'initial') { try { cells = verified?.level.cells || candidate().cells; } catch { cells = targets; } }
  for (const c of cells) {
    const p = position(c), x = (p.x - camera.x) * camera.scale + w / 2, y = (p.y - camera.y) * camera.scale + h / 2, size = camera.scale * .96;
    if (x < -size || y < -size || x > w + size || y > h + size) continue;
    hex(x, y, size); ctx.fillStyle = view === 'empty' ? '#f5f8f5' : colorHex(view === 'initial' ? c.initialBeanColorId : c.targetColorId); ctx.fill();
    ctx.strokeStyle = view === 'empty' ? colorHex(c.targetColorId) : '#183d3b35'; ctx.lineWidth = view === 'empty' ? Math.max(.7, size * .07) : .7; ctx.stroke();
    if (view !== 'empty' && size > 6) { hex(x, y, size * .78); ctx.strokeStyle = '#ffffff35'; ctx.lineWidth = Math.max(.5, size * .07); ctx.stroke(); }
  }
}
function setTargets(next) { targets = next.map(c => ({ ...c })); history = []; samplingDirty = false; invalidate('Map đã sẵn sàng để kiểm tra.'); fit(); }
function demo() {
  const cells = grid(24, 28).map(c => ({ ...c, targetColorId: 1 + ((Math.floor(c.q / 4) + Math.floor((-c.r - Math.floor(c.q / 2)) / 4)) % 6) }));
  setTargets(cells); $('board-subtitle').textContent = 'Map mẫu hình học · thử xem màu đích, xáo màu và xuất JSON.';
}
for (const color of PALETTE) {
  const label = document.createElement('label'), input = document.createElement('input'), swatch = document.createElement('span');
  input.type = 'checkbox'; input.value = color.id; input.checked = true; input.setAttribute('aria-label', `Dùng màu ${color.name}`);
  swatch.className = 'swatch'; swatch.style.backgroundColor = color.hex;
  label.append(input, swatch, document.createTextNode(color.name)); $('palette').append(label);
  const option = document.createElement('option'); option.value = color.id; option.textContent = color.name; $('paint-color').append(option);
  input.addEventListener('change', markSamplingDirty);
}
function markSamplingDirty() { samplingDirty = true; invalidate('Thiết lập lấy mẫu đã đổi. Bấm “Chuyển ảnh thành ô” để áp dụng.'); }
$('columns').addEventListener('input', markSamplingDirty); $('rows').addEventListener('input', markSamplingDirty);
$('alpha').addEventListener('input', () => { $('alpha-value').textContent = $('alpha').value; markSamplingDirty(); });
for (const id of ['level-id', 'seed', 'mode', 'timer', 'slots']) $(id).addEventListener('input', () => { $('timer-field').hidden = $('mode').value !== 'timed'; invalidate(); });
$('sample').addEventListener('click', () => {
  try {
    if (!sourcePixels) throw new Error('Chọn ảnh nguồn trước khi chuyển thành ô.');
    const colors = [...$('palette').querySelectorAll('input:checked')].map(i => Number(i.value));
    setTargets(sampleImage(sourcePixels, { columns: Number($('columns').value), rows: Number($('rows').value), alphaThreshold: Number($('alpha').value), colors }));
    setView('target'); $('board-subtitle').textContent = 'Đã chuyển ảnh thành lưới hex. Bạn có thể tô sửa màu hoặc xóa slot.';
  } catch (e) { status(e.message, 'error'); }
});
$('image-file').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const request = ++imageRequest; markSamplingDirty();
  try {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Chọn PNG, JPG hoặc WebP không quá 20 MB.');
    const bitmap = await createImageBitmap(file);
    if (request !== imageRequest) { bitmap.close(); return; }
    if (bitmap.width * bitmap.height > 64000000) { bitmap.close(); throw new Error('Ảnh quá lớn. Chọn ảnh dưới 64 triệu pixel.'); }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height)), surface = document.createElement('canvas');
    surface.width = Math.max(1, Math.round(bitmap.width * scale)); surface.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = surface.getContext('2d', { willReadFrequently: true }); context.drawImage(bitmap, 0, 0, surface.width, surface.height); bitmap.close();
    sourceImage = surface; sourcePixels = context.getImageData(0, 0, surface.width, surface.height);
    $('file-name').textContent = `${file.name} · ${sourcePixels.width} × ${sourcePixels.height}`; markSamplingDirty(); setView('source');
  } catch (e) { if (request === imageRequest) status(`Không đọc được ảnh. ${e.message}`, 'error'); }
});
function setView(next) {
  view = next; document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view))); draw();
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
$('demo').addEventListener('click', () => { demo(); setView('target'); }); $('fit').addEventListener('click', fit);
$('undo').addEventListener('click', () => { if (history.length) { targets = history.pop(); invalidate(); } });
function zoom(factor, x = canvas.clientWidth / 2, y = canvas.clientHeight / 2) {
  const old = camera.scale, next = Math.max(1, Math.min(120, old * factor));
  camera.x += (x - canvas.clientWidth / 2) * (1 / old - 1 / next); camera.y += (y - canvas.clientHeight / 2) * (1 / old - 1 / next); camera.scale = next; draw();
}
$('zoom-in').addEventListener('click', () => zoom(1.25)); $('zoom-out').addEventListener('click', () => zoom(.8));
canvas.addEventListener('wheel', e => { e.preventDefault(); const b = canvas.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.1 : .9, e.clientX - b.left, e.clientY - b.top); }, { passive: false });
canvas.addEventListener('pointerdown', e => { if (view === 'source') return; dragging = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!dragging || $('edit-mode').value !== 'pan') return; camera.x -= (e.clientX - dragging.lastX) / camera.scale; camera.y -= (e.clientY - dragging.lastY) / camera.scale; dragging.lastX = e.clientX; dragging.lastY = e.clientY; draw(); });
canvas.addEventListener('pointercancel', () => { dragging = null; });
canvas.addEventListener('pointerup', e => {
  if (!dragging) return; const start = dragging; dragging = null;
  if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6 || $('edit-mode').value === 'pan' || view !== 'target') return;
  const rect = canvas.getBoundingClientRect(), x = (e.clientX - rect.left - canvas.clientWidth / 2) / camera.scale + camera.x,
    y = (e.clientY - rect.top - canvas.clientHeight / 2) / camera.scale + camera.y;
  const i = targets.findIndex(c => { const p = position(c), dx = Math.abs(x - p.x), dy = Math.abs(y - p.y); return dx <= 1 && dy <= Math.sqrt(3) / 2 && Math.sqrt(3) * dx + dy <= Math.sqrt(3); });
  if (i < 0) return;
  history.push(targets.map(c => ({ ...c }))); if (history.length > 30) history.shift();
  if ($('edit-mode').value === 'erase') targets.splice(i, 1); else targets[i].targetColorId = Number($('paint-color').value);
  invalidate();
});
$('validate').addEventListener('click', async () => {
  if (busy) return; busy = true; $('validate').disabled = true; status('Đang kiểm tra dữ liệu và tìm lời giải…');
  const checkedRevision = revision;
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    if (checkedRevision !== revision) throw new Error('Thiết lập đã đổi trong lúc kiểm tra. Kiểm tra lại để xuất đúng map.');
    if (samplingDirty) throw new Error('Bấm “Chuyển ảnh thành ô” để áp dụng thiết lập lấy mẫu mới trước.');
    const level = candidate(), stats = validateLevel(level);
    if (stats.colors < 2) throw new Error('Map chỉ có một màu và đã hoàn thành ngay từ đầu. Chọn ảnh hoặc màu khác.');
    const witness = solveLevel(level); replaySolution(level, witness);
    const json = JSON.stringify(level) + '\n';
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (checkedRevision !== revision) throw new Error('Thiết lập đã đổi trong lúc kiểm tra. Kiểm tra lại để xuất đúng map.');
    verified = { level, witness: { ...witness, levelSha256: hash, generatorVersion: '0.1.0' }, json };
    $('download').disabled = $('report').disabled = false; $('json-preview').textContent = JSON.stringify(level, null, 2);
    status(`Đã cân bằng ${stats.cells} ô, ${stats.colors} màu. Lời giải ${witness.actions.length} bước đã chạy lại thành công trên mô hình. Chưa kiểm thử Unity hoặc thiết bị.`, 'success'); summary(); draw();
  } catch (e) { verified = null; $('download').disabled = $('report').disabled = true; status(e.message, 'error'); summary(); }
  finally { busy = false; $('validate').disabled = false; }
});
function download(text, name) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
$('download').addEventListener('click', () => { if (verified) download(verified.json, `${verified.level.levelId}.json`); });
$('report').addEventListener('click', () => { if (verified) download(JSON.stringify(verified.witness, null, 2) + '\n', `${verified.level.levelId}.solution.json`); });
new ResizeObserver(fit).observe(canvas); demo();
