import type { JudgedChange } from '@redocly/openapi-core';

// Compared by code unit, the way `Array.prototype.sort` compares strings, so a report lists its
// changes in the same order on every machine; `localeCompare` would follow the locale.
function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function propertyOf(change: JudgedChange): string {
  return change.kind === 'modified' ? change.property : '';
}

export function byKeyAndProperty(left: JudgedChange, right: JudgedChange): number {
  return compare(left.key, right.key) || compare(propertyOf(left), propertyOf(right));
}
