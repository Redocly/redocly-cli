import { readFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

// The four copy-pasteable example configs under packages/recheck/examples/
// are GENERATED from the four style-guide presets, not hand-written —
// renderExample()/examplePath() are exported from scripts/generate-examples.mjs
// so this test and that generator share one implementation (see that file's
// own header for the four-part shape: attribution header, "What to paste",
// "How to tune it", "Full expansion (reference)", then the hand-maintained
// appendix appended verbatim).
//
// This file imports the BUILT lib/ (via generate-examples.mjs, which
// itself imports lib/config/validate.js and lib/config/presets/index.js),
// since a plain .mjs generator script can't import .ts sources directly.
// Run `npm run compile` before `npm test` if this suite reports the
// examples as unexpectedly stale or throws "requires a built package".
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
      // Task 12 controller resolutions §5: the appendix is appended
      // verbatim, so editing ONLY the hand-maintained appendix file also
      // makes the generated example stale — name that explicitly here so
      // the first person to edit an appendix reads this as expected
      // behavior, not a generator bug.
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
