import SortTagsAlphabetically from './decorator-alpha.js';

export default function tagSortingPlugin() {
  return {
    id: 'tag-sorting',
    decorators: {
      oas3: {
        alphabetical: SortTagsAlphabetically,
      },
    },
  };
}
