import { newLineRe } from '../../core/line-endings.js';
import type { ScopedSegment } from '../../scopes/types.js';
import type { MaxImageSizeAssertion } from '../../types/assertions.js';
import type { Problem, NormalizedRule } from '../../types/index.js';
import { getImageDestinations, hasOverlap } from '../token/helpers.js';
import type { ScopeRule, ScopeRuleContext } from '../types.js';

function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot === -1 ? '' : filePath.substring(lastDot + 1).toLowerCase();
}

// `ctx.segments` is a single synthetic `scope: 'all'` segment (see
// `wholeFileSegment` in core/runner.ts) exactly when the rule is unscoped
// (the default) — `extractScopes` itself never emits a segment with that
// scope name, so this check is an unambiguous whole-file-vs-scoped
// discriminator, matching the convention documented for scope rules in
// rules/CONTRIBUTING.md ("Unscoped rules (`scope: all`, the default):
// `ctx.segments` is a single whole-file segment with `scope: 'all'`").
function isWholeFile(segments: ScopedSegment[]): boolean {
  return segments.length === 1 && segments[0].scope === 'all';
}

const execute = async (
  rule: NormalizedRule,
  file: string,
  ctx: ScopeRuleContext
): Promise<Problem[]> => {
  const problems: Problem[] = [];
  const options = rule.assertions['max-image-size'] as MaxImageSizeAssertion;

  const maxSizeKB = options?.maxSizeKB ?? 100;
  const allowedExtensions = new Set(
    options?.extensions ?? ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  );
  const maxSizeBytes = maxSizeKB * 1024;

  // Reference-style destinations (`![alt][ref]`) resolve against
  // definitions anywhere in the document, so resolution always runs over
  // the whole tree; only the resulting image tokens are scope-filtered
  // below, matching how every other scope rule narrows to `ctx.segments`
  // without re-deriving cross-references itself.
  const wholeFile = isWholeFile(ctx.segments);
  const images = getImageDestinations(ctx.tree).filter(
    ({ token }) => wholeFile || ctx.segments.some((segment) => hasOverlap(segment, token))
  );

  // newLineRe (never a bare '\n'): these lines feed Problem.text, and a
  // '\n' split of CRLF content would leave a trailing '\r' on each one.
  const lines = ctx.content.split(newLineRe);

  for (const { token, destination } of images) {
    if (destination.startsWith('http://') || destination.startsWith('https://')) {
      continue;
    }

    const extension = getFileExtension(destination);
    if (!allowedExtensions.has(extension)) {
      continue;
    }

    const imageMetadata = ctx.fileMetadata?.images?.get(destination);

    if (!imageMetadata) {
      continue;
    }

    if (!imageMetadata.exists) {
      continue;
    }

    if (imageMetadata.size > maxSizeBytes) {
      const actualSizeKB = Math.round(imageMetadata.size / 1024);
      problems.push({
        file,
        line: token.startLine,
        column: token.startColumn,
        text: lines[token.startLine - 1] || '',
        match: token.text,
        ruleName: rule.name,
        severity: rule.severity,
        message: (rule.message ?? '').replace(
          '%s',
          `${destination} (${actualSizeKB}KB > ${maxSizeKB}KB)`
        ),
      });
    }
  }

  return problems;
};

export const maxImageSize: ScopeRule = { id: 'max-image-size', fixable: false, execute };
