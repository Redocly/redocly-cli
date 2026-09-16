import { getLineColLocation } from '../../format/codeframes.js';
import type { Change, Compat, DiffResult, JudgedChange, LocatedNode } from '../types.js';

export interface JsonLocatedNode {
  file: string;
  pointer: string;
  line: number;
  col: number;
  value: unknown;
}

export interface JsonVerdict {
  ruleId: string;
  message: string;
}

/** The wire shape: optional sides are the JSON reader's contract, the union stays internal. */
export interface JsonChange {
  key: string;
  typeName: string;
  kind: Change['kind'];
  property?: string;
  compat: Compat;
  verdicts: JsonVerdict[];
  base?: JsonLocatedNode;
  revision?: JsonLocatedNode;
}

export interface JsonDiffResult extends Omit<DiffResult, 'changes'> {
  changes: JsonChange[];
}

// Nodes inlined by bundling do not exist in the root source AST;
// getLineColLocation falls back to 1:1 for such pointers.
function toJsonNode({ location, value }: LocatedNode): JsonLocatedNode {
  const { start } = getLineColLocation(location);
  return {
    file: location.source.absoluteRef,
    pointer: location.pointer,
    line: start.line,
    col: start.col,
    value,
  };
}

export function toJsonChange(change: JudgedChange): JsonChange {
  const { key, typeName, kind, compat, verdicts } = change;
  const common = {
    key,
    typeName,
    kind,
    compat,
    verdicts: verdicts.map(({ ruleId, message }) => ({ ruleId, message })),
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
