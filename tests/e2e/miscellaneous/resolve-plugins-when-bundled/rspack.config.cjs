const path = require('node:path');

module.exports = {
  entry: './consumer.mjs',
  target: 'node',
  mode: 'production',
  output: { path: path.join(__dirname, 'output'), filename: 'consumer.cjs' },
};
