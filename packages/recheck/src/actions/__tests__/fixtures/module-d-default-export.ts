// Fixture for markdoc-schema.test.ts: tags as a default export with `tags`.
export default {
  tags: {
    callout: {
      attributes: {
        tone: { type: String, matches: ['info', 'warning'] },
      },
    },
  },
};
