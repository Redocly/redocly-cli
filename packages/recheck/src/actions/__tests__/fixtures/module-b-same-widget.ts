// Fixture for markdoc-schema.test.ts: shares `widget` with module-a.ts,
// defined IDENTICALLY -- exercises the merge's identical-duplicate tolerance
// (case 2), alongside a tag of its own no other fixture defines.
export const tags = {
  widget: {
    selfClosing: true,
    attributes: {
      id: { type: String, required: true },
      variant: { type: String, matches: ['small', 'large'] },
    },
  },
  onlyInB: {
    attributes: {
      count: { type: Boolean },
    },
  },
};
