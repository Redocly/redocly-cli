const defaultConfig = require('./jest.config.js');

module.exports = {
  ...defaultConfig,
  testPathIgnorePatterns: ['/node_modules/', '/e2e/__tests__/'],
};
