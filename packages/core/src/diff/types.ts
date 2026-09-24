import type { NodeEntry } from '../node-tree/types.js';
import type { SpecVersion } from '../oas-types.js';
import type { Location } from '../ref-utils.js';

export type Impact = 'patch' | 'minor' | 'major';

/** Decides which side breaks: a request accepting less, or a response returning more. */
export type Direction = 'request' | 'response';

/** One place in both documents; `base` or `revision` is missing where it was added or removed. */
export type DiffNode = {
  base?: NodeEntry;
  revision?: NodeEntry;
  parent: DiffNode | null;
  children: DiffNode[];
  /** Segments from the root joined like a pointer; `#n` marks the n-th sibling with one segment. */
  label: string;
};

/**
 * Per container type: the segment that identifies a child, where its key or position does not.
 * It replaces the child's key when the two documents are matched up.
 */
export type Identities = Partial<Record<string, (node: NodeEntry) => string | undefined>>;

/** Per node type: which way the data below it travels; the nearest type that says it wins. */
export type Directions = Partial<
  Record<string, Direction | ((node: NodeEntry) => Direction | undefined)>
>;

export type LocatedNode = { location: Location; value: unknown };

/** `key` is the label of the node the change is on. */
export type Change = { key: string; node: DiffNode } & (
  | { kind: 'added'; revision: LocatedNode }
  | { kind: 'removed'; base: LocatedNode }
  | { kind: 'modified'; property: string; base: LocatedNode; revision: LocatedNode }
);

export type DiffRuleContext = {
  /** `location` defaults to the changed side; a rule may point at a finer node. */
  report: (report: { message: string; location?: Location }) => void;
  /** Empty where the data travels neither way. */
  directions: Direction[];
  specVersion: SpecVersion;
};

export type DiffVisit = (change: Change, context: DiffRuleContext) => void;

/**
 * Keyed by node type and nested the way lint visitors are: `SchemaProperties: { Schema }` runs
 * for a schema that is a member of a properties map. `any`, at the top only, runs for every change.
 */
export type DiffVisitor = { [type: string]: DiffVisit | DiffVisitor };
export type DiffRule = () => DiffVisitor;

export type RuleVerdict = { ruleId: string; impact: Impact; message: string; location: Location };
export type JudgedChange = Change & { impact: Impact; verdicts: RuleVerdict[] };
export type DiffSummary = Record<Impact, number>;

export type DiffResult = {
  version: '1';
  specVersions: { base: SpecVersion; revision: SpecVersion };
  summary: DiffSummary;
  bump?: Impact;
  changes: JudgedChange[];
};
