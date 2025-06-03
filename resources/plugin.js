const p = () => {
  return [
    {
      id: 'plugin1',
      rules: {
        oas3: {
          'operation-id-not-test': () => {
            return {
              Operation(operation, { report, location }) {
                if (operation.operationId === 'test') {
                  report({
                    message: `operationId must be not "test"`,
                    location: location.child('operationId'),
                  });
                }
              },
            };
          },
        },
      },
    },
    {
      id: 'plugin2',
      rules: {
        oas3: {
          'operation-id-not-test': () => {
            return {
              Operation(operation, { report, location }) {
                if (operation.operationId === 'test') {
                  report({
                    message: `operationId must be not "test"`,
                    location: location.child('operationId'),
                  });
                }
              },
            };
          },
        },
      },
    },
  ];
};

export default p;