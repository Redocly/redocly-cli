const ResolveX = require('./resolve-x.decorator');
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
