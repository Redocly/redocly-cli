import { cyan, green } from 'colorette';

import type { Logger } from '../actions/logger.js';
import type { Fix } from '../types/index.js';

/**
 * Builds a human-readable description of a fix from its edit fields, since the
 * Fix model carries insertText/deleteCount rather than a precomputed description.
 */
function describeFix(fix: Fix): string {
  if (fix.deleteCount === -1) {
    return fix.insertText === undefined ? 'removed line' : `replaced line with "${fix.insertText}"`;
  }

  const deleteCount = fix.deleteCount ?? 0;
  const insertText = fix.insertText ?? '';

  if (deleteCount > 0 && insertText) {
    return `replaced ${deleteCount} character(s) with "${insertText}"`;
  }
  if (deleteCount > 0) {
    return `removed ${deleteCount} character(s)`;
  }
  if (insertText) {
    return `inserted "${insertText}"`;
  }
  return 'applied fix';
}

export function reportFixes(fixes: Fix[], logger: Logger): void {
  logger.log(cyan('\n🔧 Auto-fix Summary:'));

  // Group fixes by file
  const fixesByFile: Record<string, Fix[]> = {};
  for (const fix of fixes) {
    if (!fixesByFile[fix.file]) {
      fixesByFile[fix.file] = [];
    }
    fixesByFile[fix.file].push(fix);
  }

  // Report fixes by file
  for (const [file, fileFixes] of Object.entries(fixesByFile)) {
    logger.log(`\n   ${file}:`);
    for (const fix of fileFixes) {
      logger.log(green(`     ✓ Line ${fix.lineNumber} (${fix.ruleName}): ${describeFix(fix)}`));
    }
  }
}
