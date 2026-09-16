import type { NodeLookup } from '../node-map/chain.js';
import type { NodeEntry } from '../node-map/types.js';
import type { SpecVersion } from '../oas-types.js';
import { getAsync3Direction, getOas3Direction, type DirectionResolver } from './direction.js';
import { async3Rules } from './rules/async3.js';
import { oas3Rules } from './rules/oas3.js';
import {
  displaySide,
  type Change,
  type DiffReport,
  type DiffRule,
  type DiffVisitor,
  type Direction,
  type JudgedChange,
  type RuleVerdict,
} from './types.js';
import type { UsageIndex } from './usage.js';

export interface InitializedDiffRule {
  id: string;
  visitor: DiffVisitor;
}

export function initDiffRules(rules: Record<string, DiffRule>): InitializedDiffRule[] {
  return Object.entries(rules).map(([id, rule]) => ({ id, visitor: rule() }));
}

/**
 * What a specification family brings to detection: the rules to run, and the way that
 * family states which direction the data in a node travels.
 */
const SPECS: Partial<
  Record<SpecVersion, { rules: Record<string, DiffRule>; directionOf: DirectionResolver }>
> = {
  oas3_0: { rules: oas3Rules, directionOf: getOas3Direction },
  oas3_1: { rules: oas3Rules, directionOf: getOas3Direction },
  // A version gets its own entry once it needs a rule the others must not run.
  oas3_2: { rules: oas3Rules, directionOf: getOas3Direction },
  async3: { rules: async3Rules, directionOf: getAsync3Direction },
};

function expandDirection(direction: Direction): Direction[] {
  return direction === 'both' ? ['request', 'response'] : [direction];
}

export function detectBreakingChanges(opts: {
  changes: Change[];
  specVersion: SpecVersion;
  base: Map<string, NodeEntry>;
  revision: Map<string, NodeEntry>;
  usage: UsageIndex;
}): JudgedChange[] {
  const { changes, specVersion, base, revision, usage } = opts;
  const spec = SPECS[specVersion];
  if (!spec) {
    // Structural comparison works for every specification; only these families are
    // judged, so elsewhere no rule runs and nothing is called breaking.
    return changes.map((change) => ({ ...change, compat: 'non-breaking' as const, verdicts: [] }));
  }

  const rules = initDiffRules(spec.rules);
  // A removed node only exists in the base, an added one only in the revision.
  const nodeAt: NodeLookup = (key) => revision.get(key) ?? base.get(key);

  return changes.map((change) => {
    const verdicts: RuleVerdict[] = [];

    for (const direction of expandDirection(spec.directionOf(change.key, usage, nodeAt))) {
      for (const { id, visitor } of rules) {
        const report = ({ message, location = displaySide(change).location }: DiffReport) => {
          // a node used both ways is visited twice; the same finding is kept once
          if (!verdicts.some((verdict) => verdict.ruleId === id && verdict.message === message)) {
            verdicts.push({ ruleId: id, message, location });
          }
        };
        const context = {
          report,
          direction,
          specVersion,
          base: (key: string) => base.get(key),
          revision: (key: string) => revision.get(key),
          nodeAt,
        };
        visitor[change.typeName]?.(change, context);
        visitor.any?.(change, context);
      }
    }

    verdicts.sort((left, right) => left.ruleId.localeCompare(right.ruleId));

    return { ...change, compat: verdicts.length ? 'breaking' : 'non-breaking', verdicts };
  });
}
