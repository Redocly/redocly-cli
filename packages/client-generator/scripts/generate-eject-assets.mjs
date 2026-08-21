import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

import { ejectedSkill } from './ejected-skill.mjs';

// Build the ejectable generator assets — one `.mjs` per built-in generator, which
// `redocly eject-generator <name>` copies into the user's repo verbatim. Two shapes,
// because the generators have two shapes:
//
// - A language generator is ONE self-contained file, so it ships as its own source,
//   type-stripped with comments preserved and its imports rewritten to the public
//   entries. The user reads their own generator, exactly as we wrote it.
// - A TypeScript generator is a thin entry over shared emitters, so it ships BUNDLED
//   with the emitters it uses (esbuild, unminified, one module comment per source file).
//   `@redocly/client-generator` and `@redocly/openapi-core` stay external — those are
//   the two packages an ejected generator imports.
//
// Both get a provenance header and the `defineGenerator`-shaped default export the
// resolver loads.
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8'));
const outDir = join(pkgRoot, 'eject-assets', 'generators');
const skillsDir = join(pkgRoot, 'eject-assets', 'skills');
mkdirSync(outDir, { recursive: true });

// The shared authoring skill ships as a skill too, so an agent in the user's repo loads
// it without being told to read a file.
mkdirSync(join(skillsDir, 'client-generators'), { recursive: true });
writeFileSync(
  join(skillsDir, 'client-generators', 'SKILL.md'),
  [
    '---',
    'name: client-generators',
    'description: Write or change a Redocly client generator — the API model, the language-neutral helper toolkit, and the edit → regenerate → diff loop.',
    '---',
    '',
    readFileSync(join(pkgRoot, 'eject-assets', 'AGENTS.md'), 'utf-8').trim(),
    '',
  ].join('\n')
);

/** The provenance header every ejected file carries; `--update` reads the version from it. */
function provenanceHeader(name) {
  return (
    [
      `// Ejected from @redocly/client-generator@${version} — the built-in "${name}" generator.`,
      '// This file is yours: edit freely; the generated client stays machine-owned and is',
      '// rebuilt by `redocly generate-client`. Newer generator versions merge in with',
      `// \`redocly eject-generator ${name} --update\`.`,
    ].join('\n') + '\n'
  );
}

/**
 * The built-in compatibility table, read from its own source so an ejected file cannot
 * declare a different contract from the built-in it came from. Only the metadata is
 * wanted, so everything the table reaches for at call time is cut away: the generator
 * modules behind `load`, and `@redocly/openapi-core`, which `meta.ts` uses only inside
 * functions we never call. Nothing here may resolve into a package's `lib/` — this runs
 * on `prepare`, before anything is compiled.
 */
async function loadBuiltinMeta() {
  const bundle = join(pkgRoot, 'eject-assets', '.meta.mjs');
  await build({
    entryPoints: [join(pkgRoot, 'src', 'generators', 'meta.ts')],
    outfile: bundle,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    plugins: [
      {
        name: 'cut-call-time-imports',
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /\/index\.js$/ }, (args) => ({
            path: args.path,
            external: true,
          }));
          pluginBuild.onResolve({ filter: /^@redocly\/openapi-core$/ }, () => ({
            path: 'openapi-core',
            namespace: 'unused-at-build-time',
          }));
          pluginBuild.onLoad({ filter: /.*/, namespace: 'unused-at-build-time' }, () => ({
            contents: 'export const logger = {};',
          }));
        },
      },
    ],
    logLevel: 'warning',
  });
  try {
    return (await import(pathToFileURL(bundle).href)).BUILTIN_META;
  } finally {
    rmSync(bundle, { force: true });
  }
}

const BUILTIN_META = await loadBuiltinMeta();

/**
 * The default export the resolver loads, appended to every asset. It carries the same
 * contract the built-in declares — `requires`, `errorModes`, `dateTypes`, `runtimes`,
 * `notApplicable` — so an ejected generator still pulls its prerequisites in and is
 * validated exactly like the built-in it replaces.
 */
function defaultExport(name, { run, sample, options, docs }) {
  const { load: _load, ...contract } = BUILTIN_META[name];
  const fields = [`  name: '${name}',`, `  run: ${run},`];
  if (sample !== undefined) fields.push(`  sample: ${sample},`);
  // The generator's own reference page travels with it: an ejected copy keeps
  // documenting itself, and the page layout is the user's to change.
  if (docs !== undefined) fields.push(`  docs: ${docs},`);
  if (options !== undefined) fields.push(`  options: ${options},`);
  for (const [key, value] of Object.entries(contract)) {
    // Wrapped only when it would run long — the user owns and edits this file.
    const inline = JSON.stringify(value);
    const text =
      inline.length <= 80 ? inline : JSON.stringify(value, null, 2).replaceAll('\n', '\n  ');
    fields.push(`  ${key}: ${text},`);
  }
  // The caret range the ejected copy was written against: this version's model and
  // helpers, plus every compatible release after it.
  fields.push(`  requiresGenerator: '^${version}',`);
  return `\nexport default {\n${fields.join('\n')}\n};\n`;
}

