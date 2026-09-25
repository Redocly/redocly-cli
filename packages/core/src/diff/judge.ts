import type { NodeEntry } from '../node-tree/types.js';
import type { SpecVersion } from '../oas-types.js';
import { displaySide } from './changes.js';
import { latestOf, typeOf } from './diff-tree.js';
import { defaultImpact, highestImpact } from './impact.js';
import type {
  Change,
  DiffNode,
  DiffRule,
  DiffRuleContext,
  DiffVisit,
  DiffVisitor,
  Direction,
  Impact,
  JudgedChange,
  RuleVerdict,
} from './types.js';

/** One handler of an enabled rule, with the node types it is nested under; `any` has none. */
type RuleHandler = {
  ruleId: string;
  impact: Impact;
  typePath: string[];
  visit: DiffVisit;
};

/** The handlers of every rule the configuration turns on, in rule order. */
function activeHandlers(
  ruleSets: Record<string, DiffRule>[],
  impactOf: (ruleId: string) => Impact | 'off'
): RuleHandler[] {
  const handlers: RuleHandler[] = [];

  for (const ruleSet of ruleSets) {
    for (const [ruleId, rule] of Object.entries(ruleSet)) {
      const impact = impactOf(ruleId);
      if (impact === 'off') continue;
      for (const { typePath, visit } of flattenVisitor(rule(), ruleId)) {
        handlers.push({ ruleId, impact, typePath, visit });
      }
    }
  }
  return handlers;
}

// A diff visitor sees whole changes, not a walk, so lint's hooks have nothing to run on.
const HOOKS = new Set(['enter', 'leave', 'skip']);

/**
 * A rule's visitor is nested the way lint visitors are. Flattened, each handler carries the
 * types it is nested under, so a change can be checked against it without walking the visitor.
 */
function flattenVisitor(
  visitor: DiffVisitor,
  ruleId: string,
  outerTypes: string[] = []
): Pick<RuleHandler, 'typePath' | 'visit'>[] {
  return Object.entries(visitor).flatMap(([type, value]) => {
    if (HOOKS.has(type) || (type === 'any' && outerTypes.length > 0)) {
      throw new Error(`Diff rule '${ruleId}' uses '${type}' where diff visitors do not have it.`);
    }
    if (typeof value !== 'function') return flattenVisitor(value, ruleId, [...outerTypes, type]);
    return [{ typePath: type === 'any' ? [] : [...outerTypes, type], visit: value }];
  });
}

/**
 * Lint's nesting: `SchemaProperties › Schema` applies to a schema whose nearest enclosing
 * `SchemaProperties` or `Schema` is a `SchemaProperties` — a property, not a schema further down
 * inside one. The empty path applies to every node.
 */
export function appliesTo(typePath: string[], node: DiffNode): boolean {
  let current: DiffNode | undefined = node;

  for (let index = typePath.length - 1; index >= 0; index--) {
    if (current === undefined || typeOf(current) !== typePath[index]) return false;
    if (index > 0) current = nearest(current.parent, [typePath[index - 1], typePath[index]]);
  }
  return true;
}

function nearest(node: DiffNode | null, types: string[]): DiffNode | undefined {
  for (let current = node; current; current = current.parent) {
    if (types.includes(typeOf(current))) return current;
  }
  return undefined;
}

export function judgeChanges(opts: {
  changes: Change[];
  specVersion: SpecVersion;
  ruleSets: Record<string, DiffRule>[];
  impactOf: (ruleId: string) => Impact | 'off';
  directionOf: (node: NodeEntry) => Direction[];
}): JudgedChange[] {
  const { changes, specVersion, ruleSets, impactOf, directionOf } = opts;
  const handlers = activeHandlers(ruleSets, impactOf);

  return changes.map((change) => {
    const verdicts: RuleVerdict[] = [];
    const directions = directionOf(latestOf(change.node));

    for (const { ruleId, impact, typePath, visit } of handlers) {
      if (!appliesTo(typePath, change.node)) continue;
      const report: DiffRuleContext['report'] = ({
        message,
        location = displaySide(change).location,
      }) => verdicts.push({ ruleId, impact, message, location });
      visit(change, { report, directions, specVersion });
    }

    const impact = highestImpact(verdicts.map((verdict) => verdict.impact));
    return { ...change, impact: impact ?? defaultImpact(change.kind), verdicts };
  });
}
