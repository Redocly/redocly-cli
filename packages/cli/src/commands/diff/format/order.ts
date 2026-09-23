import type { JudgedChange } from '@redocly/openapi-core';

// Compared by code unit, the way `Array.prototype.sort` compares strings, so a report lists its
// changes in the same order on every machine; `localeCompare` would follow the locale.
export function byKey(left: JudgedChange, right: JudgedChange): number {
  return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
}
