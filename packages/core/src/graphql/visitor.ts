import type { ASTNode } from 'graphql';

import type { Config } from '../config/index.js';
import type { Source } from '../resolve.js';
import type { Loc } from '../walk.js';

export type GraphqlNodeKind = ASTNode['kind'];

export type GraphqlProblem = {
  message: string;
  // Override the node whose location is reported (defaults to the visited node).
  node?: ASTNode;
  // Fully explicit location, takes precedence over `node`.
  loc?: { start: Loc; end?: Loc };
  suggest?: string[];
};

export type GraphqlUserContext = {
  report(problem: GraphqlProblem): void;
  source: Source;
  config?: Config;
};

export type GraphqlVisitFunction = (node: any, ctx: GraphqlUserContext) => void;

export type GraphqlVisitorNode =
  | GraphqlVisitFunction
  | { enter?: GraphqlVisitFunction; leave?: GraphqlVisitFunction };

// Mirrors the OAS visitor shape: keyed by node kind, `enter` shorthand supported.
export type GraphqlVisitor = Partial<Record<GraphqlNodeKind, GraphqlVisitorNode>>;

export type GraphqlRule = (options: Record<string, any>) => GraphqlVisitor;
