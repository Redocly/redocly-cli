export const id = 'local';

/** @type {import('../src/config/config').CustomRulesConfig} */
export const rules = {
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
};

/** @type {import('../src/config/config').TransformersConfig} */
export const transformers = {
  oas3: {
    'duplicate-description': () => {
      return {
        Info(info) {
          if (info.description) {
            info.description = info.description + '\n' + info.description;
          }
        },
      };
    },
  },
};

export const configs = {
  all: {
    rules: {
      'local/operation-id-not-test': 'error',
      'boolean-parameter-prefixes': 'error',
    },
  },
};
