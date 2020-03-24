class RegsitryDependencies {
  static get rule() {
    return 'registry-dependencies';
  }

  OpenAPIRoot() {
    return {
      onExit: (_node, _definition, ctx) => {
        const { redoclyClient } = ctx;
        if (process.env.UPDATE_REGISTRY && process.env.REDOCLY_AUTHORIZATION) {
          redoclyClient.updateDependencies(ctx.dependencies, process.env.REDOCLY_AUTHORIZATION);
        }
      },
    };
  }
}

module.exports = RegsitryDependencies;
