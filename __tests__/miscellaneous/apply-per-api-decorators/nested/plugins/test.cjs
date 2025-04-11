const version = require('./decorators/version.cjs');

module.exports = function testPlugin() {
  return {
    id: 'test',
    decorators: {
      oas3: {
        version,
      },
    },
  };
};
