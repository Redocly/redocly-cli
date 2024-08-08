const XMetaData = {
  properties: {
    lifecycle: { type: 'string', enum: ['development', 'staging', 'production'] },
    'owner-team': { type: 'string' },
  },
  required: ['lifecycle'],
};

module.exports = {
  id: 'type-extension',
  typeExtension: {
    arazzo(types) {
      newTypes = {
        ...types,
        XMetaData: XMetaData,
        Info: {
          ...types['Info'],
          properties: {
            ...types['Info'].properties,
            metadata: 'XMetaData',
          },
        },
      };

      return newTypes;
    },
  },
};
