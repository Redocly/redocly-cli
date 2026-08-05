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
// The contract number lives in ONE place (src/generators/contract.ts); this script
// runs at prepare time (before tsc), so it reads the constant out of the source.
const contractSource = readFileSync(join(pkgRoot, 'src', 'generators', 'contract.ts'), 'utf-8');
const contractMatch = contractSource.match(/GENERATOR_CONTRACT = (\d+)/);
if (contractMatch === null) {
  process.stderr.write('Could not read GENERATOR_CONTRACT from src/generators/contract.ts\n');
  process.exit(1);
}
const contract = Number(contractMatch[1]);
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
  const footer = `\nexport default {\n  name: '${name}',\n  run: ${run},\n  sample: ${sample},\n  contract: ${contract},\n};\n`;
  const outFile = join(outDir, `${name}.mjs`);
  writeFileSync(outFile, header + stripped + footer);
  const check = spawnSync(process.execPath, ['--check', outFile], { encoding: 'utf-8' });
  if (check.status !== 0) {
    process.stderr.write(`eject asset ${name}.mjs failed node --check:\n${check.stderr}`);
    process.exit(1);
  }
  // The generator's OWN design ships as `.claude/skills/<name>-generator/SKILL.md`, so the
  // agent that edits the ejected file starts from the design instead of reverse-engineering
  // it. The intro and modify loop are rewritten for the user's repo on the way.
  const skill = readFileSync(join(pkgRoot, 'src', 'generators', name, 'AGENTS.md'), 'utf-8');
  mkdirSync(join(skillsDir, `${name}-generator`), { recursive: true });
  writeFileSync(join(skillsDir, `${name}-generator`, 'SKILL.md'), ejectedSkill(skill, name));
}
