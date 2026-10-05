import * as path from 'path';
import picomatch from 'picomatch';

import { inlineCodeRanges } from '../core/inline-code.js';
import type { ScopedSegment, TextRange } from '../scopes/types.js';
import type { NormalizedRule } from '../types/index.js';

/**
 * Ranges of `segment.content` that prose rules must not match inside: inline code spans and
 * masked markdoc tag spans. Matches that overlap them are discarded instead of scanning a
 * blanked-out copy, because a user regex would read a blanked tag as whitespace and could
 * match across it. `includeCode` turns off the inline code part.
 */
export function nonProseRanges(segment: ScopedSegment, includeCode?: boolean): TextRange[] {
  const code = includeCode ? [] : inlineCodeRanges(segment.content);
  const masked = segment.maskedRanges;
  if (masked === undefined || masked.length === 0) return code;
  return code.length === 0 ? masked : [...code, ...masked];
}

/** Checks if a file matches a pattern, trying the basename, the relative path and path suffixes. */
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
