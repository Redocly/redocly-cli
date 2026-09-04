// Pairing pass over `markdocTag` tokens, deliberately a pure tree-in/data-out
// function rather than tokenizer state: that keeps it unit-testable on
// synthesized trees and reusable by both the validation rule and the LSP's
// enclosing-tag-at-position lookup.
import type { Token, TokenTree } from '../types.js';
import type { MarkdocTagKind } from './span.js';

export interface MarkdocPair {
  open: Token;
  close: Token;
  /**
   * Nesting depth of `open` at the moment it was pushed: 0 for a top-level tag,
   * 1 for a tag opened inside exactly one other, and so on. It stays fixed even
   * when `close` jumps over an intervening unmatched open (see `crossed`), since
   * it describes where `open` appeared, not where its match landed.
   */
  depth: number;
}

/**
 * The five buckets are disjoint: a pair lands in `pairs` or `crossed` but never
 * both, and a token appears in at most one bucket.
 */
export interface MarkdocPairing {
  /** Cleanly matched open/close pairs (no crossing involved on either side). */
  pairs: MarkdocPair[];
  /** Opens with no close by EOF (excluding schema-known void tags, below). */
  unclosed: Token[];
  /** Closes that match no open anywhere on the stack. */
  orphaned: Token[];
  /** Matched pairs whose open or close jumped, or was jumped by, another pair. */
  crossed: MarkdocPair[];
  /** Opens whose name is schema-declared self-closing, written without `/%}`. */
  voidMissingSlash: Token[];
}

/**
 * A "nothing was paired" result for callers that must still supply a
 * `MarkdocPairing` but have no reason to run the pass -- the runner uses it when
 * the Markdoc flag is on but no active rule can read the buckets anyway. A
 * factory rather than a shared constant, because the buckets are mutable arrays
 * and one shared instance would let an accidental push leak across files.
 */
export function emptyMarkdocPairing(): MarkdocPairing {
  return { pairs: [], unclosed: [], orphaned: [], crossed: [], voidMissingSlash: [] };
}

export interface PairingOptions {
  /**
   * Tag names a schema declares self-closing. A plain `Set<string>` rather than
   * a dependency on the schema module, so the schema's shape can change without
   * this pass knowing anything beyond which names never take a close tag.
   */
  selfClosingTags?: ReadonlySet<string>;
}

// Kinds that never enter the pairing stack: annotation, variable, and function
// spans carry no tag name at all, a self-closing tag (`{% x /%}`) is already
// complete on its own, and a malformed span is left inert so it cannot disturb
// the pairing of the well-formed tags around it (the syntax-level rule owns
// reporting it).
const NEVER_PAIRED_KINDS: ReadonlySet<MarkdocTagKind | 'malformed'> = new Set([
  'annotation',
  'variable',
  'function',
  'tag-self-closing',
  'malformed',
] as const);

/** The tag's own name, from its synthesized `markdocTagName` child (absent
 * only for the kinds already filtered out above, where it's `null`). */
function tagName(token: Token): string | null {
  const nameChild = token.children.find((child) => child.type === 'markdocTagName');
  return nameChild ? nameChild.text : null;
}

interface StackEntry {
  token: Token;
  name: string;
  depth: number;
  /**
   * Set once a later close searches past this entry to match an outer same-name
   * open, and read back when this entry gets its own close, so the pair it forms
   * still lands in `crossed` even if that close matches cleanly at the top of
   * the stack.
   */
  crossed: boolean;
}

/**
 * Computes open/close pairing for a document's `markdocTag` tokens with a single
 * stack walk in document order. The filtered list is sorted by position rather
 * than trusting whatever order `tree.flat` happens to be in, since
 * `structureMarkdocTags` (structure.ts) appends its own synthesized children to
 * the end of that same array.
 *
 * Deliberate divergence from upstream Markdoc, which tests a close only against
 * the immediate top of its stack and never searches deeper: for
 * `{% a %}{% b %}{% /a %}{% /b %}` upstream reports a missing-closing plus a
 * missing-opening and lets `a`'s node swallow everything to EOF, while this pass
 * searches the whole stack innermost-first and reports both pairs as `crossed`.
 * "These two pairs are interleaved" is the more actionable diagnostic, and a
 * crossing can never silently land in `pairs`, so no error upstream reports is
 * lost. The cost is that consumers relying on pair ranges see a narrower range
 * for a crossed `open` than upstream's AST would give.
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
    if (name === null) continue; // defensive only: every tag-open/tag-close carries a name

    if (kind === 'tag-open') {
      stack.push({ token, name, depth: stack.length, crossed: false });
      continue;
    }

    // kind === 'tag-close': innermost-first search for the nearest same-name open.
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
