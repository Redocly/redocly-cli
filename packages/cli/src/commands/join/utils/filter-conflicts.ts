export function filterConflicts(entities: object) {
  return Object.entries(entities).filter(([_, files]) => files.length > 1);
}
