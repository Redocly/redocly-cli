export default function SortEnumsAlphabetically() {
  console.log('re-ordering enums: alphabetical');
  return {
    Schema: {
      leave(target) {
        if (target.enum) {
          target.enum.sort();
        }
      },
    },
  };
}
