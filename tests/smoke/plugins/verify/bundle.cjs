const path = require('node:path');

const { rspack } = require('@rspack/core');

rspack(
  {
    context: __dirname,
    entry: './consumer.mjs',
    target: 'node',
    mode: 'production',
    optimization: { minimize: false },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'consumer.cjs',
      library: { type: 'commonjs2' },
    },
  },
  (error, stats) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    console.log(stats.toString({ all: false, errors: true, warnings: true, timings: true }));

    if (stats.hasErrors()) {
      process.exit(1);
    }

    const { warnings } = stats.toJson({ all: false, warnings: true });
    const criticalDependencies = warnings.filter((warning) =>
      warning.message.includes('Critical dependency')
    );

    if (criticalDependencies.length) {
      console.error(
        'The plugin loader was rewritten by the bundler. Plugins will not load for consumers that bundle openapi-core.'
      );
      process.exit(1);
    }
  }
);
