const path = require('path');

// Build the project
require('esbuild').build({
  bundle: true,
  outdir: path.resolve(__dirname, './lib'),
  sourcemap: false,
  minify: true,
  entryPoints: {
    index: path.resolve(__dirname, './src/index.ts'),
  },
  platform: 'node',
  format: 'cjs',
  define: { 'import.meta.url': '_importMetaUrl' },
  banner: {
    js: "const _importMetaUrl=require('url').pathToFileURL(__filename)",
  },
  target: 'node18',
  mainFields: ['main', 'module'],
  resolveExtensions: ['.ts', '.js', '.json'],
  outExtension: { '.js': '.js' },
  packages: 'external',
});
