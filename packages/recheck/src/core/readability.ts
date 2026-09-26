import { computeTextStatistics, computeReadability } from '../metrics/index.js';
// Document-level readability. The `readability` command reports these
// numbers and the `metric` assertion gates on them; both read the same
// prose (core/prose-extract.ts) and formulas (metrics/).
import { parseMarkdown } from '../parser/index.js';
import { extractScopes } from '../scopes/extractor.js';
import { extractProse } from './prose-extract.js';

export interface DocumentReadability {
  words: number;
  sentences: number;
  /** Flesch reading ease; higher is easier. Null when there is no prose. */
  fleschReadingEase: number | null;
  /** Flesch-Kincaid grade level. Null when there is no prose. */
  fleschKincaidGrade: number | null;
  /**
   * Automated Readability Index, a grade level from exact character counts --
   * no syllable heuristic. Null when there is no prose.
   */
  automatedReadabilityIndex: number | null;
}

export function computeDocumentReadability(
  content: string,
  options: { markdoc?: boolean } = {}
): DocumentReadability {
  const tree = parseMarkdown(content, { markdoc: options.markdoc ?? false });
  const segments = extractScopes(tree, content).filter((segment) => segment.scope === 'summary');
  const blocks = extractProse(segments);

  // Per block and summed, so a block's end is an unconditional sentence end.
  const stats = blocks.map(computeTextStatistics).reduce(
    (sum, one) => ({
      words: sum.words + one.words,
      sentences: sum.sentences + one.sentences,
      syllables: sum.syllables + one.syllables,
      characters: sum.characters + one.characters,
      complexWords: sum.complexWords + one.complexWords,
    }),
    { words: 0, sentences: 0, syllables: 0, characters: 0, complexWords: 0 }
  );

  if (stats.words === 0 || stats.sentences === 0) {
    return {
      words: stats.words,
      sentences: stats.sentences,
      fleschReadingEase: null,
      fleschKincaidGrade: null,
      automatedReadabilityIndex: null,
    };
  }
  return {
    words: stats.words,
    sentences: stats.sentences,
    fleschReadingEase: computeReadability('flesch-reading-ease', stats),
    fleschKincaidGrade: computeReadability('flesch-kincaid-grade', stats),
    automatedReadabilityIndex: computeReadability('automated-readability', stats),
  };
}
