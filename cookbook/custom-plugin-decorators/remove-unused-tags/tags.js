export default function plugin() {
  return {
    id: 'tags',
    decorators: {
      oas3: {
        'no-unused-tags': ({ ignore }) => {
          console.log('Cleaning up unused tags...');
          // mark the ignored tags as already used so we don't remove them
          const usedTags = new Set(ignore?.map((tag) => tag.toLowerCase()));
          return {
            Operation: {
              enter(operation) {
                // log all the tags that are in use
                for (const tag of operation.tags || []) {
                  usedTags.add(tag.toLowerCase());
                }
              },
            },
            Root: {
              leave(root) {
                // remove any tags that we didn't find in use or marked to ignore
                root.tags = (root.tags || []).filter((tag) => usedTags.has(tag.name.toLowerCase()));
                return root;
              },
            },
          };
        },
      },
    },
  };
}
