import { logger } from '@redocly/openapi-core';
import type { Fix } from '@redocly/recheck';
import { cyan, green } from 'colorette';

// Describes a fix in words, built from its insert text and delete count.
// The text is quoted as JSON, so a line break prints as `\n`, not as a new line.
function describeFix(fix: Fix): string {
  if (fix.deleteCount === -1) {
    return fix.insertText === undefined
      ? 'removed line'
      : `replaced line with ${JSON.stringify(fix.insertText)}`;
  }

  const deleteCount = fix.deleteCount ?? 0;
  const insertText = fix.insertText ?? '';

  if (deleteCount > 0 && insertText) {
    return `replaced ${deleteCount} character(s) with ${JSON.stringify(insertText)}`;
  }
  if (deleteCount > 0) {
    return `removed ${deleteCount} character(s)`;
  }
  if (insertText) {
    return `inserted ${JSON.stringify(insertText)}`;
  }
  return 'applied fix';
}

export function reportFixes(fixes: Fix[]): void {
  logger.info(`${cyan('\n🔧 Auto-fix Summary:')}\n`);

  const fixesByFile: Record<string, Fix[]> = {};
  for (const fix of fixes) {
    if (!fixesByFile[fix.file]) {
      fixesByFile[fix.file] = [];
    }
    fixesByFile[fix.file].push(fix);
  }

  for (const [file, fileFixes] of Object.entries(fixesByFile)) {
    logger.info(`\n   ${file}:\n`);
    for (const fix of fileFixes) {
      logger.info(
        `${green(`     ✓ Line ${fix.lineNumber} (${fix.ruleName}): ${describeFix(fix)}`)}\n`
      );
    }
  }
}
