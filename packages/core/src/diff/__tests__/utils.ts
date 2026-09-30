import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { buildNodeTree } from '../../node-tree/build.js';
import type { NodeEntry } from '../../node-tree/types.js';
import { getTypes } from '../../oas-types.js';
import { Location } from '../../ref-utils.js';
import { makeDocumentFromString, Source } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import { buildDiffTree } from '../diff-tree.js';
import { resolveDirections } from '../direction.js';
import type { DiffNode, Directions } from '../types.js';

const source = new Source('tree.yaml', '');

/** The node tree of a YAML document, typed the way the diff types it. */
export async function nodeTreeOf(yaml: string, absoluteRef = 'api.yaml') {
  const document = makeDocumentFromString(yaml, absoluteRef);
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return buildNodeTree({ document, types, specVersion });
}

/**
 * A node tree spelled out line by line as `pointer Type`, optionally followed by `name=value`
 * fields, for tests that need node types rather than a document. The first line is the root;
 * each other line is a child of the line whose pointer it extends by one segment.
 */
export function treeOf(lines: string): Map<string, NodeEntry> {
  const entries = new Map<string, NodeEntry>();

  for (const line of lines.trim().split('\n')) {
    const [pointer, type, ...fields] = line.trim().split(/\s+/);
    const parentPointer = pointer.slice(0, pointer.lastIndexOf('/'));
    const parent = entries.get(parentPointer === '#' ? '#/' : parentPointer) ?? null;
    const entry: NodeEntry = {
      type,
      key: pointer.slice(pointer.lastIndexOf('/') + 1),
      location: new Location(source, pointer),
      value: Object.fromEntries(fields.map((field) => field.split('='))),
      parent,
      children: [],
    };
    parent?.children.push(entry);
    entries.set(pointer, entry);
  }

  return entries;
}

/** A spelled-out tree compared with itself, its diff nodes keyed by pointer. */
export function diffTreeOf(lines: string): Map<string, DiffNode> {
  const entries = treeOf(lines);
  const [root] = entries.values();
  const { diffNodeOf } = buildDiffTree(root, root, {});
  return new Map([...entries].map(([pointer, entry]) => [pointer, diffNodeOf.get(entry)!]));
}

/** The directions in a spelled-out tree compared with itself, given the references in it. */
export function directionsOfTree(
  entries: Map<string, NodeEntry>,
  references: Array<[from: string, to: string]>,
  directions: Directions
) {
  const [root] = entries.values();
  const { diffNodeOf } = buildDiffTree(root, root, {});
  return resolveDirections(
    references.map(([from, to]) => ({ from: entries.get(from)!, to: entries.get(to)! })),
    diffNodeOf,
    directions
  );
}
