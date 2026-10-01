import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { runRules } from '../../core/runner.js';
import { DOCUMENTED_OPT_IN_ASSERTIONS } from '../presets/index.js';
import { resolveRecheckConfig } from '../resolve.js';

// Checks that the opt-in prose assertions snippet in the README is a working `redocly.yaml` example.
// It covers the three assertions that no preset ships: `conditional`, `metric` and `spelling`.
const dir = path.dirname(fileURLToPath(import.meta.url));
const readmePath = path.join(dir, '../../../README.md');
const readmeDir = path.dirname(readmePath);
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

// Resolves the snippet like the runtime does: the `recheck/*` names from `extends`, plus the block.
async function resolveOptInSnippet(snippet: string) {
  const doc = yaml.load(snippet) as { extends?: string[]; recheck?: unknown };
  const extendsList = (doc.extends ?? []).filter((name) => name.startsWith('recheck/'));
  return resolveRecheckConfig({ extends: extendsList, block: doc.recheck, configDir: readmeDir });
}

describe('README "Opt-in prose assertions" snippet', () => {
  it('validates cleanly as a recheck config (assembled from the README snippet, not hand-copied)', async () => {
    const snippet = extractOptInSnippet();
    const result = await resolveOptInSnippet(snippet);

    expect(result.success).toBe(true);
    if (!result.success) return;

    for (const assertionId of DOCUMENTED_OPT_IN_ASSERTIONS) {
      const usesIt = result.config.rules.some((rule) => assertionId in rule.assertions);
      expect(usesIt, `expected a rule exercising the "${assertionId}" assertion`).toBe(true);
    }
  });

  // The message is checked too, not just the YAML. `metric` fills in four values in this order:
  // formula name, score, min, max. An earlier snippet put the formula name where the score belongs.
  it('renders the metric snippet message in the documented positional order (formula, score, min, max)', async () => {
    const snippet = extractOptInSnippet();
    const result = await resolveOptInSnippet(snippet);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const metricRules = result.config.rules.filter((rule) => 'metric' in rule.assertions);
    expect(metricRules).toHaveLength(1);

    // Dense prose that scores below the snippet's `min: 30`, so the rule fires.
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
