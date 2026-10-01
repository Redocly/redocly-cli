import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

// The example configs in packages/recheck/examples/ are generated from the presets by
// scripts/generate-examples.mjs. That script imports the built lib/, so run
// `npm run compile` first if this suite reports examples as stale.
import { examplePath, renderExample } from '../../../scripts/generate-examples.mjs';
import { validate } from '../validate.js';

const PRESET_NAMES = [
  'google',
  'microsoft',
  'inclusive-language',
  'plain-language',
  'technical-english',
] as const;

describe('example config drift', () => {
  it('every example file matches its preset', async () => {
    for (const name of PRESET_NAMES) {
      const onDisk = await readFile(examplePath(name), 'utf8');
      const rendered = await renderExample(name);
      // The appendix is appended as is, so editing only an appendix file also makes the example stale.
      expect(
        onDisk,
        `examples/${name}.yaml is stale — run \`node scripts/generate-examples.mjs\`. This also fires if you only edited the hand-maintained appendix (examples/appendices/${name}.appendix.yaml) — that's expected: the appendix is appended verbatim, so regenerate to pick it up.`
      ).toBe(rendered);
    }
  });

  it('every example validates as a standalone config', async () => {
    for (const name of PRESET_NAMES) {
      const onDisk = await readFile(examplePath(name), 'utf8');
      const parsed = yaml.load(onDisk);
      const result = await validate(parsed);
      expect(result.isValid, `examples/${name}.yaml: ${JSON.stringify(result.errors)}`).toBe(true);
    }
  });
});
