export default function SortMethods({ order }) {
  console.log('re-ordering methods');
  return {
    PathItem: {
      leave(pathItem) {
        // start with the default ordering, override with config if we have it
        let methodList = ['get', 'post', 'patch', 'put', 'delete'];
        if (order) {
          methodList = order;
        }

        let existingMethods = Object.getOwnPropertyNames(pathItem);

        for (const method of methodList) {
          const operation = pathItem[method];
          // For each defined operation, delete it and re-add it to the path so they will be in the correct order:
          if (operation) {
            // remove it from the methods list so we know we processed it
            existingMethods = existingMethods.filter((x) => x != method);
            delete pathItem[method];
            pathItem[method] = operation;
          }
        }

        // now re-add any methods that weren't in the list
        for (const method of existingMethods) {
          const operation = pathItem[method];
          // Delete and re-add unprocessed operations to the path so they will be in the correct order:
          if (operation) {
            delete pathItem[method];
            pathItem[method] = operation;
          }
        }
      },
    },
  };
}
