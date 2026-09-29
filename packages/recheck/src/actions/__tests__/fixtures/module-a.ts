// Fixture for markdoc-schema.test.ts: custom Markdoc tags in the real Markdoc `Config['tags']` shape.
export const tags = {
  widget: {
    selfClosing: true,
    attributes: {
      id: { type: String, required: true },
      variant: { type: String, matches: ['small', 'large'] },
    },
  },
  onlyInA: {
    attributes: {
      flag: { type: Boolean },
    },
  },
};
