import type { NodeEntry } from '../node-tree/types.js';
import { changesOf } from './changes.js';
import { comparedSidesOf, hasKeysNextToRefs, pointerOf } from './diff-node.js';
import { pairChildren } from './pair-children.js';
import type { Change, DiffNode } from './types.js';

/** A node that one side does not have is one change: nothing below it is compared. */
export function compareTrees(base: NodeEntry, revision: NodeEntry): Change[] {
  const changes: Change[] = [];
  const compared = new Map<string, DiffNode>();

  function compare(node: DiffNode): void {
    const sides = comparedSidesOf(node);

    if (sides.base && sides.revision) {
      // A pair reached again, or through itself, was compared where it was reached first.
      const id = `${sides.base.location.absolutePointer}|${sides.revision.location.absolutePointer}`;
      const first = compared.get(id);

      if (first) {
        first.referencedBy.push(node);
        return;
      }

      compared.set(id, node);
    }

    changes.push(...changesOf(node));

    if (!sides.base || !sides.revision) return;

    for (const pair of pairChildren(sides.base.children, sides.revision.children)) {
      const child: DiffNode = { ...pair, parent: node, referencedBy: [] };

      // A renamed map entry, such as a path or a property.
      if (
        pair.base &&
        pair.revision &&
        typeof pair.base.key === 'string' &&
        pair.base.key !== pair.revision.key
      ) {
        changes.push({
          key: pointerOf(child),
          node: child,
          kind: 'modified',
          property: 'key',
          base: { location: pair.base.location, value: pair.base.key },
          revision: { location: pair.revision.location, value: pair.revision.key },
        });
      }

      compare(child);
    }

    if (hasKeysNextToRefs(sides)) {
      compare({
        base: sides.base.resolved,
        revision: sides.revision.resolved,
        parent: node,
        referencedBy: [],
      });
    }
  }

  compare({ base, revision, parent: null, referencedBy: [] });

  return changes;
}
