import type { NodeEntry } from '../node-map/types.js';
import type { SpecVersion } from '../oas-types.js';
import type { Location } from '../ref-utils.js';

export type Compat = 'breaking' | 'non-breaking';

export interface LocatedNode {
  location: Location;
  value: unknown;
}

interface ChangeBase {
  key: string;
  typeName: string;
}

export type Change =
  | (ChangeBase & { kind: 'added'; revision: LocatedNode })
  | (ChangeBase & { kind: 'removed'; base: LocatedNode })
  | (ChangeBase & {
      kind: 'modified';
      property: string;
      base: LocatedNode;
      revision: LocatedNode;
    });

export function displaySide(change: Change): LocatedNode {
  return change.kind === 'removed' ? change.base : change.revision;
}

export interface ChangeVerdict {
  ruleId: string;
  compat: Compat;
  message: string;
}

export type JudgedChange = Change & { compat: Compat; verdicts: ChangeVerdict[] };

export interface DiffSummary {
  breaking: number;
  nonBreaking: number;
}

export interface DiffResult {
  version: '1';
  specVersions: { base: SpecVersion; revision: SpecVersion };
  summary: DiffSummary;
  changes: JudgedChange[];
}

export interface Verdict {
  compat: Compat;
  message: string;
}

export type Polarity = 'request' | 'response' | 'both' | 'neutral';

export interface RuleContext {
  polarity: Polarity;
  specVersion: SpecVersion;
  base: (key: string) => NodeEntry | undefined;
  revision: (key: string) => NodeEntry | undefined;
  /** Either side, revision first — for reading a node's own type or its ancestors. */
  nodeAt: (key: string) => NodeEntry | undefined;
}

export interface DiffRule {
  id: string;
  description: string;
  visit(change: Change, ctx: RuleContext): Verdict | undefined;
}

export type DiffRuleRegistry = Record<string, DiffRule[]>;

const COMPAT_RANK: Record<Compat, number> = { breaking: 1, 'non-breaking': 0 };

export function compatRank(compat: Compat): number {
  return COMPAT_RANK[compat];
}

export function breaking(message: string): Verdict {
  return { compat: 'breaking', message };
}
