import type { Config } from '../config/index.js';
import { detectSpec } from '../detect-spec.js';
import { getTypes } from '../oas-types.js';
import { isRef, parsePointer } from '../ref-utils.js';
import { BaseResolver, resolveDocument, type Document } from '../resolve.js';
import { normalizeTypes } from '../types/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { makeRefId } from '../utils/make-ref-id.js';

export async function resolveApiMapPointer({
  document,
  config,
  externalRefResolver = new BaseResolver(config.resolve),
  pointer,
}: {
  document: Document;
  config: Config;
  externalRefResolver?: BaseResolver;
  pointer: string;
}): Promise<unknown> {
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  let current: unknown = document.parsed;
  let fromFile = document.source.absoluteRef;

  const followRefs = () => {
    while (isRef(current)) {
      const resolvedRef = resolvedRefMap.get(makeRefId(fromFile, current.$ref));
      if (!resolvedRef?.resolved) return false;
      current = resolvedRef.node;
      fromFile = resolvedRef.document.source.absoluteRef;
    }
    return true;
  };

  for (const segment of parsePointer(pointer.replace(/^#\//, ''))) {
    if (!followRefs()) return undefined;
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (isPlainObject(current)) {
      current = current[segment];
    } else {
      return undefined;
    }
    if (current === undefined) return undefined;
  }

  return followRefs() ? current : undefined;
}
