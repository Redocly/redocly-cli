const path = require('path');

/** @type {import('../../../packages/core/src/config/config').PreprocessorsConfig} */
const preprocessors = {
  oas3: {
    'conventional-response': (config) => {
      return {
        async Operation(operation, ctx) {
          const codes = {};
          for (const i in config.codes) {
            codes[i] = { $ref: path.join(__dirname, config.codes[i]) };
          }
          operation.responses = { ...codes, ...operation.responses };
        },
      };
    },
  },
};

module.exports = {
  id: 'plugin',
  preprocessors,
};
