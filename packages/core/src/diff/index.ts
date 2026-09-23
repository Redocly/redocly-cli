import type { Config } from '../config/index.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';
import { collectNodes } from '../node-map/collect.js';
import { getTypes, type SpecVersion } from '../oas-types.js';
import type { Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { HandledError } from '../utils/error.js';
import { changesIn } from './changes.js';
import { judgeChanges } from './detect.js';
import { highestImpact } from './impact.js';
import { pairDocuments, typeOf } from './pairs.js';
import { diffSpecs, structuralSpec } from './specs/index.js';
import type { DiffResult, DiffSummary, Impact, JudgedChange } from './types.js';
import { usageDirections } from './usage.js';

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
    return collectNodes({
      document,
      types: normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config),
      specVersion,
    });
  };

  const spec = diffSpecs[family];

  const collectedBase = collect(base, baseVersion);
  const collectedRevision = collect(revision, revisionVersion);

  const references = [...collectedBase.references, ...collectedRevision.references];

  const { root, pairOf } = pairDocuments(
    collectedBase.root,
    collectedRevision.root,
    spec ?? structuralSpec
  );

  const fromUsage = usageDirections(references, pairOf, spec ?? structuralSpec);

  const changes = judgeChanges({
    changes: changesIn(root, spec ?? structuralSpec),
    specVersion: revisionVersion,
    spec,
    ruleSets: config.getDiffRulesForSpecVersion(family),
    impactOf: (ruleId) => config.getDiffImpact(ruleId, revisionVersion),
    fromUsage,
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
        typeOf(change.pair) === 'Info';

      return !isVersionChange ? [change.impact] : [];
    })
  );
}
