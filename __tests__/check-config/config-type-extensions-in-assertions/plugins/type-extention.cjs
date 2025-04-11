const XMetaData = {
  properties: {
    lifecycle: { type: 'string', enum: ['development', 'staging', 'production'] },
    'owner-team': { type: 'string' },
  },
  required: ['lifecycle'],
};

module.exports = function typeExtensionPlugin() {
  return {
    id: 'type-extension',
    typeExtension: {
      oas3(types) {
        newTypes = {
          ...types,
          XMetaData: XMetaData,
          Info: {
            ...types.Info,
            properties: {
              ...types.Info.properties,
              'x-metadata': 'XMetaData',
            },
          },
        };
        return newTypes;
      },
    },
  };
};
