class RegsitryDependencies {
  static get rule() {
    return 'registry-dependencies';
  }

  OpenAPIRoot() {
    return {
      onExit: (_node, _definition, ctx) => {
        console.log('will update dependencies');
        const { redoclyClient, registrySettings } = ctx;
        console.log(ctx.dependencies);

        console.log(registrySettings);
        console.log('flflf');
        console.log(process.env.REDOCLY_AUTHORIZATION);
        if (process.env.REDOCLY_AUTHORIZATION) {
          redoclyClient.updateDependencies(ctx.dependencies, process.env.REDOCLY_AUTHORIZATION);
        }
      },
    };
  }
}

module.exports = RegsitryDependencies;
