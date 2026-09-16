import type { Config } from '../config/index.js';
import { detectSpec, getMajorSpecVersion } from '../detect-spec.js';
import { collectNodeMap } from '../node-map/collect.js';
import { getTypes, type SpecVersion } from '../oas-types.js';
import type { Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { alignRenamedPaths, type PathRename } from './align-paths.js';
import { compareMaps } from './compare.js';
import { classifyChanges } from './detect.js';
import { identityOf } from './identity.js';
import { locateChanges } from './locate.js';
import type { DiffResult, DiffSummary, RawChange } from './types.js';
import { UsageIndex } from './usage.js';

export class DiffError extends Error {}

// The path template itself is a map key, not a node property, so the rename is
// surfaced as a synthetic 'changed' on the PathItem with property 'path'.
function toRenameChange(rename: PathRename): RawChange {
  return {
    pointer: rename.basePointer,
    property: 'path',
    kind: 'changed',
    typeName: 'PathItem',
    base: { pointer: rename.baseRealPointer, value: rename.baseTemplate },
    revision: { pointer: rename.revisionRealPointer, value: rename.revisionTemplate },
  };
}

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

  // Each side is collected with ITS OWN type tree (spec §5.6).
  const collect = (document: Document, specVersion: SpecVersion) =>
    collectNodeMap({
      document,
      types: normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config),
      specVersion,
      identityOf,
    });

  const baseCollected = collect(base, baseVersion);
  const revisionCollected = collect(revision, revisionVersion);

  const { revision: alignedRevision, renames } = alignRenamedPaths(
    baseCollected.entries,
    revisionCollected.entries
  );

  const rawChanges = [
    ...renames.map(toRenameChange),
    ...compareMaps(baseCollected.entries, alignedRevision),
  ];
  // usage edges are NOT rewritten: polarity reads node types along the ancestor
  // chain and component roots, neither of which a path rename alters
  const nodeAt = (pointer: string) =>
    alignedRevision.get(pointer) ?? baseCollected.entries.get(pointer);
  const usage = new UsageIndex(
    [...baseCollected.usageEdges, ...revisionCollected.usageEdges],
    nodeAt
  );

  const changes = locateChanges(
    classifyChanges({
      changes: rawChanges,
      specVersion: revisionVersion,
      base: baseCollected.entries,
      revision: alignedRevision,
      usage,
    }),
    base.source,
    revision.source
  );

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
