/** The items of `list` that `other` does not have. */
export function itemsNotIn(list: unknown, other: unknown): unknown[] {
  if (!Array.isArray(list)) return [];
  const otherItems = Array.isArray(other) ? other : [];
  return list.filter((item) => !otherItems.includes(item));
}
