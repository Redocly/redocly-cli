import { unescapePointerFragment } from '@redocly/openapi-core';

import { escapeIdentityKeyPart } from './node-identity.js';
import type { NodeEntry } from './types.js';

export interface PathRename {
  baseTemplate: string;
  revisionTemplate: string;
  basePointer: string;
  revisionPointer: string;
  baseRealPointer: string;
  revisionRealPointer: string;
}

const TEMPLATE_PARAM = /\{([^}]+)\}/g;

function normalizeTemplate(template: string): string {
  let index = 0;
  return template.replace(TEMPLATE_PARAM, () => `{${index++}}`);
}

function paramNames(template: string): string[] {
  return [...template.matchAll(TEMPLATE_PARAM)].map((m) => m[1]);
}

// raw path template → stable PathItem pointer
function pathTemplates(entries: Map<string, NodeEntry>): Map<string, string> {
  const result = new Map<string, string>();
  for (const entry of entries.values()) {
    if (entry.typeName === 'PathItem' && entry.parentPointer === '#/paths') {
      result.set(unescapePointerFragment(entry.pointer.slice('#/paths/'.length)), entry.pointer);
    }
  }
  return result;
}

function groupByNormalized(templates: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const template of templates) {
    const normalized = normalizeTemplate(template);
    groups.set(normalized, [...(groups.get(normalized) ?? []), template]);
  }
  return groups;
}

// Matches path templates that differ only in parameter names and re-keys the
// revision entries into the base pointer space. Only unambiguous 1:1 matches
// are aliased — anything else keeps its own keys and diffs as remove+add.
export function alignRenamedPaths(
  base: Map<string, NodeEntry>,
  revision: Map<string, NodeEntry>
): { revision: Map<string, NodeEntry>; renames: PathRename[] } {
  const baseTemplates = pathTemplates(base);
  const revisionTemplates = pathTemplates(revision);

  const baseGroups = groupByNormalized(
    [...baseTemplates.keys()].filter((t) => !revisionTemplates.has(t))
  );
  const revisionGroups = groupByNormalized(
    [...revisionTemplates.keys()].filter((t) => !baseTemplates.has(t))
  );

  const renames: PathRename[] = [];
  for (const [normalized, baseCandidates] of baseGroups) {
    const revisionCandidates = revisionGroups.get(normalized) ?? [];
    if (baseCandidates.length !== 1 || revisionCandidates.length !== 1) continue;
    const [baseTemplate] = baseCandidates;
    const [revisionTemplate] = revisionCandidates;
    const basePointer = baseTemplates.get(baseTemplate)!;
    const revisionPointer = revisionTemplates.get(revisionTemplate)!;
    renames.push({
      baseTemplate,
      revisionTemplate,
      basePointer,
      revisionPointer,
      baseRealPointer: base.get(basePointer)!.realPointer,
      revisionRealPointer: revision.get(revisionPointer)!.realPointer,
    });
  }

  if (!renames.length) return { revision, renames };

  const rewrites = renames.map((rename) => ({
    fromPrefix: rename.revisionPointer,
    toPrefix: rename.basePointer,
    // positional mapping of revision param names to base param names,
    // pre-escaped the way node-identity builds '{path:<name>}' segments
    paramMap: new Map(
      paramNames(rename.revisionTemplate).map((name, i) => [
        escapeIdentityKeyPart(name),
        escapeIdentityKeyPart(paramNames(rename.baseTemplate)[i]),
      ])
    ),
  }));

  const rewriteKey = (key: string): string => {
    for (const { fromPrefix, toPrefix, paramMap } of rewrites) {
      if (key !== fromPrefix && !key.startsWith(fromPrefix + '/')) continue;
      const suffix = key
        .slice(fromPrefix.length)
        .split('/')
        .map((segment) => {
          const match = segment.match(/^\{path:(.+)\}$/);
          const mapped = match && paramMap.get(match[1]);
          return mapped ? `{path:${mapped}}` : segment;
        })
        .join('/');
      return toPrefix + suffix;
    }
    return key;
  };

  const aliased = new Map<string, NodeEntry>();
  for (const [key, entry] of revision) {
    const newKey = rewriteKey(key);
    aliased.set(newKey, {
      ...entry,
      pointer: newKey,
      parentPointer: entry.parentPointer === null ? null : rewriteKey(entry.parentPointer),
    });
  }
  return { revision: aliased, renames };
}
