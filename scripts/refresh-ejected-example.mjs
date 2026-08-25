// Re-stamp the checked-in ejected-generator example with the current
// @redocly/client-generator version. The example is a frozen user copy, and its
// `requiresGenerator: '^<version>'` caret range treats a 0.x minor bump as breaking
// (deliberately), so a release that bumps the package would otherwise fail the
// examples job with "Generator 'php' needs @redocly/client-generator ^<old>".
// Runs from the release workflow's `version` block, after `changeset version`.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { version } = JSON.parse(readFileSync('packages/client-generator/package.json', 'utf-8'));
const generatorsDir = 'tests/e2e/generate-client/examples/ejected-generator/generators';

const HEADER = /Ejected from @redocly\/client-generator@\d+\.\d+\.\d+(?:-[\w.]+)?/g;
const REQUIRES = /requiresGenerator: '\^\d+\.\d+\.\d+(?:-[\w.]+)?'/g;

let touched = 0;
for (const entry of readdirSync(generatorsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(generatorsDir, entry.name);
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.ts')) continue;
    const path = join(dir, name);
    const source = readFileSync(path, 'utf-8');
    const updated = source
      .replaceAll(HEADER, `Ejected from @redocly/client-generator@${version}`)
      .replaceAll(REQUIRES, `requiresGenerator: '^${version}'`);
    if (updated !== source) {
      writeFileSync(path, updated, 'utf-8');
      touched++;
    }
  }
}
console.log(
  touched === 0
    ? `refresh-ejected-example: already at ${version}, nothing to do`
    : `refresh-ejected-example: stamped ${touched} file(s) with ${version}`
);
