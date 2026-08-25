import type { SpecVersion } from '@redocly/openapi-core';

import {
  compatRank,
  type Change,
  type ChangeVerdict,
  type DiffRuleRegistry,
  type NodeEntry,
  type Polarity,
  type RawChange,
} from '../types.js';
import { async3Rules } from './async3.js';
import type { NodeLookup } from './chain.js';
import { oas3Rules } from './oas3.js';
import { getAsync3Polarity, getOas3Polarity, type PolarityResolver } from './polarity.js';
import type { UsageIndex } from './usage.js';

/**
 * What a specification family brings to classification: the rules to run, and the way
 * that family states which direction the data in a node travels.
 */
const SPECS: Partial<
  Record<SpecVersion, { rules: DiffRuleRegistry; polarityOf: PolarityResolver }>
> = {
  oas3_0: { rules: oas3Rules, polarityOf: getOas3Polarity },
  oas3_1: { rules: oas3Rules, polarityOf: getOas3Polarity },
  // A version gets its own entry once it needs a rule the others must not run.
  oas3_2: { rules: oas3Rules, polarityOf: getOas3Polarity },
  async3: { rules: async3Rules, polarityOf: getAsync3Polarity },
};

function expandPolarity(polarity: Polarity): Polarity[] {
  return polarity === 'both' ? ['request', 'response'] : [polarity];
}

export function classifyChanges(opts: {
  changes: RawChange[];
  specVersion: SpecVersion;
  base: Map<string, NodeEntry>;
  revision: Map<string, NodeEntry>;
  usage: UsageIndex;
}): Change[] {
  const { changes, specVersion, base, revision, usage } = opts;
  const spec = SPECS[specVersion];
  if (!spec) {
    // Structural comparison works for every specification; only these families are
    // judged, so elsewhere no rule runs and nothing is called breaking.
    return changes.map((change) => ({ ...change, compat: 'non-breaking' as const }));
  }

  // A removed node only exists in the base, an added one only in the revision.
  const nodeAt: NodeLookup = (pointer) => revision.get(pointer) ?? base.get(pointer);

  return changes.map((change) => {
    const rules = spec.rules[change.typeName] ?? [];
    const verdicts: ChangeVerdict[] = [];

    for (const polarity of expandPolarity(spec.polarityOf(change.pointer, usage, nodeAt))) {
      const ctx = {
        polarity,
        specVersion,
        base: (pointer: string) => base.get(pointer),
        revision: (pointer: string) => revision.get(pointer),
        nodeAt,
      };
      for (const rule of rules) {
        const verdict = rule.visit(change, ctx);
        if (!verdict) continue;
        // a 'both'-polarity node can fire the same rule twice with the same message
        if (!verdicts.some((v) => v.ruleId === rule.id && v.message === verdict.message)) {
          verdicts.push({ ruleId: rule.id, ...verdict });
        }
      }
    }

    verdicts.sort(
      (a, b) => compatRank(b.compat) - compatRank(a.compat) || a.ruleId.localeCompare(b.ruleId)
    );

    return {
      ...change,
      compat: verdicts[0]?.compat ?? 'non-breaking',
      ...(verdicts.length ? { verdicts } : {}),
    };
  });
}
