// A minimal custom-generator fixture loaded by specifier in resolve.test.ts and the plugin e2e.
import type { CustomGenerator } from '../../types.js';

const generator: CustomGenerator = {
  name: 'route-map',
  requires: ['sdk'],
  run({ model, outputPath }) {
    const routes = model.services
      .flatMap((s) => s.operations)
      .map((op) => `  ${op.name}: '${op.method.toUpperCase()} ${op.path}',`)
      .join('\n');
    return [
      {
        path: outputPath.replace(/\.ts$/, '.routes.ts'),
        content: `export const routes = {\n${routes}\n} as const;\n`,
      },
    ];
  },
};

export default generator;
