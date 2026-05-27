var helper = require('./plugin-with-deps-helper.cjs');
var pkg = require('./node_modules/fake-pkg/index.cjs');

module.exports = function pluginWithDeps() {
  return {
    id: 'test-plugin-with-deps',
    helperId: helper.id,
    pkgId: pkg.id,
  };
};
