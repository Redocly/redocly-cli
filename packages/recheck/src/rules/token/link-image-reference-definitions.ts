// Ported from markdownlint's lib/md053.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// Relies on `getReferenceLinkImageData` (helpers.ts) for the
// definitions/references/shortcuts/duplicateDefinitions maps -- unlike
// MD052, this rule only needs successfully-resolved usages (a definition
// is either referenced by a real link/image token or it isn't), so it is
// unaffected by that helper's undefined-reference DEVIATION note.
import type { TokenRule } from '../types.js';
import { ellipsify, getReferenceLinkImageData } from './helpers.js';

const linkReferenceDefinitionRe = /^ {0,3}\[([^\]]*[^\\])\]:/;

function isSingleLineDefinition(line: string): boolean {
  return line.replace(linkReferenceDefinitionRe, '').trim().length > 0;
}

export const linkImageReferenceDefinitions: TokenRule = {
  name: 'link-image-reference-definitions',
  tags: ['images', 'links'],
  fixable: true,
  defaults: {
    message: 'Link and image reference definitions should be needed',
    ignoredDefinitions: ['//'],
  },
  check(ctx) {
    const configuredIgnored = ctx.config.ignoredDefinitions;
    const ignored = new Set(
      Array.isArray(configuredIgnored) ? configuredIgnored.map(String) : ['//']
    );
    const { references, shortcuts, definitions, duplicateDefinitions } = getReferenceLinkImageData(
      ctx.tree
    );

    // Look for unused link references (unreferenced by any link/image)
    for (const [label, [lineIndex]] of definitions.entries()) {
      if (ignored.has(label) || references.has(label) || shortcuts.has(label)) continue;
      const line = ctx.lines[lineIndex] ?? '';
      ctx.onError({
        line: lineIndex + 1,
        column: 1,
        detail: `Unused link or image reference definition: "${label}"`,
        context: ellipsify(line),
        fixInfo: isSingleLineDefinition(line)
          ? { lineNumber: lineIndex + 1, deleteCount: -1 }
          : undefined,
      });
    }

    // Look for duplicate link references (defined more than once)
    for (const [label, lineIndex] of duplicateDefinitions) {
      if (ignored.has(label)) continue;
      const line = ctx.lines[lineIndex] ?? '';
      ctx.onError({
        line: lineIndex + 1,
        column: 1,
        detail: `Duplicate link or image reference definition: "${label}"`,
        context: ellipsify(line),
        fixInfo: isSingleLineDefinition(line)
          ? { lineNumber: lineIndex + 1, deleteCount: -1 }
          : undefined,
      });
    }
  },
};
