import type { NodeEntry } from '../node-map/types.js';
import type { SpecVersion } from '../oas-types.js';
import type { Location } from '../ref-utils.js';

export type Impact = 'patch' | 'minor' | 'major';

/** Which way the data in a node travels; decides whether "accepts less" or "returns more" is the breaking side. */
export type Direction = 'request' | 'response' | 'both' | 'neutral';

/** The same logical node on both sides; one side is missing when the node was added or removed. */
export interface Pair {
  base?: NodeEntry;
  revision?: NodeEntry;
  parent: Pair | null;
  children: Pair[];
  /** Position among the siblings that share this pair's segment; the label carries it as `#n`. */
  occurrence: number;
}

/** What the specification says about a node that the structure alone does not. */
export interface NodeIdentity {
  /** Replaces the node's own key when the two documents are matched up. */
  segment: string;
  /** Values the segment hides, compared as if the node carried them. */
  values?: Record<string, unknown>;
}

/** Everything the comparison needs to know about one specification family. */
export interface DiffSpec {
  identityOf(node: NodeEntry, container: string): NodeIdentity | undefined;
  /** The node a reference to this one lands on, when it is not the node itself. */
  referenceTarget?: (node: NodeEntry) => NodeEntry | undefined;
  directionOf(node: NodeEntry, fromUsage: (node: NodeEntry) => Direction): Direction;
}

export interface LocatedNode {
  location: Location;
  value: unknown;
}

interface ChangeBase {
  /** The report key, derived from the pair; the pair itself is what a rule reads. */
  key: string;
  pair: Pair;
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

export interface DiffReport {
  message: string;
  /** Defaults to the change's display side; a rule may point at a finer node. */
  location?: Location;
}

export interface DiffRuleContext {
  report: (report: DiffReport) => void;
  direction: Direction; // never 'both': a node used both ways is visited once per direction
  specVersion: SpecVersion;
}

export type DiffVisit = (change: Change, context: DiffRuleContext) => void;

/**
 * Keyed by node type name, nested the way lint visitors are: `SchemaProperties: { Schema }`
 * runs for a schema that is a member of a properties map. `enter` inside a nested object is
 * the handler of the container itself; `any` runs for every change.
 */
export type DiffVisitor = { [type: string]: DiffVisit | DiffVisitor };
export type DiffRule = () => DiffVisitor;

/** One handler of a rule with the type path it is nested under; `any` has the empty path. */
export interface RuleHandler {
  path: string[];
  visit: DiffVisit;
}

export interface InitializedDiffRule {
  id: string;
  impact: Impact;
  handlers: RuleHandler[];
}

export interface RuleVerdict {
  ruleId: string;
  impact: Impact;
  message: string;
  location: Location;
}

export type JudgedChange = Change & {
  impact: Impact;
  direction: Direction;
  verdicts: RuleVerdict[];
};

export interface DiffSummary {
  major: number;
  minor: number;
  patch: number;
}

export interface DiffResult {
  version: '1';
  specVersions: { base: SpecVersion; revision: SpecVersion };
  summary: DiffSummary;
  bump?: Impact;
  changes: JudgedChange[];
}
