import type { SpecVersion } from '@redocly/openapi-core';

export type Compat = 'breaking' | 'non-breaking';

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface NodeEntry {
  pointer: string; // stable matching key, e.g. '#/paths/~1pets/get/parameters/{query:limit}'
  realPointer: string; // actual JSON Pointer in THIS document, e.g. '#/paths/~1pets/get/parameters/1'
  parentPointer: string | null; // stable pointer of the parent node
  typeName: string; // from this side's type tree
  scalars: Record<string, unknown>; // shallow primitives and arrays of primitives (enum, required, ...)
  refs: Record<string, string>; // $ref-valued properties, recorded as attributes (not followed)
  raw: unknown; // the raw node value — payload for added/removed changes
}

export interface ChangeSide {
  pointer: string; // real JSON Pointer in this document
  value?: unknown;
}

export interface Change {
  pointer: string; // stable node pointer — the change's identity
  property?: string; // set for property-level changes
  kind: ChangeKind;
  typeName: string;
  base?: ChangeSide; // absent for added
  revision?: ChangeSide; // absent for removed
  compat: Compat; // worst verdict's level; 'non-breaking' when no rule fired
  verdicts?: ChangeVerdict[]; // every rule verdict, worst-first
}

// What compare() emits — classification fields are filled later by classify().
export type RawChange = Omit<Change, 'compat' | 'verdicts'>;

export interface DiffSummary {
  breaking: number;
  nonBreaking: number;
}

export interface DiffResult {
  version: '1';
  specVersions: { base: SpecVersion; revision: SpecVersion };
  summary: DiffSummary;
  changes: Change[];
}

export interface Verdict {
  compat: Compat;
  message: string;
}

export interface ChangeVerdict extends Verdict {
  ruleId: string;
}

export type Polarity = 'request' | 'response' | 'both' | 'neutral';

export interface RuleContext {
  polarity: Polarity;
  specVersion: SpecVersion;
  base: (pointer: string) => NodeEntry | undefined;
  revision: (pointer: string) => NodeEntry | undefined;
}

export interface DiffRule {
  id: string;
  description: string;
  visit(change: RawChange, ctx: RuleContext): Verdict | undefined;
}

export type DiffRuleRegistry = Record<string, DiffRule[]>;

const COMPAT_RANK: Record<Compat, number> = { breaking: 1, 'non-breaking': 0 };

export function compatRank(compat: Compat): number {
  return COMPAT_RANK[compat];
}

export function breaking(message: string): Verdict {
  return { compat: 'breaking', message };
}
