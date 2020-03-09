class RegsitryDependencies {
  static get rule() {
    return 'regostry-dependencies';
  }

  OpenAPIRoot() {
    return {
      onExit: (_node, _definition, ctx) => {
        if (ctx.dependencies.length) {
          const { redoclyClient, registrySettings } = ctx;
          const dependencies = ctx.dependencies
            .map(
              (dependency) => dependency
                .replace('https://', '')
                .replace('http://', '')
                .replace('api.redoc.ly/registry/', '')
                .split('/'),
            ).map((dependencyArray) => ({
              organization: dependencyArray[0],
              definition: dependencyArray[1],
              version: dependencyArray[2],
              branch: dependencyArray[4],
              build: dependencyArray[5],
            }));

          // console.log(registrySettings);
          if (redoclyClient.isLoggedIn()) {
            redoclyClient.updateDependencies(dependencies, registrySettings);
          }
        }
      },
    };
  }
}

module.exports = RegsitryDependencies;
