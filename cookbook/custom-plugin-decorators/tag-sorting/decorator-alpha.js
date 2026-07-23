export default function SortTagsAlphabetically() {
  console.log('re-ordering tags: alphabetical');
  return {
    TagList: {
      leave(target) {
        target.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
      },
    },
  };
}
