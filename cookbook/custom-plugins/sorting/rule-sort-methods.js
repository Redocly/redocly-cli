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
        const methods = Object.getOwnPropertyNames(pathItem).filter((method) =>
          methodOrder.includes(method)
        );
        const expectedOrder = methodOrder.filter((item) => methods.includes(item));

        let i = 0;
        while (i < expectedOrder.length) {
          // each method present must be in the expected order
          if (methods[i] !== expectedOrder[i]) {
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
