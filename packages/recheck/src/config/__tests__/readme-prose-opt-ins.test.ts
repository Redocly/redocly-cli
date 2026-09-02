import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { runRules } from '../../core/runner.js';
import { DOCUMENTED_OPT_IN_ASSERTIONS } from '../presets/index.js';
import { validate } from '../validate.js';

// Proves the README's own copy-paste snippets for the three prose
// assertions NOT shipped in any preset (`conditional`, `metric`, `spelling`
// — see presets/index.ts's DOCUMENTED_OPT_IN_ASSERTIONS; `occurrence` moved
// out of this list once `recheck/microsoft` shipped it directly, the same
// way `length` moved out once `recheck/google` shipped it) are valid,
// working config -- not just prose that happens to look like YAML. This
// reads README.md straight off disk (not a hand-duplicated copy in this
// test file), so an edit that breaks the snippet's YAML or semantics fails
// CI immediately, the same way a broken code sample would fail a doctest.
const dir = path.dirname(fileURLToPath(import.meta.url));
const readmePath = path.join(dir, '../../../README.md');
const readme = readFileSync(readmePath, 'utf8');

const OPT_IN_HEADING = '### Opt-in prose assertions';

function extractOptInSnippet(): string {
  const headingIndex = readme.indexOf(OPT_IN_HEADING);
  if (headingIndex === -1) {
    throw new Error(`README.md is missing the "${OPT_IN_HEADING}" section`);
  }
  const rest = readme.slice(headingIndex);
  const fenceMatch = rest.match(/```yaml\n([\s\S]*?)```/);
  if (!fenceMatch) {
    throw new Error(`No \`\`\`yaml fence found under "${OPT_IN_HEADING}"`);
  }
  return fenceMatch[1];
}

describe('README "Opt-in prose assertions" snippet', () => {
  it('section exists and its yaml fence mentions every documented opt-in', () => {
    const snippet = extractOptInSnippet();
    for (const assertionId of DOCUMENTED_OPT_IN_ASSERTIONS) {
      expect(snippet, `snippet should exercise "${assertionId}"`).toContain(`${assertionId}:`);
    }
  });

  it('parses as valid YAML', () => {
    const snippet = extractOptInSnippet();
    expect(() => yaml.load(snippet)).not.toThrow();
    const parsed = yaml.load(snippet);
    expect(parsed).toBeTypeOf('object');
  });

  it('validates cleanly as a recheck config (assembled from the README snippet, not hand-copied)', async () => {
    const snippet = extractOptInSnippet();
    const config = yaml.load(snippet);

    const result = await validate(config);

    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);

    for (const assertionId of DOCUMENTED_OPT_IN_ASSERTIONS) {
      const usesIt = result.rules.some((rule) => assertionId in rule.assertions);
      expect(usesIt, `expected a rule exercising the "${assertionId}" assertion`).toBe(true);
    }
  });

  // Guards the metric snippet's MESSAGE, not just its YAML validity: metric
  // substitutes up to FOUR positional values -- formula name, computed
  // score, min ('-∞' when unset), max ('∞' when unset), in that order (see
  // README "Metric Assertions" and rules/scope/metric.ts). An earlier
  // snippet revision read 'Readability score is %s (expected >= %s).',
  // which rendered the FORMULA NAME where the score belongs ("Readability
  // score is flesch-reading-ease ...") -- valid config, garbage output.
  // Rendering a real problem through runRules is what catches that class of
  // edit; validate() alone cannot.
  it('renders the metric snippet message in the documented positional order (formula, score, min, max)', async () => {
    const snippet = extractOptInSnippet();
    const config = yaml.load(snippet);

    const result = await validate(config);
    expect(result.isValid).toBe(true);
    const metricRules = result.rules.filter((rule) => 'metric' in rule.assertions);
    expect(metricRules).toHaveLength(1);

    // Dense, polysyllabic prose scoring far below the snippet's `min: 30`
    // Flesch reading-ease floor, so the rule genuinely fires.
    const content =
      'Extraordinarily sophisticated organizational considerations necessitate ' +
      'comprehensive interdisciplinary collaboration methodologies throughout ' +
      'multinational institutional infrastructures.\n';
    const { problems } = await runRules([{ path: 'dense.md', content }], metricRules);

    expect(problems).toHaveLength(1);
    expect(problems[0].message).toMatch(
      /^Readability \(flesch-reading-ease\) is -?\d+(\.\d+)?; expected between 30 and ∞\.$/
    );
  });
});
