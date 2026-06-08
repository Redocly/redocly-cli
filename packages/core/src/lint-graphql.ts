import { GraphQLError, parse, Source as GraphqlSource, type DocumentNode } from 'graphql';

import type { Config } from './config/index.js';
import { initRules } from './config/rules.js';
import { isGraphqlRef } from './graphql/extensions.js';
import { runGraphqlRules, type InitializedGraphqlRule } from './graphql/run.js';
import type { GraphqlRuleSet } from './oas-types.js';
import type { Document, Source } from './resolve.js';
import type { NormalizedProblem } from './walk.js';

export function isGraphqlDocument(document: Document): boolean {
  return isGraphqlRef(document.source.absoluteRef);
}

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
