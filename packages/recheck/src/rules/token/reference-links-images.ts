// Ported from markdownlint's lib/md052.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// Undefined references are found with a text scan, which only approximates upstream.
import type { TokenRule } from '../types.js';
import { getReferenceLinkImageData } from './helpers.js';

export const referenceLinksImages: TokenRule = {
  name: 'reference-links-images',
  tags: ['images', 'links'],
  fixable: false,
  defaults: {
    message: 'Reference links and images should use a label that is defined',
    shortcutSyntax: false,
    ignoredLabels: ['x'],
  },
  check(ctx) {
    const shortcutSyntax = !!ctx.config.shortcutSyntax;
    const configuredIgnoredLabels = ctx.config.ignoredLabels;
    const ignoredLabels = new Set(
      Array.isArray(configuredIgnoredLabels) ? configuredIgnoredLabels.map(String) : ['x']
    );
    const { definitions, references, shortcuts } = getReferenceLinkImageData(ctx.tree);
    const entries = shortcutSyntax
      ? [...references.entries(), ...shortcuts.entries()]
      : [...references.entries()];

    for (const [label, datas] of entries) {
      if (definitions.has(label) || ignoredLabels.has(label)) continue;
      for (const [lineIndex, index, length] of datas) {
        const line = ctx.lines[lineIndex] ?? '';
        // Context will be incomplete if reporting for a multi-line link
        const context = line.slice(index, index + length);
        ctx.onError({
          line: lineIndex + 1,
          column: index + 1,
          detail: `Missing link or image reference definition: "${label}"`,
          context,
        });
      }
    }
  },
};
