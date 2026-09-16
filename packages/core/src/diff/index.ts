import type { Config } from '../config/index.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';
import { collectNodeMap } from '../node-map/collect.js';
import { getTypes, type SpecVersion } from '../oas-types.js';
import type { Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { compareMaps } from './compare.js';
import { detectBreakingChanges } from './detect.js';
import { identityOf } from './identity.js';
import type { DiffResult, DiffSummary } from './types.js';
import { UsageIndex } from './usage.js';

export class DiffError extends Error {}

export function diffDocuments(opts: {
  base: Document;
  revision: Document;
  config: Config;
}): DiffResult {
  const { base, revision, config } = opts;

  const baseVersion = detectSpec(base.parsed);
  const revisionVersion = detectSpec(revision.parsed);
  if (getMajorSpecVersion(baseVersion) !== getMajorSpecVersion(revisionVersion)) {
    throw new DiffError(
      `The base and the revision use different specification families: '${baseVersion}' and '${revisionVersion}'. The diff command compares documents of one family only.`
    );
  }

  // Each side is collected with its own type tree.
  const collect = (document: Document, specVersion: SpecVersion) =>
    collectNodeMap({
      document,
      types: normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config),
      specVersion,
      identityOf,
    });

  const baseMap = collect(base, baseVersion);
  const revisionMap = collect(revision, revisionVersion);

  // A removed node only exists in the base, an added one only in the revision.
  const nodeAt = (key: string) => revisionMap.entries.get(key) ?? baseMap.entries.get(key);
  const usage = new UsageIndex([...baseMap.usageEdges, ...revisionMap.usageEdges], nodeAt);

  const changes = detectBreakingChanges({
    changes: compareMaps(baseMap.entries, revisionMap.entries),
    specVersion: revisionVersion,
    base: baseMap.entries,
    revision: revisionMap.entries,
    usage,
  });

  const summary = changes.reduce<DiffSummary>(
    (acc, change) => {
      if (change.compat === 'breaking') acc.breaking++;
      else acc.nonBreaking++;
      return acc;
    },
    { breaking: 0, nonBreaking: 0 }
  );

  return {
    version: '1',
    specVersions: { base: baseVersion, revision: revisionVersion },
    summary,
    changes,
  };
}
