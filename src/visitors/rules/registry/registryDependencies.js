const RedoclyClient = require('../../../redocly').default;
const { isFullyQualifiedUrl } = require('../../../utils');

class RegsitryDependencies {
  static get rule() {
    return 'registry-dependencies';
  }

  OpenAPIRoot() {
    return {
      onExit: async (_node, _definition, ctx) => {
        const { redoclyClient } = ctx;
        if (process.env.UPDATE_REGISTRY) {
          await redoclyClient.updateDependencies(ctx.dependencies);
        }
      },
    };
  }

  any() {
    return {
      onEnter: (_node, _definition, ctx, unresolvedNode) => {
        if (unresolvedNode.$ref) {
          const link = unresolvedNode.$ref.split('/#')[0];
          const linkSplitted = link.split('#/');
          if (linkSplitted[0] === '') linkSplitted[0] = ctx.filePath;
          if (isFullyQualifiedUrl(linkSplitted[0])) {
            if (RedoclyClient.isRegistryURL(link, ctx)) {
              ctx.dependencies.push(link);
            }
          }
        }
      },
    };
  }
}

module.exports = RegsitryDependencies;
