import type { InitializedDiffRule } from '../config/rules.js';
import type { SpecVersion } from '../oas-types.js';
import { displaySide } from './changes.js';
import { typeOf } from './diff-node.js';
import { directionsOf } from './direction.js';
import { defaultImpact, highestImpact } from './impact.js';
import type {
  Change,
  DiffNode,
  DiffRuleContext,
  DiffVisit,
  DiffVisitor,
  Direction,
  Impact,
  JudgedChange,
  RuleVerdict,
} from './types.js';

type RuleHandler = {
  ruleId: string;
  impact: Impact;
  typePath: string[];
  visit: DiffVisit;
};

// A diff visitor sees whole changes, not a walk, so lint's hooks have nothing to run on.
const HOOKS = new Set(['enter', 'leave', 'skip']);

// Each handler with the types it is nested under, so matching a change needs no walk.
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
 * inside one.
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

export function judgeChanges(
  changes: Change[],
  rules: InitializedDiffRule[],
  specVersion: SpecVersion
): JudgedChange[] {
  const handlers: RuleHandler[] = rules.flatMap(({ ruleId, impact, visitor }) =>
    flattenVisitor(visitor, ruleId).map((handler) => ({ ruleId, impact, ...handler }))
  );

  return changes.map((change) => judgeChange(change, handlers, specVersion));
}

function judgeChange(
  change: Change,
  handlers: RuleHandler[],
  specVersion: SpecVersion
): JudgedChange {
  // Computed once per change, and only when a rule asks.
  let directions: Direction[] | undefined;
  const getDirections = () => (directions ??= directionsOf(change.node));
  const location = displaySide(change).location;
  const verdicts: RuleVerdict[] = [];

  for (const { ruleId, impact, typePath, visit } of handlers) {
    if (!appliesTo(typePath, change.node)) continue;

    const report: DiffRuleContext['report'] = (verdict) => {
      verdicts.push({
        ruleId,
        impact,
        message: verdict.message,
        location: verdict.location ?? location,
      });
    };

    visit(change, { report, location, getDirections, specVersion });
  }

  const impact = highestImpact(verdicts.map((verdict) => verdict.impact));
  return { ...change, verdicts, impact: impact ?? defaultImpact(change) };
}
