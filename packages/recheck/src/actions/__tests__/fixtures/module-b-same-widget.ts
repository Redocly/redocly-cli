// Fixture for markdoc-schema.test.ts: defines `widget` exactly like module-a.ts, plus a tag of its own.
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
