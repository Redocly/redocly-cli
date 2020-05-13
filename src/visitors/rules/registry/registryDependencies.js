const RedoclyClient = require('../../../redocly').default;
const { isFullyQualifiedUrl } = require('../../../utils');

class RegsitryDependencies {
  static get rule() {
    return 'registry-dependencies';
  }

  async OpenAPIRoot(_node, _definition, ctx) {
    this.redoclyClient = new RedoclyClient();
    if (this.redoclyClient.hasToken()) {
      ctx.headers = [...ctx.headers, {
        matches: `https://api.${process.env.REDOCLY_DOMAIN || 'redoc.ly'}/registry/**`,
        name: 'Authorization',
        value: (this.redoclyClient && await this.redoclyClient.getAuthorizationHeader()) || '',
      }];
    }
  }

  async OpenAPIRoot_exit(_node, _definition, ctx) {
    if (process.env.UPDATE_REGISTRY && this.redoclyClient.hasToken()) {
      await this.redoclyClient.updateDependencies(ctx.registryDependencies);
    }
  }

  enter(_node, _definition, ctx, unresolvedNode) {
    if (unresolvedNode.$ref) {
      const link = unresolvedNode.$ref.split('#/')[0];
      if (isFullyQualifiedUrl(link) && RedoclyClient.isRegistryURL(link)) {
        ctx.registryDependencies.push(link);
      }
    }
  }
}

module.exports = RegsitryDependencies;
