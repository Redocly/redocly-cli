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

/** Which way the data in a node travels; decides whether "accepts less" or "returns more" is the breaking side. */
export type Direction = 'request' | 'response' | 'both' | 'neutral';

export interface DiffReport {
  message: string;
  /** Defaults to the change's display side; a rule may point at a finer node. */
  location?: Location;
}

export interface DiffRuleContext {
  report: (report: DiffReport) => void;
  direction: Direction; // never 'both': a node used both ways is visited once per direction
  specVersion: SpecVersion;
  base: (key: string) => NodeEntry | undefined;
  revision: (key: string) => NodeEntry | undefined;
  nodeAt: (key: string) => NodeEntry | undefined; // either side, revision first
}

export type DiffVisit = (change: Change, context: DiffRuleContext) => void;
export type DiffVisitor = Record<string, DiffVisit>; // keyed by node type name; `any` runs for every change
export type DiffRule = () => DiffVisitor;

export interface RuleVerdict {
  ruleId: string;
  message: string;
  location: Location;
}

export type JudgedChange = Change & { compat: Compat; verdicts: RuleVerdict[] };

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

const COMPAT_RANK: Record<Compat, number> = { breaking: 1, 'non-breaking': 0 };

export function compatRank(compat: Compat): number {
  return COMPAT_RANK[compat];
}
