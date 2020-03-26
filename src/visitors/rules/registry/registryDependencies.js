const RedoclyClient = require('../../../redocly').default;
const { isFullyQualifiedUrl } = require('../../../utils');

class RegsitryDependencies {
  static get rule() {
    return 'registry-dependencies';
  }

  OpenAPIRoot() {
    return {
      onEnter: async (_node, _definition, ctx) => {
        this.redoclyClient = new RedoclyClient();
        if (this.redoclyClient.hasToken()) {
          ctx.headers = [...ctx.headers, {
            matches: `https://api.${process.env.REDOCLY_DOMAIN || 'redoc.ly'}/registry/**`,
            name: 'Authorization',
            value: (this.redoclyClient && await this.redoclyClient.getAuthorizationHeader()) || '',
          }];
        }
      },
      onExit: async (_node, _definition, ctx) => {
        if (process.env.UPDATE_REGISTRY && this.redoclyClient.hasToken()) {
          await this.redoclyClient.updateDependencies(ctx.registryDependencies);
        }
      },
    };
  }

  any() {
    return {
      onEnter: (_node, _definition, ctx, unresolvedNode) => {
        if (unresolvedNode.$ref) {
          const link = unresolvedNode.$ref.split('#/')[0];
          if (isFullyQualifiedUrl(link) && RedoclyClient.isRegistryURL(link)) {
            ctx.registryDependencies.push(link);
          }
        }
      },
    };
  }
}

module.exports = RegsitryDependencies;
