const operationExtra = () => {
  return {
    Operation: {
      enter: (operation, context) => {
        if (!operation['x-operation-extra']) {
          context.report({
            message: 'Operation must have `x-operation-extra` property',
          });
        }
      },
    },
  };
};

export default function () {
  return {
    id: 'custom',
    rules: {
      oas3: {
        'operation-extra': operationExtra,
      },
    },
  };
}
