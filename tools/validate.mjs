// Runs the same load-time validation the browser runs (PRD §11), on the CLI.
import { validateLevel } from '../src/systems/LevelValidator.js';
import { LEVEL_ORDER } from '../src/config/gameConfig.js';

let failed = 0;
for (const key of LEVEL_ORDER) {
  const mod = await import(`../src/levels/${key}.js`);
  const level = mod.default;
  const { errors, warnings } = validateLevel(level, key);
  const w = level.tiles[0].length;
  console.log(
    `\n${key.toUpperCase().padEnd(6)} ${String(w).padStart(3)} tiles  ` +
    `par ${level.parTime}s  gems ${level.totalGemValue}  ` +
    `enemies ${level.enemies.length}  checkpoints ${level.checkpoints.length}`
  );
  for (const e of errors) { failed++; console.log(`  ERROR   ${e}`); }
  for (const x of warnings) console.log(`  warning ${x}`);
  if (!errors.length && !warnings.length) console.log('  clean');
}
console.log(failed ? `\n${failed} error(s).` : '\nAll levels validate clean.');
process.exit(failed ? 1 : 0);
