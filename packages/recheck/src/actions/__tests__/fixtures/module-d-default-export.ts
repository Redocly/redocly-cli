// Fixture for markdoc-schema.test.ts: the same tag map as a default-exported
// config object carrying `tags`, the shape the real project schema modules use.
export default {
  tags: {
    callout: {
      attributes: {
        tone: { type: String, matches: ['info', 'warning'] },
      },
    },
  },
};
