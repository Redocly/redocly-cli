import { getLocation, type ASTNode, type ASTVisitor } from 'graphql';

import type { Config } from '../config/index.js';
import type { Source } from '../resolve.js';
import type { LineColLocationObject, NormalizedProblem, ProblemSeverity, Loc } from '../walk.js';

export type GraphqlNodeKind = ASTNode['kind'];

export type GraphqlProblem = {
  message: string;
  // Override the node whose location is reported (defaults to the visited node).
  node?: ASTNode;
  loc?: { start: Loc; end?: Loc };
  suggest?: string[];
  // Override the reporting rule id/severity (used by configurable rules so each one reports under its own id/severity instead of the shared ones).
  ruleId?: string;
  severity?: ProblemSeverity;
};

export type GraphqlUserContext = {
  report(problem: GraphqlProblem): void;
  source: Source;
  config?: Config;
  // Ancestor AST nodes of the visited node, outermost (Document) first.
  ancestors: ASTNode[];
};

export type GraphqlVisitFunction = (node: any, ctx: GraphqlUserContext) => void;

export type GraphqlVisitorNode =
  | GraphqlVisitFunction
  | { enter?: GraphqlVisitFunction; leave?: GraphqlVisitFunction };

// Mirrors the OAS visitor shape: keyed by node kind, `enter` shorthand supported.
export type GraphqlVisitor = Partial<Record<GraphqlNodeKind, GraphqlVisitorNode>>;

export type GraphqlRule = (options: Record<string, any>) => GraphqlVisitor | GraphqlVisitor[];

type ContextOptions = {
  ruleId: string;
  severity: ProblemSeverity;
  message?: string;
  source: Source;
  config?: Config;
  problems: NormalizedProblem[];
};

export function toAstVisitor(visitor: GraphqlVisitor, opts: ContextOptions): ASTVisitor {
  const astVisitor: Record<string, unknown> = {};
  for (const kind of Object.keys(visitor) as Array<keyof GraphqlVisitor>) {
    const handler = visitor[kind];
    if (!handler) continue;
    const enter = typeof handler === 'function' ? handler : handler.enter;
    const leave = typeof handler === 'function' ? undefined : handler.leave;
    astVisitor[kind] = {
      ...(enter ? { enter: wrap(enter, opts) } : {}),
      ...(leave ? { leave: wrap(leave, opts) } : {}),
    };
  }
  return astVisitor as ASTVisitor;
}

function wrap(fn: GraphqlVisitFunction, opts: ContextOptions) {
  return (
    node: ASTNode,
    _key: unknown,
    _parent: unknown,
    _path: unknown,
    ancestors: (ASTNode | ASTNode[])[]
  ) => {
    fn(node, makeContext(node, opts, ancestors));
  };
}

function makeContext(
  currentNode: ASTNode | undefined,
  opts: ContextOptions,
  rawAncestors: (ASTNode | ASTNode[])[] = []
): GraphqlUserContext {
  const { ruleId, severity, message, source, config, problems } = opts;
  const ancestors = rawAncestors.filter(
    (ancestor): ancestor is ASTNode => !Array.isArray(ancestor)
  );
  return {
    source,
    config,
    ancestors,
    report(problem: GraphqlProblem) {
      const node = problem.node ?? currentNode;
      const loc = problem.loc ?? nodeToLoc(node);
      const location: LineColLocationObject = {
        source,
        pointer: undefined,
        start: loc?.start ?? { line: 1, col: 1 },
        end: loc?.end,
      };
      problems.push({
        ruleId: problem.ruleId ?? ruleId,
        severity: problem.severity ?? severity,
        message: message ? message.replace('{{message}}', problem.message) : problem.message,
        suggest: problem.suggest ?? [],
        location: [location],
      });
    },
  };
}

export function nodeToLoc(node?: ASTNode) {
  if (!node?.loc) return undefined;
  const start = getLocation(node.loc.source, node.loc.start);
  const end = getLocation(node.loc.source, node.loc.end);
  return {
    start: { line: start.line, col: start.column },
    end: { line: end.line, col: end.column },
  };
}
