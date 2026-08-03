// A custom generator loaded by path specifier in the plugin e2e. Plain ESM (no imports) so the
// compiled CLI can import it under bare `node`. Emits a `<output>.routes.ts` map of every operation.
export default {
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
