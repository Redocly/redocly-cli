import {
  detectSpec,
  getMajorSpecVersion,
  getTypes,
  normalizeTypes,
  type Config,
  type Document,
  type SpecVersion,
} from '@redocly/openapi-core';

import { alignRenamedPaths, type PathRename } from './align-paths.js';
import { classifyChanges } from './classify/index.js';
import { UsageIndex } from './classify/usage.js';
import { collectDocumentMap } from './collect.js';
import { compareMaps } from './compare.js';
import { locateChanges } from './locate.js';
import type { DiffResult, DiffSummary, RawChange } from './types.js';

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
      `Cannot compare different specification families: '${baseVersion}' vs '${revisionVersion}'.`
    );
  }

  // Each side is collected with ITS OWN type tree (spec §5.6).
  const collect = (document: Document, specVersion: SpecVersion) =>
    collectDocumentMap({
      document,
      types: normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config),
      specVersion,
      config,
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
  // usage edges are NOT rewritten: polarity only inspects 'parameters'/'responses'
  // segments and component roots, which a path rename never alters
  const usage = new UsageIndex([...baseCollected.usageEdges, ...revisionCollected.usageEdges]);

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
