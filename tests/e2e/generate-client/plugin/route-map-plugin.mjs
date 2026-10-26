// A custom generator loaded by path specifier in the plugin e2e. Plain ESM (no imports) so the
// compiled CLI can import it under bare `node`. Emits a `<output>.routes.ts` map of every operation.
export default {
  name: 'route-map',
  requires: ['typescript'],
  // Declared options: the config block is validated against this before `run`.
  options: {
    type: 'object',
    properties: { exportName: { type: 'string', default: 'routes' } },
    additionalProperties: false,
  },
  run({ model, output, options }) {
    const routes = model.services
      .flatMap((s) => s.operations)
      .map((op) => `  ${op.name}: '${op.method.toUpperCase()} ${op.path}',`)
      .join('\n');
    return [
      {
        path: output.path.replace(/\.ts$/, '.routes.ts'),
        content: `export const ${options.exportName} = {\n${routes}\n} as const;\n`,
      },
    ];
  },
};
