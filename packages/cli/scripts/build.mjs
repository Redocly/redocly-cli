import { build } from 'esbuild';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

rmSync(path.join(packageDir, 'lib'), { recursive: true, force: true });

const result = await build({
  absWorkingDir: packageDir,
  entryPoints: ['src/index.ts', 'src/api.ts'],
  outdir: 'lib',
  chunkNames: 'chunks/[hash]',
  bundle: true,
  splitting: true,
  platform: 'node',
  format: 'esm',
  target: 'node20.19',
  minify: true,
  keepNames: false,
  metafile: true,
  define: {
    'process.env.REDOCLY_CLI_BUILD_ENV': JSON.stringify(process.env.BUILD_ENV ?? 'development'),
  },
  // Avoid errors when external dependencies use CJS syntax.
  banner: {
    js: [
      "import { createRequire as __redoclyCliCreateRequire } from 'node:module';",
      "import { fileURLToPath as __redoclyCliFileURLToPath } from 'node:url';",
      "import { dirname as __redoclyCliPathDirname } from 'node:path';",
      'const require = __redoclyCliCreateRequire(import.meta.url);',
      'var __filename = __redoclyCliFileURLToPath(import.meta.url);',
      'var __dirname = __redoclyCliPathDirname(__filename);',
    ].join('\n'),
  },
  logLevel: 'info',
});

const entryChunkInputs = Object.keys(result.metafile.outputs['lib/index.js']?.inputs ?? {});
if (entryChunkInputs.some((inputPath) => inputPath.includes('node_modules/redoc'))) {
  throw new Error(
    'redoc leaked into lib/index.js — check for stray static imports in build-docs commands'
  );
}

emitDeclarations(['src/api.ts', 'src/reunite/api/types.ts']);

const allInputs = Object.values(result.metafile.outputs).flatMap((chunk) =>
  Object.keys(chunk.inputs)
);

const seenPkgRoots = new Set();
const licenseGroups = new Map();

for (const relInput of allInputs) {
  const absInput = path.resolve(packageDir, relInput).replace(/\\/g, '/');
  const pkgRootMatch = absInput.match(/^(.*\/node_modules\/(?:@[^/]+\/)?[^/]+)/);
  if (!pkgRootMatch) continue;
  const pkgRoot = pkgRootMatch[1];
  if (seenPkgRoots.has(pkgRoot)) continue;
  seenPkgRoots.add(pkgRoot);

  const pkgJsonPath = path.join(pkgRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) continue;

  const name = pkgRoot.replace(/^.*\/node_modules\//, '');
  const { version, license } = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
  const spdx = license ?? 'unknown';
  const licenseText = findLicenseText(pkgRoot);
  const copyrightLine = licenseText?.match(/Copyright.+/i)?.[0]?.trim();

  if (!licenseGroups.has(spdx)) {
    licenseGroups.set(spdx, { text: licenseText, packages: [] });
  }
  const entry = copyrightLine ? `${name}@${version} — ${copyrightLine}` : `${name}@${version}`;
  licenseGroups.get(spdx).packages.push(entry);
}

const sections = [...licenseGroups.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([spdx, { text, packages }]) => {
    const packageList = packages
      .sort()
      .map((pkg) => `  ${pkg}`)
      .join('\n');
    const licenseBody = text ?? '(no license text found)';
    return `${'='.repeat(
      60
    )}\n${spdx}\n\nPackages:\n${packageList}\n\nLicense text:\n${licenseBody}`;
  });

writeFileSync(
  path.join(packageDir, 'THIRD_PARTY_NOTICES'),
  `Third-party software bundled in @redocly/cli\n\n${sections.join('\n\n')}\n`
);

cpSync(
  path.join(packageDir, '..', 'client-generator', 'eject-assets'),
  path.join(packageDir, 'lib', 'eject-assets'),
  { recursive: true }
);

// Emits the declarations for the public `@redocly/cli/api` entry. `rootDir` and `outDir`
// from the package tsconfig map each source path to its output path.
function emitDeclarations(sourcePaths) {
  const configPath = path.join(packageDir, 'tsconfig.json');
  const config = ts.getParsedCommandLineOfConfigFile(configPath, {}, ts.sys);
  const program = ts.createProgram({
    rootNames: sourcePaths.map((sourcePath) => path.join(packageDir, sourcePath)),
    options: {
      ...config.options,
      declaration: true,
      emitDeclarationOnly: true,
      declarationMap: false,
      composite: false,
      incremental: false,
    },
  });

  for (const sourcePath of sourcePaths) {
    const { diagnostics } = program.emit(
      program.getSourceFile(path.join(packageDir, sourcePath)),
      (outputPath, text) => {
        const packageImport = text.match(/from ['"](?!\.)([^'"]+)['"]/);
        if (packageImport) {
          throw new Error(
            `${outputPath} imports '${packageImport[1]}' — the published package ships no dependencies, so a public type cannot come from one`
          );
        }

        ts.sys.writeFile(outputPath, text);
      }
    );

    if (diagnostics.length) {
      throw new Error(ts.formatDiagnostics(diagnostics, ts.createCompilerHost({})));
    }
  }
}

function findLicenseText(pkgRoot) {
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md']) {
    const licensePath = path.join(pkgRoot, filename);
    if (existsSync(licensePath)) return readFileSync(licensePath, 'utf-8').trimEnd();
  }
  return null;
}
