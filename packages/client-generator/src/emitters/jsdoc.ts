import type { SchemaMetadata } from '../ir/model.js';
import { splitLines } from './support.js';

/**
 * The JSDoc body for a description + metadata as a single `\n`-joined string,
 * or `undefined` when there's nothing to document. The AST emitters feed this
 * to `ts.ts`'s `jsdoc` helper (which owns the `*`-prefixing and indentation),
 * so this returns only the raw body — no comment delimiters, no padding.
 */
export function jsdocText(text: string | undefined, metadata?: SchemaMetadata): string | undefined {
  const lines = jsdocLines(text, metadata);
  return lines.length === 0 ? undefined : lines.join('\n');
}

/**
 * Build the body of a JSDoc block from a description and an optional metadata
 * bag. Description lines come first (trimmed of leading/trailing blanks); then
 * the metadata tag lines in a stable, source-driven order.
 *
 * Returns `[]` when there's nothing to render — callers use the empty result
 * to skip emitting any JSDoc at all.
 */
function jsdocLines(text: string | undefined, metadata: SchemaMetadata | undefined): string[] {
  const lines: string[] = [];
  if (text && text.trim()) {
    lines.push(...trimLines(splitLines(text)));
  }
  if (metadata) {
    lines.push(...formatMetadata(metadata));
  }
  return lines;
}

/**
 * Project a SchemaMetadata bag into JSDoc tag lines.
 *
 * Order matches the (near-)spec order so generated output is deterministic and
 * diff-stable. `pattern` is escaped so an embedded `*​/` cannot terminate the
 * surrounding JSDoc block.
 */
function formatMetadata(metadata: SchemaMetadata): string[] {
  const lines: string[] = [];
  const push = (tag: string, value?: number | string | boolean): void => {
    if (value === undefined) {
      lines.push(`@${tag}`);
    } else {
      lines.push(`@${tag} ${value}`);
    }
  };
  if (metadata.minimum !== undefined) push('minimum', metadata.minimum);
  if (metadata.maximum !== undefined) push('maximum', metadata.maximum);
  if (metadata.exclusiveMinimum !== undefined) push('exclusiveMinimum', metadata.exclusiveMinimum);
  if (metadata.exclusiveMaximum !== undefined) push('exclusiveMaximum', metadata.exclusiveMaximum);
  if (metadata.minLength !== undefined) push('minLength', metadata.minLength);
  if (metadata.maxLength !== undefined) push('maxLength', metadata.maxLength);
  if (metadata.pattern !== undefined) push('pattern', escapeForJsDoc(metadata.pattern));
  if (metadata.minItems !== undefined) push('minItems', metadata.minItems);
  if (metadata.maxItems !== undefined) push('maxItems', metadata.maxItems);
  if (metadata.uniqueItems === true) push('uniqueItems');
  if (metadata.format !== undefined) push('format', metadata.format);
  if (metadata.deprecated === true) push('deprecated');
  return lines;
}

/**
 * Escape any sequence that would prematurely close a JSDoc block. Currently we
 * only need to handle `*​/` — newlines are stripped further upstream because
 * spec-supplied strings (`pattern`, `format`) are single-line by construction.
 */
function escapeForJsDoc(value: string): string {
  return value.replace(/\*\//g, '*\\/');
}

function trimLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start] === '') start++;
  while (end > start && lines[end - 1] === '') end--;
  return lines.slice(start, end);
}
