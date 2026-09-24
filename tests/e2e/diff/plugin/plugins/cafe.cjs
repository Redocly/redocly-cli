// Clients of the cafe route operations by their tags, so removing one is a breaking change.
function TagRemoved() {
  return {
    Operation(change, { report }) {
      if (change.kind !== 'modified' || change.property !== 'tags') return;
      const after = change.revision.value ?? [];
      const removed = (change.base.value ?? []).filter((tag) => !after.includes(tag));
      if (removed.length) report({ message: `Tags removed: ${removed.join(', ')}.` });
    },
  };
}

module.exports = function cafePlugin() {
  return {
    id: 'cafe',
    diff: { oas3: { 'tag-removed': TagRemoved } },
  };
};
