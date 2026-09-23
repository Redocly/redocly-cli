import type { Config } from '../config/index.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';
import { buildNodeTree } from '../node-tree/build.js';
import { getTypes, type SpecVersion } from '../oas-types.js';
import type { Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { HandledError } from '../utils/error.js';
import { collectChanges } from './changes.js';
import { buildDiffTree, typeOf } from './diff-tree.js';
import { directionsOf } from './direction.js';
import { highestImpact } from './impact.js';
import { judgeChanges } from './judge.js';
import { diffSpecs } from './specs/index.js';
import type { DiffResult, DiffSummary, Impact, JudgedChange } from './types.js';

export function diffDocuments(opts: {
  base: Document;
  revision: Document;
  config: Config;
}): DiffResult {
  const { base, revision, config } = opts;

  const baseVersion = detectSpec(base.parsed);
  const revisionVersion = detectSpec(revision.parsed);

  const family = getMajorSpecVersion(revisionVersion);

  if (getMajorSpecVersion(baseVersion) !== family) {
    throw new HandledError(`Cannot compare ${baseVersion} with ${revisionVersion}.`);
  }

  const collect = (document: Document, specVersion: SpecVersion) => {
    return buildNodeTree({
      document,
      types: normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config),
      specVersion,
    });
  };

  const { identities = {}, directions = {} } = diffSpecs[family] ?? {};

  const collectedBase = collect(base, baseVersion);
  const collectedRevision = collect(revision, revisionVersion);

  const references = [...collectedBase.references, ...collectedRevision.references];

  const { root, diffNodeOf } = buildDiffTree(
    collectedBase.root,
    collectedRevision.root,
    identities
  );

  const directionOf = directionsOf(references, diffNodeOf, directions);

  const changes = judgeChanges({
    changes: collectChanges(root, identities),
    specVersion: revisionVersion,
    ruleSets: config.getDiffRulesForSpecVersion(family),
    impactOf: (ruleId) => config.getDiffImpact(ruleId, revisionVersion),
    directionOf,
  });

  return {
    version: '1',
    specVersions: {
      base: baseVersion,
      revision: revisionVersion,
    },
    summary: countByImpact(changes),
    bump: requiredBump(changes),
    changes,
  };
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
