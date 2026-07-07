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
import { oas3Rules } from './oas3.js';
import { oas3_1Rules } from './oas3_1.js';
import { getPolarity } from './polarity.js';
import type { UsageIndex } from './usage.js';

const REGISTRIES: Partial<Record<SpecVersion, DiffRuleRegistry>> = {
  oas3_0: oas3Rules,
  oas3_1: oas3_1Rules,
  oas3_2: oas3_1Rules,
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
  const registry = REGISTRIES[specVersion] ?? {};

  return changes.map((change) => {
    const rules = registry[change.typeName] ?? [];
    const verdicts: ChangeVerdict[] = [];

    for (const polarity of expandPolarity(getPolarity(change.pointer, usage))) {
      const ctx = {
        polarity,
        specVersion,
        base: (pointer: string) => base.get(pointer),
        revision: (pointer: string) => revision.get(pointer),
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
