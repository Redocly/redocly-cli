import type { NodeEntry } from '../node-tree/types.js';
import type { SpecVersion } from '../oas-types.js';
import type { Location } from '../ref-utils.js';
import type { NormalizedProblem } from '../walk.js';

export type Impact = 'patch' | 'minor' | 'major';

export type Direction = 'request' | 'response';

export type Pair = { base?: NodeEntry; revision?: NodeEntry };

/** One place in both documents; `base` or `revision` is missing where it was added or removed. */
export type DiffNode = {
  base?: NodeEntry;
  revision?: NodeEntry;
  parent: DiffNode | null;
  /** The places that reach this pair after `parent` did; it is compared under `parent` only. */
  referencedBy: DiffNode[];
};

export type LocatedNode = { location: Location; value: unknown };

export type Change = { key: string; node: DiffNode } & (
  | { kind: 'added'; revision: LocatedNode }
  | { kind: 'removed'; base: LocatedNode }
  | {
      kind: 'modified';
      property: string;
      base: LocatedNode;
      revision: LocatedNode;
    }
);

export type DiffRuleContext = {
  report: (report: { message: string; location?: Location }) => void;
  location: Location;
  getDirections: () => Direction[];
  specVersion: SpecVersion;
};

export type DiffVisit = (change: Change, context: DiffRuleContext) => void;
export type DiffVisitor = { [type: string]: DiffVisit | DiffVisitor };
export type DiffRule = () => DiffVisitor;

export type RuleVerdict = {
  ruleId: string;
  impact: Impact;
  message: string;
  location: Location;
};
export type JudgedChange = Change & { impact: Impact; verdicts: RuleVerdict[] };
export type DiffSummary = Record<Impact, number>;

export type DiffResult = {
  files: { base: string; revision: string };
  specVersions: {
    base: SpecVersion;
    revision: SpecVersion;
  };
  infoVersions: {
    base?: string;
    revision?: string;
  };
  summary: DiffSummary;
  bump?: Impact;
  changes: JudgedChange[];
  problems: NormalizedProblem[];
};
