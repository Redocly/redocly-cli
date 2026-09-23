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

/** One handler of a rule with the node types it is nested under; `any` has none. */
export type RuleHandler = { typePath: string[]; visit: DiffVisit };
export type ActiveRule = { id: string; impact: Impact; handlers: RuleHandler[] };

/** The rules the configuration turns on, each with the impact it gives. */
export function activeRules(
  ruleSets: Record<string, DiffRule>[],
  impactOf: (ruleId: string) => Impact | 'off'
): ActiveRule[] {
  const rules: ActiveRule[] = [];

  for (const ruleSet of ruleSets) {
    for (const [id, rule] of Object.entries(ruleSet)) {
      const impact = impactOf(id);
      if (impact !== 'off') {
        rules.push({ id, impact, handlers: flattenVisitor(rule(), id) });
      }
    }
  }
  return rules;
}

// A diff visitor sees whole changes, not a walk, so lint's hooks have nothing to run on.
const HOOKS = new Set(['enter', 'leave', 'skip']);

/**
 * A rule's visitor is nested the way lint visitors are. Flattened, each handler carries the
 * types it is nested under, so a change can be checked against it without walking the visitor.
 */
export function flattenVisitor(
  visitor: DiffVisitor,
  ruleId: string,
  outerTypes: string[] = []
): RuleHandler[] {
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
  if (typePath.length === 0) return true;

  const type = typePath[typePath.length - 1];
  if (typeOf(node) !== type) return false;

  const outerTypes = typePath.slice(0, -1);
  if (outerTypes.length === 0) return true;

  const owner = nearest(node.parent, [outerTypes[outerTypes.length - 1], type]);

  return owner !== undefined && appliesTo(outerTypes, owner);
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
  const rules = activeRules(ruleSets, impactOf);

  return changes.map((change) => {
    const verdicts: RuleVerdict[] = [];
    const directions = directionOf(latestOf(change.node));

    for (const { id, impact, handlers } of rules) {
      const report: DiffRuleContext['report'] = ({
        message,
        location = displaySide(change).location,
      }) => verdicts.push({ ruleId: id, impact, message, location });
      for (const { typePath, visit } of handlers) {
        if (appliesTo(typePath, change.node)) visit(change, { report, directions, specVersion });
      }
    }

    const impact = highestImpact(verdicts.map((verdict) => verdict.impact));
    return { ...change, impact: impact ?? defaultImpact(change.kind), verdicts };
  });
}
