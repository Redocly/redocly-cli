// Matches Markdoc open tags with their close tags.
import type { Token, TokenTree } from '../types.js';
import type { MarkdocTagKind } from './span.js';

export interface MarkdocPair {
  open: Token;
  close: Token;
  /** How many tags were open around `open` when it appeared: 0 for a top-level tag. */
  depth: number;
}

/** Each tag is in at most one of these lists. */
export interface MarkdocPairing {
  /** Matched pairs that do not cross another pair. */
  pairs: MarkdocPair[];
  /** Open tags with no close tag before the end of the file. */
  unclosed: Token[];
  /** Close tags with no matching open tag. */
  orphaned: Token[];
  /** Matched pairs that cross another pair, like `{% a %}{% b %}{% /a %}{% /b %}`. */
  crossed: MarkdocPair[];
  /** Self-closing tags (according to the schema) that were written without `/%}`. */
  voidMissingSlash: Token[];
}

/**
 * An empty result, for when no rule needs the pairing. A function so files don't share the arrays.
 */
export function emptyMarkdocPairing(): MarkdocPairing {
  return { pairs: [], unclosed: [], orphaned: [], crossed: [], voidMissingSlash: [] };
}

export interface PairingOptions {
  /** Names of tags that never have a close tag. */
  selfClosingTags?: ReadonlySet<string>;
}

// Kinds that are never paired: they have no tag name, are already complete, or are
// malformed (reported elsewhere).
const NEVER_PAIRED_KINDS: ReadonlySet<MarkdocTagKind | 'malformed'> = new Set([
  'annotation',
  'variable',
  'function',
  'tag-self-closing',
  'malformed',
] as const);

/** The tag's name, or null if it has none. */
function tagName(token: Token): string | null {
  const nameChild = token.children.find((child) => child.type === 'markdocTagName');
  return nameChild ? nameChild.text : null;
}

interface StackEntry {
  token: Token;
  name: string;
  depth: number;
  /** Set when a close tag skips past this entry, so its own pair is reported as crossed. */
  crossed: boolean;
}

/**
 * Pairs the `markdocTag` tokens of a document. Tags are sorted by position first,
 * because `tree.flat` is not in document order.
 *
 * This differs from Markdoc, which only checks a close tag against the most recent
 * open tag. For `{% a %}{% b %}{% /a %}{% /b %}` Markdoc reports a missing close and
 * a missing open, while this reports two crossed pairs.
 */
export function computeMarkdocPairing(
  tree: TokenTree,
  options: PairingOptions = {}
): MarkdocPairing {
  const selfClosingTags = options.selfClosingTags ?? new Set<string>();

  const tags = tree.flat
    .filter((token) => token.type === 'markdocTag')
    .sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);

  const stack: StackEntry[] = [];
  const pairs: MarkdocPair[] = [];
  const crossed: MarkdocPair[] = [];
  const orphaned: Token[] = [];

  for (const token of tags) {
    const kind = token.markdocKind;
    if (kind === undefined || NEVER_PAIRED_KINDS.has(kind)) continue;

    const name = tagName(token);
    if (name === null) continue;

    if (kind === 'tag-open') {
      stack.push({ token, name, depth: stack.length, crossed: false });
      continue;
    }

    // A close tag: find the nearest open tag with the same name.
    let matchIndex = -1;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].name === name) {
        matchIndex = i;
        break;
      }
    }
    if (matchIndex === -1) {
      orphaned.push(token);
      continue;
    }

    const jumpedOver = matchIndex !== stack.length - 1;
    if (jumpedOver) {
      for (let i = matchIndex + 1; i < stack.length; i++) stack[i].crossed = true;
    }

    const [matched] = stack.splice(matchIndex, 1);
    const pair: MarkdocPair = { open: matched.token, close: token, depth: matched.depth };
    (jumpedOver || matched.crossed ? crossed : pairs).push(pair);
  }

  const unclosed: Token[] = [];
  const voidMissingSlash: Token[] = [];
  for (const entry of stack) {
    (selfClosingTags.has(entry.name) ? voidMissingSlash : unclosed).push(entry.token);
  }

  return { pairs, unclosed, orphaned, crossed, voidMissingSlash };
}
