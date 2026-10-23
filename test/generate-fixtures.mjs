import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { grid, makeLevel, solveLevel, replaySolution } from '../src/core.js';

const destination = new URL('../.artifacts/fixtures/', import.meta.url); await mkdir(destination, { recursive: true });
for (const [id, columns, rows, seed] of [['picture-grid-01', 8, 9, 42], ['picture-large-01', 30, 38, 20261023], ['picture-max-01', 64, 64, 2147483647]]) {
  const cells = grid(columns, rows).map((c, i) => ({ ...c, targetColorId: 1 + i % 6 }));
  const level = makeLevel(cells, { levelId: id, seed }), json = JSON.stringify(level) + '\n';
  const witness = solveLevel(level); replaySolution(level, witness);
  witness.levelSha256 = createHash('sha256').update(json).digest('hex');
  await writeFile(new URL(id + '.json', destination), json);
  await writeFile(new URL(id + '.solution.json', destination), JSON.stringify(witness) + '\n');
  console.log(`${id} cells=${cells.length} commands=${witness.actions.length}`);
}
