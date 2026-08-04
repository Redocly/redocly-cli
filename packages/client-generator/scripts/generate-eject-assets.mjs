import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { ejectedSkill } from './ejected-skill.mjs';

// Build the ejectable generator assets: the neutral-toolkit language generators,
// type-stripped to plain ESM (comments preserved) with imports rewritten to the
// public entries, plus a provenance header and the `defineGenerator`-shaped
// default export the resolver loads. `redocly eject-generator <name>` copies
// these into the user's repo verbatim.
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8'));
const outDir = join(pkgRoot, 'eject-assets', 'generators');
mkdirSync(outDir, { recursive: true });

const EJECTABLE = [
  { name: 'python', run: 'pythonGenerator', sample: 'pythonSample' },
  { name: 'go', run: 'goGenerator', sample: 'goSample' },
  { name: 'php', run: 'phpGenerator', sample: 'phpSample' },
];

for (const { name, run, sample } of EJECTABLE) {
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
  const header = [
    `// Ejected from @redocly/client-generator@${version} — the built-in "${name}" generator.`,
    '// This file is yours: edit freely; the generated client stays machine-owned and is',
    '// rebuilt by `redocly generate-client`. Newer generator versions merge in with',
    '// `redocly eject-generator ' + name + ' --update`.',
    '',
  ].join('\n');
  const footer = `\nexport default {\n  name: '${name}',\n  run: ${run},\n  sample: ${sample},\n};\n`;
  const outFile = join(outDir, `${name}.mjs`);
  writeFileSync(outFile, header + stripped + footer);
  const check = spawnSync(process.execPath, ['--check', outFile], { encoding: 'utf-8' });
  if (check.status !== 0) {
    process.stderr.write(`eject asset ${name}.mjs failed node --check:\n${check.stderr}`);
    process.exit(1);
  }
  // The generator's OWN skill ships beside its code: eject drops it as
  // `generators/<name>.AGENTS.md` so the agent that edits the ejected file
  // starts from the generator's design, not from reverse-engineering it.
  // The intro and modify loop are rewritten for the user's repo on the way.
  const skill = readFileSync(join(pkgRoot, 'src', 'generators', name, 'AGENTS.md'), 'utf-8');
  writeFileSync(join(outDir, `${name}.AGENTS.md`), ejectedSkill(skill, name));
}
