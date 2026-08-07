// The value tree the mock/faker emitters build and render: keeps object structure
// (for intersection merging and `...overrides` spreading) until the final render,
// where indentation is threaded. Deliberately tiny.

import { safeIdent } from './identifier.js';
import { sanitizeCodeString } from './ts-literal.js';

export type MockEntry = { key: string; value: MockValue } | { spread: string };

export type MockValue =
  | { kind: 'object'; entries: MockEntry[] }
  | { kind: 'array'; items: MockValue[] }
  | { kind: 'expr'; text: string }
  /** A textual wrapper around a nested value (`faker.helpers.multiple(() => <v>, …)`). */
  | { kind: 'wrap'; before: string; value: MockValue; after: string };

export const expr = (text: string): MockValue => ({ kind: 'expr', text });
export const objectValue = (entries: MockEntry[]): MockValue => ({ kind: 'object', entries });

export function isObjectValue(value: MockValue): value is Extract<MockValue, { kind: 'object' }> {
  return value.kind === 'object';
}

/** Spread `<name>` into an object value; non-objects pass through unchanged. */
export function spreadInto(value: MockValue, name: string): MockValue {
  if (!isObjectValue(value)) return value;
  return objectValue([...value.entries, { spread: name }]);
}

const INDENT = '    ';

/** Render at `indent` (the containing line's indent): objects/arrays multiline, printer-style. */
export function renderMockValue(value: MockValue, indent: string): string {
  switch (value.kind) {
    case 'expr':
      return value.text;
    case 'wrap':
      return `${value.before}${renderMockValue(value.value, indent)}${value.after}`;
    case 'array': {
      if (value.items.length === 0) return '[]';
      const inner = indent + INDENT;
      const lines = value.items.map(
        (item, index) =>
          `${inner}${renderMockValue(item, inner)}${index === value.items.length - 1 ? '' : ','}`
      );
      return `[\n${lines.join('\n')}\n${indent}]`;
    }
    case 'object': {
      if (value.entries.length === 0) return '{}';
      const inner = indent + INDENT;
      const lines = value.entries.map((entry, index) => {
        const comma = index === value.entries.length - 1 ? '' : ',';
        if ('spread' in entry) return `${inner}...${entry.spread}${comma}`;
        const key = safeIdent(entry.key) === entry.key ? entry.key : sanitizeCodeString(entry.key);
        return `${inner}${key}: ${renderMockValue(entry.value, inner)}${comma}`;
      });
      return `{\n${lines.join('\n')}\n${indent}}`;
    }
  }
}
