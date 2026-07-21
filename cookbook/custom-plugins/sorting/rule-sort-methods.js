export default function RuleSortMethods({ order }) {
  console.log('check method order');
  return {
    PathItem: {
      enter(pathItem, ctx) {
        // default method sort order, can be changed with an "order" param in config
        let methodOrder = ['post', 'patch', 'put', 'get', 'delete'];
        if (order) {
          methodOrder = order;
        }

        // Identify the methods that are present and put them in order
        const methods = Object.getOwnPropertyNames(pathItem);
        const expectedOrder = methodOrder.filter((item) => methods.includes(item));

        i = 0;
        while (i < expectedOrder.length) {
          // if this method is in the array, it must be in the expected order
          if (expectedOrder.includes(methods[i]) && methods[i] !== expectedOrder[i]) {
            ctx.report({
              message: `Unexpected method order, expected ${expectedOrder[i]} but found ${methods[i]}`,
            });
          }
          i++;
        }
      },
    },
  };
}
