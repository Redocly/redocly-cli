import { getLineColLocation } from '../../format/codeframes.js';
import type { Location } from '../../ref-utils.js';
import type { Change, DiffResult, Direction, Impact, JudgedChange, LocatedNode } from '../types.js';

export interface JsonLocatedNode {
  file: string;
  pointer: string;
  line: number;
  col: number;
  value: unknown;
}

export interface JsonVerdict {
  ruleId: string;
  impact: Impact;
  message: string;
  location: Omit<JsonLocatedNode, 'value'>;
}

/** The wire shape: optional sides are the JSON reader's contract, the union stays internal. */
export interface JsonChange {
  key: string;
  typeName: string;
  kind: Change['kind'];
  property?: string;
  impact: Impact;
  direction: Direction;
  verdicts: JsonVerdict[];
  base?: JsonLocatedNode;
  revision?: JsonLocatedNode;
}

export interface JsonDiffResult extends Omit<DiffResult, 'changes'> {
  changes: JsonChange[];
}

// Nodes inlined by bundling do not exist in the root source AST;
// getLineColLocation falls back to 1:1 for such pointers.
function toJsonLocation(location: Location): Omit<JsonLocatedNode, 'value'> {
  const { start } = getLineColLocation(location);
  return {
    file: location.source.absoluteRef,
    pointer: location.pointer,
    line: start.line,
    col: start.col,
  };
}

function toJsonNode({ location, value }: LocatedNode): JsonLocatedNode {
  return { ...toJsonLocation(location), value };
}

export function toJsonChange(change: JudgedChange): JsonChange {
  const { key, typeName, kind, impact, direction, verdicts } = change;
  const common = {
    key,
    typeName,
    kind,
    impact,
    direction,
    verdicts: verdicts.map((verdict) => ({
      ruleId: verdict.ruleId,
      impact: verdict.impact,
      message: verdict.message,
      location: toJsonLocation(verdict.location),
    })),
  };
  switch (change.kind) {
    case 'added':
      return { ...common, revision: toJsonNode(change.revision) };
    case 'removed':
      return { ...common, base: toJsonNode(change.base) };
    case 'modified':
      return {
        ...common,
        property: change.property,
        base: toJsonNode(change.base),
        revision: toJsonNode(change.revision),
      };
  }
}

export function jsonDiff(result: DiffResult): string {
  const report: JsonDiffResult = { ...result, changes: result.changes.map(toJsonChange) };
  return JSON.stringify(report, null, 2);
}
