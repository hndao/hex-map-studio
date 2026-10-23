import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PALETTE, grid, position, sampleImage, nearestColor, makeLevel, validateLevel, solveLevel, replaySolution } from '../src/core.js';

const targets = (columns = 12, rows = 13) => grid(columns, rows).map((c, i) => ({ ...c, targetColorId: 1 + (i % 6) }));
const clone = x => JSON.parse(JSON.stringify(x));
test('tool colors match the versioned game palette contract', () => {
  const contract = JSON.parse(readFileSync(new URL('../contracts/palette-six-v1.json', import.meta.url), 'utf8'));
  assert.equal(contract.paletteId, 'hex-palette-six-v1');
  assert.deepEqual(PALETTE.map(c => [c.id, c.hex]), contract.colors.map(c => [c.colorId, c.baseColorHex]));
});
test('shared palette colors survive color quantization exactly', () => {
  for (const c of PALETTE) assert.equal(nearestColor(c.hex.slice(1).match(/../g).map(s => parseInt(s, 16))), c.id);
  assert.throws(() => nearestColor([0, 0, 0], []));
  assert.throws(() => nearestColor([0, 0, 0], [99]));
});
test('flat-top neighbors have equal edge-to-edge center distance; not square-pixel adjacency', () => {
  const origin = position({ q: 0, r: 0 });
  for (const [q, r] of [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]) {
    const p = position({ q, r }); assert.ok(Math.abs(Math.hypot(p.x - origin.x, p.y - origin.y) - Math.sqrt(3)) < 1e-10);
  }
  assert.equal(new Set(grid(64, 64).map(c => `${c.q},${c.r}`)).size, 4096);
});
test('sampling excludes transparent background and never assigns unsupported colors', () => {
  const width = 100, height = 100, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 20; y < 80; y++) for (let x = 20; x < 80; x++) {
    const i = (y * width + x) * 4; data.set([8, 182, 188, 255], i);
  }
  const cells = sampleImage({ width, height, data }, { columns: 20, rows: 20 });
  assert.ok(cells.length > 20 && cells.length < 400); assert.ok(cells.every(c => c.targetColorId === 1));
  assert.throws(() => sampleImage({ width, height, data: new Uint8ClampedArray(data.length) }), /Không tìm/);
  assert.throws(() => sampleImage({ width, height, data: data.subarray(1) }));
});
test('same seed and targets reproduce canonical JSON independently of input ordering', () => {
  const cells = targets(), a = makeLevel(cells, { seed: 42 }), b = makeLevel([...cells].reverse(), { seed: 42 });
  assert.deepEqual(a, b); assert.notDeepEqual(a, makeLevel(cells, { seed: 43 }));
  assert.equal(validateLevel(a).cells, cells.length);
  for (const forbidden of ['image', 'sourceImage', 'rewardArtId', 'revealGroups', 'base64']) assert.ok(!JSON.stringify(a).includes(`"${forbidden}"`));
});
test('strict contract rejects bad identity, picture references, bounds and color conservation', () => {
  const base = makeLevel(targets());
  const mutations = [l => l.levelId = 'bad\n', l => l.seed = 1.5, l => l.seed = 2147483648,
    l => l.rewardArtId = 'picture.png', l => l.cells[0].q = 129, l => l.cells.push({ ...l.cells[0] }),
    l => l.cells[0].initialBeanColorId = 0, l => l.paletteId = 'other', l => l.spare.initialUnlockedSlots = 2,
    l => l.timerSeconds = 100, l => l.mode = 'timed', l => l.revive.addedSeconds = 61,
    l => l.cells[0].targetColorId = l.cells[0].targetColorId === 1 ? 2 : 1,
    l => l.cells[0].image = 'asset.png'];
  for (const mutate of mutations) { const l = clone(base); mutate(l); assert.throws(() => validateLevel(l)); }
  assert.throws(() => makeLevel([...targets(64, 64), { q: 100, r: 100, targetColorId: 1 }]));
  assert.ok(makeLevel(targets(), { mode: 'timed', timerSeconds: 600 }).mode === 'timed');
});
test('replayed witnesses solve 100 seeds on irregular and disconnected layouts with three free spare slots', () => {
  for (let seed = 0; seed < 100; seed++) {
    const cells = targets(13, 14).filter(c => (c.q + c.r) % 5 !== 0);
    const level = makeLevel(cells, { seed }), witness = solveLevel(level);
    assert.ok(witness.actions.length <= 2 * cells.length + 1); assert.ok(replaySolution(level, witness));
    assert.ok(witness.actions.every(a => a.slot < 3));
    const bad = clone(witness); bad.actions[0].moved++; assert.throws(() => replaySolution(level, bad));
  }
});
test('4096-cell upper-bound map solves and replays without per-map raster files', () => {
  const level = makeLevel(targets(64, 64), { seed: 2147483647 });
  const witness = solveLevel(level); assert.ok(replaySolution(level, witness));
  assert.equal(level.cells.length, 4096); assert.ok(JSON.stringify(level).length < 1048576);
  const incomplete = clone(witness); incomplete.actions.pop(); assert.throws(() => replaySolution(level, incomplete));
});
