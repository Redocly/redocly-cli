// Fixture for markdoc-schema.test.ts: shares `widget` with module-a.ts, but
// `id` is optional here where module-a.ts requires it -- exercises the
// merge's genuine-conflict rejection (case 3).
export const tags = {
  widget: {
    selfClosing: true,
    attributes: {
      id: { type: String },
      variant: { type: String, matches: ['small', 'large'] },
    },
  },
};
