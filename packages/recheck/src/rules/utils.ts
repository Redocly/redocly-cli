import * as path from 'path';
import picomatch from 'picomatch';

import { inlineCodeRanges } from '../core/inline-code.js';
import type { ScopedSegment, TextRange } from '../scopes/types.js';
import type { NormalizedRule } from '../types/index.js';

/**
 * Every span of `segment.content` a prose rule must not match inside: the
 * segment's inline code spans, plus the markdoc tag spans masking blanked out
 * of it.
 *
 * Both are text that is present in the source but isn't prose, and both have to
 * be excluded the same way — by discarding a match that overlaps them, never by
 * scanning a substitute string. These rules run an arbitrary user-supplied
 * regex, and a masked run is still characters to it: a blanked tag reads as
 * whitespace to `\s+` and as ordinary content to any negated class, either of
 * which lets one match span a tag and merge the real text on both sides of it.
 * A swap pair `alpha\s+beta` matched clean across `alpha {% partial /%} beta`,
 * and `--fix` then collapsed the tag out of the document.
 *
 * One helper rather than a call per rule, so a rule added later inherits the
 * full exclusion set by asking for it instead of re-deriving half of it.
 * `includeCode` turns the code-span half off; the markdoc half has no opt-out,
 * because a tag is markup, never the prose a rule was pointed at.
 */
export function nonProseRanges(segment: ScopedSegment, includeCode?: boolean): TextRange[] {
  const code = includeCode ? [] : inlineCodeRanges(segment.content);
  const masked = segment.maskedRanges;
  if (masked === undefined || masked.length === 0) return code;
  return code.length === 0 ? masked : [...code, ...masked];
}

/**
 * Check if a file matches a pattern using multiple strategies
 */
function matchesFilePattern(pattern: string, basename: string, normalizedPath: string): boolean {
  // Try basename match first (for simple patterns like "*.md")
  if (picomatch.isMatch(basename, pattern)) return true;

  // Try full relative path match
  if (picomatch.isMatch(normalizedPath, pattern)) return true;

  // Try matching path segments for patterns like "docs/**" or "**/config/*.md"
  const pathParts = normalizedPath.split('/');
  for (let i = 0; i < pathParts.length; i++) {
    const suffix = pathParts.slice(i).join('/');
    if (picomatch.isMatch(suffix, pattern)) return true;
  }

  return false;
}

/** Whether `file` matches any pattern, with the same semantics as `exceptions.files`. */
export function fileMatchesAnyPattern(file: string, patterns: string[]): boolean {
  const basename = path.basename(file);
  const normalizedPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
  return patterns.some((pattern) => matchesFilePattern(pattern, basename, normalizedPath));
}

export function shouldProcessFile(file: string, rule: NormalizedRule): boolean {
  const basename = path.basename(file);
  const relativePath = path.relative(process.cwd(), file);
  const normalizedPath = relativePath.replace(/\\/g, '/');

  // Check excludes with full path support
  if (
    rule.excludes &&
    rule.excludes.some((pattern) => matchesFilePattern(pattern, basename, normalizedPath))
  ) {
    return false;
  }

  // Check appliesTo with full path support
  if (
    rule.appliesTo &&
    !rule.appliesTo.some((pattern) => matchesFilePattern(pattern, basename, normalizedPath))
  ) {
    return false;
  }

  // Check file exceptions
  if (rule.exceptions?.files) {
    for (const pattern of rule.exceptions.files) {
      if (matchesFilePattern(pattern, basename, normalizedPath)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a line should be excluded based on line exceptions.
 * Returns true if the line should be skipped.
 */
export function shouldSkipLine(lineContent: string, rule: NormalizedRule): boolean {
  if (!rule.exceptions?.lines) {
    return false;
  }

  // Check if any exception pattern matches the line content (fragment matching)
  return rule.exceptions.lines.some((exceptionPattern) => lineContent.includes(exceptionPattern));
}
