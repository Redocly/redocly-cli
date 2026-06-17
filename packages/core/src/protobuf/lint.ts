import type { Config } from '../config/index.js';
import { initRules } from '../config/rules.js';
import { getTypes } from '../oas-types.js';
import { BaseResolver, type Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { normalizeVisitors } from '../visitors.js';
import { walkDocument, type NormalizedProblem, type WalkContext } from '../walk.js';
import { makeProtoDocumentFromString } from './parse.js';

export async function lintProto(opts: {
  ref: string;
  config: Config;
  externalRefResolver?: BaseResolver;
}): Promise<NormalizedProblem[]> {
  const { ref, externalRefResolver = new BaseResolver(opts.config.resolve) } = opts;
  const source = await externalRefResolver.loadExternalRef(
    externalRefResolver.resolveExternalRef(null, ref)
  );
  const document = makeProtoDocumentFromString(source.body, source.absoluteRef);

  return lintProtoDocument({
    document,
    config: opts.config,
  });
}

export function lintProtoDocument(opts: {
  document: Document;
  config: Config;
}): NormalizedProblem[] {
  const { document, config } = opts;
  const specVersion = 'protobuf';
  const rules = config.getRulesForSpecVersion(specVersion);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);

  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  const preprocessors = initRules(rules, config, 'preprocessors', specVersion);
  const regularRules = initRules(rules, config, 'rules', specVersion);
  const resolvedRefMap = new Map();

  if (preprocessors.length > 0) {
    walkDocument({
      document,
      rootType: types.Root,
      normalizedVisitors: normalizeVisitors(preprocessors, types),
      resolvedRefMap,
      ctx,
    });
  }

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: normalizeVisitors(regularRules, types),
    resolvedRefMap,
    ctx,
  });

  return ctx.problems.map((problem) => config.addProblemToIgnore(problem));
}
