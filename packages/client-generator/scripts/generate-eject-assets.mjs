import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

/** The default export the resolver loads, appended to every asset. */
function defaultExport(name, run, sample) {
  return (
    `\nexport default {\n  name: '${name}',\n  run: ${run},\n` +
    (sample === undefined ? '' : `  sample: ${sample},\n`) +
    // The caret range the ejected copy was written against: this version's model and
    // helpers, plus every compatible release after it.
    `  requiresGenerator: '^${version}',\n};\n`
  );
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
  { name: 'python', run: 'pythonGenerator', sample: 'pythonSample' },
  { name: 'go', run: 'goGenerator', sample: 'goSample' },
  { name: 'php', run: 'phpGenerator', sample: 'phpSample' },
];

/**
 * The TypeScript generators, with the expression that produces each one's `run`. The
 * tanstack-query variants share this bundle: the framework is one argument, so the
 * ejected copy is the place to change it rather than four near-identical files.
 */
const TYPESCRIPT = [
  { name: 'sdk', imports: ['sdkGenerator', 'sdkSample'], run: 'sdkGenerator', sample: 'sdkSample' },
  { name: 'zod', imports: ['zodGenerator'], run: 'zodGenerator' },
  { name: 'mock', imports: ['mockGenerator'], run: 'mockGenerator' },
  { name: 'swr', imports: ['swrGenerator'], run: 'swrGenerator' },
  { name: 'transformers', imports: ['transformersGenerator'], run: 'transformersGenerator' },
  { name: 'cli', imports: ['cliGenerator', 'cliSample'], run: 'cliGenerator', sample: 'cliSample' },
  { name: 'cli-docs', imports: ['cliDocsGenerator'], run: 'cliDocsGenerator' },
  {
    name: 'tanstack-query',
    imports: ['tanstackQueryGenerator'],
    run: "tanstackQueryGenerator('react')",
  },
];

for (const { name, imports, run, sample } of TYPESCRIPT) {
  // Bundling starts from a generated entry so the default export survives esbuild's
  // renaming: appending it to the bundle would reference a symbol esbuild may have
  // renamed, while an entry module's own export is resolved before that happens.
  const entry = join(pkgRoot, 'eject-assets', `.entry-${name}.mjs`);
  writeFileSync(
    entry,
    `import { ${imports.join(', ')} } from ${JSON.stringify(
      join(pkgRoot, 'src', 'generators', name, 'index.ts')
    )};\n` + defaultExport(name, run, sample)
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

for (const { name, run, sample } of LANGUAGE) {
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
  writeFileSync(outFile, provenanceHeader(name) + stripped + defaultExport(name, run, sample));
  checkSyntax(outFile, name);
  writeSkill(name);
}
