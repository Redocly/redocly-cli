import type { Config } from '../config/index.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';
import { collectNodes } from '../node-map/collect.js';
import { getTypes, type SpecVersion } from '../oas-types.js';
import type { Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { changesIn } from './changes.js';
import { judgeChanges } from './detect.js';
import { highestImpact } from './impact.js';
import { pairDocuments, typeOf } from './pairs.js';
import { diffSpecs, structuralSpec } from './specs/index.js';
import type { DiffResult, DiffSummary, Impact, JudgedChange } from './types.js';
import { usageDirections } from './usage.js';

export class DiffError extends Error {}

const byKey = (left: { key: string }, right: { key: string }) =>
  left.key < right.key ? -1 : left.key > right.key ? 1 : 0;

// The change to `info.version` is the bump being checked, so it does not count toward it.
function requiredBump(changes: JudgedChange[]): Impact | undefined {
  const counted = changes.filter(
    (change) =>
      !(
        typeOf(change.pair) === 'Info' &&
        change.kind === 'modified' &&
        change.property === 'version'
      )
  );
  return highestImpact(counted.map((change) => change.impact));
}

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
    throw new DiffError(
      `The base and the revision use different specification families: '${baseVersion}' and '${revisionVersion}'. The diff command compares documents of one family only.`
    );
  }

  // Each side is collected with its own type tree.
  const collect = (document: Document, specVersion: SpecVersion) =>
    collectNodes({
      document,
      types: normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config),
      specVersion,
    });

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
    changes: changesIn(root, spec ?? structuralSpec).sort(byKey),
    specVersion: revisionVersion,
    spec,
    ruleSets: config.getDiffRulesForSpecVersion(family),
    impactOf: (ruleId) => config.getDiffImpact(ruleId, revisionVersion),
    fromUsage,
  });

  const summary: DiffSummary = { major: 0, minor: 0, patch: 0 };
  for (const change of changes) summary[change.impact]++;

  return {
    version: '1',
    specVersions: { base: baseVersion, revision: revisionVersion },
    summary,
    bump: requiredBump(changes),
    changes,
  };
}
