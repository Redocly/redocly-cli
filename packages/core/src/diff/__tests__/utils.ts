import { createConfig } from '../../config/index.js';
import { detectSpec } from '../../detect-spec.js';
import { buildNodeTree } from '../../node-tree/index.js';
import type { NodeEntry } from '../../node-tree/types.js';
import { getTypes } from '../../oas-types.js';
import { Location } from '../../ref-utils.js';
import { BaseResolver, makeDocumentFromString, resolveDocument, Source } from '../../resolve.js';
import { normalizeTypes } from '../../types/index.js';
import type { DiffNode } from '../types.js';

const source = new Source('tree.yaml', '');

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
      type: { name: type, properties: {} },
      key: pointer.slice(pointer.lastIndexOf('/') + 1),
      location: new Location(source, pointer),
      value: Object.fromEntries(
        fields.map((field) => {
          const [name, value] = field.split('=');
          return [name, value === 'true' ? true : value === 'false' ? false : value];
        })
      ),
      parent,
      children: [],
    };
    parent?.children.push(entry);
    entries.set(pointer, entry);
  }

  return entries;
}

/** A spelled-out tree paired with itself, its diff nodes keyed by pointer. */
export function diffTreeOf(lines: string): Map<string, DiffNode> {
  const nodes = new Map<string, DiffNode>();

  for (const [pointer, entry] of treeOf(lines)) {
    const parent = entry.parent ? nodes.get(entry.parent.location.pointer)! : null;
    nodes.set(pointer, { base: entry, revision: entry, parent, referencedBy: [] });
  }

  return nodes;
}

/**
 * The spelled-out diff tree with each `[from, to]` pair linked as a `$ref`: the pair at `to`
 * is reached again from the place at `from`, the way `compareTrees` notes it.
 */
export function withReferences(
  nodes: Map<string, DiffNode>,
  references: Array<[from: string, to: string]>
): Map<string, DiffNode> {
  for (const [from, to] of references) {
    nodes.get(to)!.referencedBy.push(nodes.get(from)!);
  }
  return nodes;
}
