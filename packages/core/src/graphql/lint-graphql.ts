import {
  GraphQLError,
  parse,
  Source as GraphqlSource,
  type DocumentNode,
  visitInParallel,
  type ASTNode,
  visit,
} from 'graphql';

import type { Config } from '../config/index.js';
import { initRules } from '../config/rules.js';
import type { GraphqlRuleSet } from '../oas-types.js';
import type { Document, Source } from '../resolve.js';
import type { NormalizedProblem, ProblemSeverity } from '../walk.js';
import { type GraphqlVisitor, toAstVisitor } from './visitor.js';

export function lintGraphqlDocument(opts: {
  document: Document;
  config: Config;
}): NormalizedProblem[] {
  const { document, config } = opts;
  const source = document.source;

  let ast: DocumentNode;
  try {
    ast = parse(new GraphqlSource(source.body, source.absoluteRef));
  } catch (e) {
    if (e instanceof GraphQLError) {
      // Syntax errors are always reported as errors and short-circuit the file.
      return [syntaxErrorToProblem(e, source)];
    }
    throw e;
  }
  const ruleSets = (config.getRulesForSpecVersion('graphql') ?? []) as GraphqlRuleSet[];
  const rules = initRules(ruleSets, config, 'rules', 'graphql') as InitializedGraphqlRule[];
  const problems = runGraphqlRules({ ast, source, config, rules });
  return problems.map((problem) => config.addProblemToIgnore(problem));
}

function syntaxErrorToProblem(error: GraphQLError, source: Source): NormalizedProblem {
  const loc = error.locations?.[0];
  return {
    ruleId: 'struct',
    severity: 'error',
    message: error.message,
    suggest: [],
    location: [
      {
        source,
        pointer: undefined,
        start: loc ? { line: loc.line, col: loc.column } : { line: 1, col: 1 },
      },
    ],
  };
}

type InitializedGraphqlRule = {
  ruleId: string;
  severity: ProblemSeverity;
  message?: string;
  visitor: GraphqlVisitor;
};

function runGraphqlRules(opts: {
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
