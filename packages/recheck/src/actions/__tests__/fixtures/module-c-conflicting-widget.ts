// Fixture for markdoc-schema.test.ts: defines `widget` differently from module-a.ts (`id` is optional here).
export const tags = {
  widget: {
    selfClosing: true,
    attributes: {
      id: { type: String },
      variant: { type: String, matches: ['small', 'large'] },
    },
  },
};
