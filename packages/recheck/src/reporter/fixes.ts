import { cyan, green } from 'colorette';

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

export function reportFixes(fixes: Fix[]): void {
  // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
  console.log(cyan('\n🔧 Auto-fix Summary:'));

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
    // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
    console.log(`\n   ${file}:`);
    for (const fix of fileFixes) {
      // oxlint-disable-next-line eslint/no-console -- reporter/config console output predates this relocation; Task 3 removes these entirely (see task-1-report.md), so this is a temporary suppression, not a permanent exception.
      console.log(green(`     ✓ Line ${fix.lineNumber} (${fix.ruleName}): ${describeFix(fix)}`));
    }
  }
}
