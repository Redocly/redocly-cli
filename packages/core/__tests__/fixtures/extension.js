const { listOf } = require('../../types');

/** @type {import('../../config/types').TypesExtension} */
function oas3_0(types) {
  return {
    ...types,
    XWebHooks: {
      properties: {
        parameters: listOf('Parameter'),
      },
    },
    DefinitionRoot: {
      ...types.DefinitionRoot,
      properties: {
        ...types.DefinitionRoot.properties,
        'x-webhooks': 'XWebHooks',
      },
    },
  };
}

module.exports = {
  oas3_0: oas3_0,
};