/** Fail the build loudly — a broken asset would only surface in a user's repo. */
function checkSyntax(outFile, name) {
  const check = spawnSync(process.execPath, ['--check', outFile], { encoding: 'utf-8' });
  if (check.status !== 0) {
    process.stderr.write(`eject asset ${name}.mjs failed node --check:\n${check.stderr}`);
    process.exit(1);
  }
}

/** The generator's design, rewritten for the user's repo and shipped as an agent skill. */
function writeSkill(name) {
  const skill = readFileSync(join(pkgRoot, 'src', 'generators', name, 'AGENTS.md'), 'utf-8');
  mkdirSync(join(skillsDir, `${name}-generator`), { recursive: true });
  writeFileSync(join(skillsDir, `${name}-generator`, 'SKILL.md'), ejectedSkill(skill, name));
}

const LANGUAGE = [
  { name: 'python', run: 'pythonGenerator', sample: 'pythonSample', docs: 'pythonDocs' },
  { name: 'go', run: 'goGenerator', sample: 'goSample', docs: 'goDocs' },
  { name: 'php', run: 'phpGenerator', sample: 'phpSample', docs: 'phpDocs' },
];

/**
 * The TypeScript generators, with the expression that produces each one's `run`. The
 * tanstack-query variants share this bundle: the framework is one argument, so the
 * ejected copy is the place to change it rather than four near-identical files.
 */
const TYPESCRIPT = [
  {
    name: 'typescript',
    imports: ['typescriptGenerator', 'typescriptSample', 'typescriptDocs'],
    run: 'typescriptGenerator',
    sample: 'typescriptSample',
    docs: 'typescriptDocs',
  },
  { name: 'zod', imports: ['zodGenerator'], run: 'zodGenerator' },
  { name: 'mock', imports: ['mockGenerator'], run: 'mockGenerator' },
  { name: 'swr', imports: ['swrGenerator'], run: 'swrGenerator' },
  { name: 'transformers', imports: ['transformersGenerator'], run: 'transformersGenerator' },
  {
    name: 'cli',
    imports: ['cliGenerator', 'cliSample', 'cliDocs'],
    run: 'cliGenerator',
    sample: 'cliSample',
    docs: 'cliDocs',
  },
  {
    name: 'tanstack-query',
    imports: ['tanstackQueryGenerator'],
    run: "tanstackQueryGenerator('react')",
  },
];

for (const { name, imports, run, sample, options, docs } of TYPESCRIPT) {
  // Bundling starts from a generated entry so the default export survives esbuild's
  // renaming: appending it to the bundle would reference a symbol esbuild may have
  // renamed, while an entry module's own export is resolved before that happens.
  const entry = join(pkgRoot, 'eject-assets', `.entry-${name}.mjs`);
  writeFileSync(
    entry,
    `import { ${imports.join(', ')} } from ${JSON.stringify(
      join(pkgRoot, 'src', 'generators', name, 'index.ts')
    )};\n` + defaultExport(name, { run, sample, options, docs })
  );
  const outFile = join(outDir, `${name}.mjs`);
  try {
    await build({
      entryPoints: [entry],
      outfile: outFile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node20',
      keepNames: true,
      // Readable output: a user owns this file, so no minification and one comment
      // per source module.
      minify: false,
      external: ['@redocly/client-generator', '@redocly/openapi-core'],
      banner: { js: provenanceHeader(name) },
      logLevel: 'warning',
    });
  } finally {
    rmSync(entry, { force: true });
  }
  checkSyntax(outFile, name);
  writeSkill(name);
}

for (const { name, run, sample, docs } of LANGUAGE) {
  const source = readFileSync(join(pkgRoot, 'src', 'generators', name, 'index.ts'), 'utf-8')
    .replaceAll("'../../authoring/index.js'", "'@redocly/client-generator'")
    .replaceAll(
      `'../../emitters/${name}-runtime-sources.js'`,
      "'@redocly/client-generator/runtime-sources'"
    );
  const stripped = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      removeComments: false,
    },
  }).outputText;
  const outFile = join(outDir, `${name}.mjs`);
  writeFileSync(
    outFile,
    provenanceHeader(name) + stripped + defaultExport(name, { run, sample, docs })
  );
  checkSyntax(outFile, name);
  writeSkill(name);
}
