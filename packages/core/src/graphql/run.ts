import { getLocation, visit, visitInParallel, type ASTNode, type ASTVisitor } from 'graphql';

import type { Config } from '../config/index.js';
import type { Source } from '../resolve.js';
import type { LineColLocationObject, NormalizedProblem, ProblemSeverity } from '../walk.js';
import type {
  GraphqlProblem,
  GraphqlUserContext,
  GraphqlVisitFunction,
  GraphqlVisitor,
} from './visitor.js';

export type InitializedGraphqlRule = {
  ruleId: string;
  severity: ProblemSeverity;
  message?: string;
  visitor: GraphqlVisitor;
};

type ContextOptions = {
  ruleId: string;
  severity: ProblemSeverity;
  message?: string;
  source: Source;
  config?: Config;
  problems: NormalizedProblem[];
};

export function runGraphqlRules(opts: {
  ast: ASTNode;
  source: Source;
  config?: Config;
  rules: InitializedGraphqlRule[];
}): NormalizedProblem[] {
  const { ast, source, config, rules } = opts;
  const problems: NormalizedProblem[] = [];

  const astVisitors = rules.map(({ ruleId, severity, message, visitor }) =>
    toAstVisitor(visitor, { ruleId, severity, message, source, config, problems })
  );

  if (astVisitors.length > 0) {
    visit(ast, visitInParallel(astVisitors));
  }

  return problems;
}

function toAstVisitor(visitor: GraphqlVisitor, opts: ContextOptions): ASTVisitor {
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
  return (node: ASTNode) => {
    fn(node, makeContext(node, opts));
  };
}

function makeContext(currentNode: ASTNode | undefined, opts: ContextOptions): GraphqlUserContext {
  const { ruleId, severity, message, source, config, problems } = opts;
  return {
    source,
    config,
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
        ruleId,
        severity,
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
