import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { parseYaml } from '../../js-yaml/index.js';
import { buildNodeTree } from '../../node-tree/index.js';
import type { NodeEntry } from '../../node-tree/types.js';
import { getTypes } from '../../oas-types.js';
import { parsePointer } from '../../ref-utils.js';
import { BaseResolver, makeDocumentFromString, resolveDocument } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { compareTrees } from '../diff-tree.js';
import type { Change, DiffNode } from '../types.js';

/** The node tree of a YAML document, typed the way the diff types it. */
export async function nodeTreeOf(
  yaml: string,
  absoluteRef = 'api.yaml',
  externalRefResolver = new BaseResolver()
): Promise<NodeEntry> {
  const document = makeDocumentFromString(yaml, absoluteRef);
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });
  const ctx = { problems: [], specVersion, visitorsData: {} };
  return buildNodeTree({ document, types, resolvedRefMap, ctx });
}

/** The changes from one YAML document to another, as the diff compares them. */
export async function changesBetween(base: string, revision: string): Promise<Change[]> {
  return compareTrees(await nodeTreeOf(base), await nodeTreeOf(revision));
}

/**
 * The diff node at `pointer` of a YAML document. The document is compared with a copy that has
 * one more field at the pointer, so the diff reaches the node, with every place that uses it.
 */
export async function diffNodeAt(yaml: string, pointer: string): Promise<DiffNode> {
  const marked = parseYaml(yaml) as Record<string, any>;
  const [, ...keys] = parsePointer(pointer);
  keys.reduce((value, key) => value[key], marked)['x-marked'] = true;

  const changes = await changesBetween(yaml, JSON.stringify(marked));
  return changes.find((change) => change.kind === 'modified' && change.property === 'x-marked')!
    .node;
}
