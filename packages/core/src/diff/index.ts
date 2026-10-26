import type { Config } from '../config/index.js';
import { initDiffRules, initRules } from '../config/rules.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';
import { buildNodeTree } from '../node-tree/index.js';
import { getTypes, type SpecVersion } from '../oas-types.js';
import { BaseResolver, resolveDocument, type Document } from '../resolve.js';
import { transformDocument } from '../transform-document.js';
import { normalizeTypes } from '../types/index.js';
import { HandledError } from '../utils/error.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { WalkContext } from '../walk.js';
import { typeOf } from './diff-node.js';
import { compareTrees } from './diff-tree.js';
import { highestImpact } from './impact.js';
import { judgeChanges } from './judge.js';
import type { DiffResult, DiffSummary, Impact, JudgedChange } from './types.js';

export async function diffDocuments(opts: {
  base: Document;
  revision: Document;
  config: Config;
  externalRefResolver?: BaseResolver;
}): Promise<DiffResult> {
  const { base, revision, config, externalRefResolver = new BaseResolver(config.resolve) } = opts;

  const baseVersion = detectSpec(base.parsed);
  const revisionVersion = detectSpec(revision.parsed);

  const family = getMajorSpecVersion(revisionVersion);

  if (getMajorSpecVersion(baseVersion) !== family) {
    throw new HandledError(`Cannot compare ${baseVersion} with ${revisionVersion}.`);
  }

  const [baseTree, revisionTree] = await Promise.all([
    preparedNodeTree(base, baseVersion, config, externalRefResolver),
    preparedNodeTree(revision, revisionVersion, config, externalRefResolver),
  ]);

  const rules = initDiffRules(config.getDiffRulesForSpecVersion(family), config, revisionVersion);

  const changes = judgeChanges(
    compareTrees(baseTree.root, revisionTree.root),
    rules,
    revisionVersion
  );

  return {
    files: {
      base: base.source.absoluteRef,
      revision: revision.source.absoluteRef,
    },
    specVersions: {
      base: baseVersion,
      revision: revisionVersion,
    },
    infoVersions: { base: infoVersionOf(base), revision: infoVersionOf(revision) },
    summary: countByImpact(changes),
    bump: requiredBump(changes),
    changes,
    // The base is not the author's to fix, so its problems only warn.
    problems: [
      ...baseTree.problems.map((problem) => ({ ...problem, severity: 'warn' as const })),
      ...revisionTree.problems,
    ],
  };
}

async function preparedNodeTree(
  document: Document,
  specVersion: SpecVersion,
  config: Config,
  externalRefResolver: BaseResolver
) {
  const rules = config.getRulesForSpecVersion(getMajorSpecVersion(specVersion));
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);

  const ctx: WalkContext = {
    problems: [],
    specVersion,
    config,
    visitorsData: {},
  };

  let resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  for (const kind of ['preprocessors', 'decorators'] as const) {
    resolvedRefMap = await transformDocument({
      document,
      types,
      visitors: initRules(rules, config, kind, specVersion),
      resolvedRefMap,
      externalRefResolver,
      ctx,
    });
  }

  return {
    root: buildNodeTree({ document, types, resolvedRefMap, ctx }),
    problems: ctx.problems.map((problem) => config.addProblemToIgnore(problem)),
  };
}

function infoVersionOf({ parsed }: Document): string | undefined {
  const version =
    isPlainObject(parsed) && isPlainObject(parsed.info) ? parsed.info.version : undefined;
  return typeof version === 'string' ? version : undefined;
}

function countByImpact(changes: JudgedChange[]): DiffSummary {
  const summary: DiffSummary = { major: 0, minor: 0, patch: 0 };
  for (const change of changes) summary[change.impact]++;
  return summary;
}

function requiredBump(changes: JudgedChange[]): Impact | undefined {
  return highestImpact(
    changes.flatMap((change) => {
      const isVersionChange =
        change.kind === 'modified' &&
        change.property === 'version' &&
        typeOf(change.node) === 'Info';

      return !isVersionChange ? [change.impact] : [];
    })
  );
}
