import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!process.env.npm_execpath) throw new Error('Run coverage with npm run test:coverage.');
fs.rmSync('coverage', { recursive: true, force: true });
for (const args of [
  [process.env.npm_execpath, 'run', 'test:coverage:site'],
  [process.env.npm_execpath, 'run', 'test:coverage:scripts'],
  ['tests/coverage/report.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
