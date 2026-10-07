import { keyKindOf, valueOf } from '../node-tree/access.js';
import type { NodeEntry } from '../node-tree/types.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { levenshteinSimilarity } from '../utils/levenshtein.js';
import type { Pair } from './types.js';

// Git counts a file as renamed when at least half of it is unchanged; the same share pairs a
// renamed key or a changed list item with what it was.
const PAIRING_THRESHOLD = 0.5;

/**
 * Pairs each child with the same one on the other side, or else the most alike of its type. The
 * same ones pair first, so a changed child never takes the place of an unchanged one.
 */
export function pairChildren(base: NodeEntry[], revision: NodeEntry[]): Pair[] {
  const pairs: Pair[] = [];
  const unpaired = new Set(revision);
  const changed: NodeEntry[] = [];

  const written = knownAs([...base, ...revision], (child) => child.value);
  for (const child of base) {
    const same = findSame(child, unpaired, written);

    if (same) {
      unpaired.delete(same);
      pairs.push({ base: child, revision: same });
    } else {
      changed.push(child);
    }
  }

  // A `$ref` is written as the `$ref`, so two `$ref`s to one place are the same at once; what
  // changed is paired by what it stands for, so a `$ref` and inline content can still meet.
  const meant = knownAs([...changed, ...unpaired], valueOf);
  for (const child of changed) {
    const alike = findMostAlike(child, unpaired, meant);

    if (alike) unpaired.delete(alike);
    pairs.push({ base: child, revision: alike });
  }

  for (const child of unpaired) pairs.push({ revision: child });

  return pairs;
}

function knownAs(
  children: NodeEntry[],
  contentOf: (child: NodeEntry) => unknown
): Map<NodeEntry, string> {
  return new Map(
    children.map((child) => [
      child,
      typeof child.key === 'string' ? child.key : jsonWithSortedKeys(contentOf(child)),
    ])
  );
}

function findSame(
  child: NodeEntry,
  candidates: Set<NodeEntry>,
  known: Map<NodeEntry, string>
): NodeEntry | undefined {
  for (const candidate of candidates) {
    if (candidate.type.name === child.type.name && known.get(candidate) === known.get(child)) {
      return candidate;
    }
  }

  return undefined;
}

// The first of the most alike wins a tie, so the document order decides.
function findMostAlike(
  child: NodeEntry,
  candidates: Set<NodeEntry>,
  known: Map<NodeEntry, string>
): NodeEntry | undefined {
  let mostAlike: NodeEntry | undefined;
  let highestScore = 0;

  for (const candidate of candidates) {
    if (candidate.type.name !== child.type.name) continue;

    const score = similarity(child, candidate, known);

    if (score >= PAIRING_THRESHOLD && score > highestScore) {
      mostAlike = candidate;
      highestScore = score;
    }
  }

  return mostAlike;
}

// A field pairs only with the same field.
function similarity(child: NodeEntry, other: NodeEntry, known: Map<NodeEntry, string>): number {
  if (keyKindOf(child) === 'field') return child.key === other.key ? 1 : 0;

  return levenshteinSimilarity(known.get(child)!, known.get(other)!);
}

function jsonWithSortedKeys(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(jsonWithSortedKeys).join(',')}]`;
  if (!isPlainObject(value)) return JSON.stringify(value) ?? 'null';

  const fields = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${jsonWithSortedKeys(value[key])}`);

  return `{${fields.join(',')}}`;
}
