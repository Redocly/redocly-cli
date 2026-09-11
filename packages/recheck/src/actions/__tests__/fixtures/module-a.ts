// Fixture for markdoc-schema.test.ts: a project's own custom Markdoc tags,
// in real Markdoc `Config['tags']` shape (String/Boolean constructors, a
// `matches` array) so extractStatics's real conversion path runs, not a
// hand-typed stand-in.
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
