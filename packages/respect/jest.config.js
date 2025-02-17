const defaultConfig = require('../../jest.config.js');

module.exports = {
  ...defaultConfig,
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: './tsconfig.json',
      },
    ],
  },
};
