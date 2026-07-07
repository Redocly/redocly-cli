import type { SpecVersion } from '@redocly/openapi-core';

import {
  compatRank,
  type Change,
  type DiffRuleRegistry,
  type NodeEntry,
  type Polarity,
  type RawChange,
  type Verdict,
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
    const ruleIds: string[] = [];
    let winner: Verdict | undefined;

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
        if (!ruleIds.includes(rule.id)) ruleIds.push(rule.id);
        if (!winner || compatRank(verdict.compat) > compatRank(winner.compat)) {
          winner = verdict; // worst verdict wins; registration order carries no semantics
        }
      }
    }

    return {
      ...change,
      compat: winner?.compat ?? 'non-breaking',
      ...(ruleIds.length ? { ruleIds: ruleIds.sort() } : {}),
      ...(winner ? { message: winner.message } : {}),
    };
  });
}
