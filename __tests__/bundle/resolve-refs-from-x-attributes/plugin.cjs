const ResolveX = require('./resolve-x.decorator.cjs');
const id = 'plugin';

const decorators = {
  oas3: {
    'resolve-x': ResolveX,
  },
};

module.exports = {
  id,
  decorators,
};
