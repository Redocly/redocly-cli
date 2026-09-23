import type { NodeEntry } from '../node-map/types.js';
import type { SpecVersion } from '../oas-types.js';
import { displaySide } from './changes.js';
import { highestImpact, impactRank } from './impact.js';
import { nodeOf, typeOf } from './pairs.js';
import type {
  Change,
  DiffReport,
  DiffRule,
  DiffSpec,
  DiffVisitor,
  Direction,
  Impact,
  InitializedDiffRule,
  JudgedChange,
  Pair,
  RuleHandler,
  RuleVerdict,
} from './types.js';

export function initDiffRules(
  ruleSets: Record<string, DiffRule>[],
  impactOf: (ruleId: string) => Impact | 'off'
): InitializedDiffRule[] {
  return ruleSets.flatMap((rules) =>
    Object.entries(rules).flatMap(([id, rule]) => {
      const impact = impactOf(id);
      return impact === 'off' ? [] : [{ id, impact, handlers: handlersOf(rule(), [], id) }];
    })
  );
}

export function handlersOf(visitor: DiffVisitor, path: string[], ruleId: string): RuleHandler[] {
  return Object.entries(visitor).flatMap(([key, value]) => {
    if (key === 'leave' || key === 'skip' || (key === 'enter' && path.length === 0)) {
      throw new Error(`Diff rule '${ruleId}' uses '${key}', which diff visitors do not have.`);
    }
    if (typeof value !== 'function') return handlersOf(value, [...path, key], ruleId);
    if (key === 'any') return [{ path: [], visit: value }];
    return [{ path: key === 'enter' ? path : [...path, key], visit: value }];
  });
}

/**
 * Lint's nesting: `[A, B]` matches a node of type `B` when the first ancestor that is either
 * an `A` or a `B` is an `A`. The empty path matches every change.
 */
export function matches(path: string[], pair: Pair): boolean {
  if (path.length === 0) return true;
  const type = path[path.length - 1];
  if (typeOf(pair) !== type) return false;
  if (path.length === 1) return true;

  const container = nearest(pair.parent, [path[path.length - 2], type]);
  return container !== undefined && matches(path.slice(0, -1), container);
}

function nearest(pair: Pair | null, types: string[]): Pair | undefined {
  for (let current = pair; current; current = current.parent) {
    if (types.includes(typeOf(current))) return current;
  }
  return undefined;
}

// What a change means when no rule spoke: something new is a minor, everything else a patch.
function unjudgedImpact(kind: Change['kind']): Impact {
  return kind === 'added' ? 'minor' : 'patch';
}

function expandDirection(direction: Direction): Direction[] {
  return direction === 'both' ? ['request', 'response'] : [direction];
}

export function judgeChanges(opts: {
  changes: Change[];
  specVersion: SpecVersion;
  spec?: DiffSpec;
  ruleSets: Record<string, DiffRule>[];
  impactOf: (ruleId: string) => Impact | 'off';
  fromUsage: (node: NodeEntry) => Direction;
}): JudgedChange[] {
  const { changes, specVersion, spec, ruleSets, impactOf, fromUsage } = opts;
  // Structural comparison works for every specification; only the families with a spec are
  // judged, so elsewhere no rule runs and nothing is called breaking.
  const rules = spec ? initDiffRules(ruleSets, impactOf) : [];

  return changes.map((change) => {
    const verdicts: RuleVerdict[] = [];
    const direction = spec?.directionOf(nodeOf(change.pair), fromUsage) ?? 'neutral';

    for (const expandedDirection of expandDirection(direction)) {
      for (const { id, impact, handlers } of rules) {
        const report = ({ message, location = displaySide(change).location }: DiffReport) => {
          // a node used both ways is visited twice; the same finding is kept once
          if (!verdicts.some((verdict) => verdict.ruleId === id && verdict.message === message)) {
            verdicts.push({ ruleId: id, impact, message, location });
          }
        };
        const context = { report, direction: expandedDirection, specVersion };
        for (const { path, visit } of handlers) {
          if (matches(path, change.pair)) visit(change, context);
        }
      }
    }

    verdicts.sort(
      (left, right) =>
        impactRank(right.impact) - impactRank(left.impact) ||
        left.ruleId.localeCompare(right.ruleId)
    );

    return {
      ...change,
      impact:
        highestImpact(verdicts.map((verdict) => verdict.impact)) ?? unjudgedImpact(change.kind),
      direction,
      verdicts,
    };
  });
}
