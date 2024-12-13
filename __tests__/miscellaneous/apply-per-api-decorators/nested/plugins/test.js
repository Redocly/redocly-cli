const version = require('./decorators/version.js');

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
