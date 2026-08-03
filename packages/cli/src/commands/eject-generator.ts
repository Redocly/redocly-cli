import { HandledError, logger } from '@redocly/openapi-core';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ejectGeneratorTelemetry } from '../utils/generate-client-telemetry.js';
import { type CommandArgs } from '../wrapper.js';

export type EjectGeneratorCommandArgv = {
  generator?: string;
  config?: string;
  dir?: string;
  force?: boolean;
  update?: boolean;
};

/** The neutral-toolkit generators shipped as vendorable assets. */
const EJECTABLE = new Set(['python', 'go', 'php']);
const TS_BUILTINS = new Set([
  'sdk',
  'zod',
  'tanstack-query',
  'tanstack-query-vue',
  'tanstack-query-svelte',
  'tanstack-query-solid',
  'swr',
  'transformers',
  'mock',
  'cli',
]);

const AGENTS_BEGIN =
  '<!-- redocly-generators:begin — managed by `redocly eject-generator`; content between markers is refreshed on eject -->';
const AGENTS_END = '<!-- redocly-generators:end -->';

/** The assets directory, resolved relative to the bundled module (repo and published alike). */
export function ejectAssetsDir(): string {
  return fileURLToPath(new URL('./eject-assets/', import.meta.url));
}

/** Drop or refresh `<dir>/AGENTS.md`: managed content between markers, user additions preserved. */
function dropAgentsSkill(dir: string, assetsDir: string): void {
  const template = readFileSync(join(assetsDir, 'AGENTS.md'), 'utf-8').trim();
  const managed = `${AGENTS_BEGIN}\n\n${template}\n\n${AGENTS_END}\n`;
  const target = join(dir, 'AGENTS.md');
  if (!existsSync(target)) {
    writeFileSync(target, managed, 'utf-8');
    return;
  }
  const current = readFileSync(target, 'utf-8');
  const begin = current.indexOf(AGENTS_BEGIN);
  const end = current.indexOf(AGENTS_END);
  if (begin === -1 || end === -1) {
    logger.warn(
      `generate-client: ${target} exists without the managed markers — leaving it untouched.\n`
    );
    return;
  }
  writeFileSync(
    target,
    current.slice(0, begin) + managed.trimEnd() + current.slice(end + AGENTS_END.length),
    'utf-8'
  );
}

/** 3-way merge via `git merge-file`; returns the merged text and the conflict count. */
function threeWayMerge(
  customized: string,
  pristineBase: string,
  pristineNew: string,
  dir: string
): { merged: string; conflicts: number } {
  const scratch = join(dir, '.pristine');
  const paths = {
    ours: join(scratch, '.merge-ours'),
    base: join(scratch, '.merge-base'),
    theirs: join(scratch, '.merge-theirs'),
  };
  writeFileSync(paths.ours, customized, 'utf-8');
  writeFileSync(paths.base, pristineBase, 'utf-8');
  writeFileSync(paths.theirs, pristineNew, 'utf-8');
  const result = spawnSync(
    'git',
    [
      'merge-file',
      '-p',
      '-L',
      'yours',
      '-L',
      'ejected-from',
      '-L',
      'update',
      paths.ours,
      paths.base,
      paths.theirs,
    ],
    { encoding: 'utf-8' }
  );
  for (const file of Object.values(paths)) rmSync(file, { force: true });
  if (result.error || result.status === null || result.status < 0) {
    ejectGeneratorTelemetry.eject_generator_outcome = 'merge-tool-missing';
    throw new HandledError(
      '\n❌  `--update` needs `git` on PATH for the three-way merge. Alternative: eject to a temporary directory and diff by hand.\n'
    );
  }
  return { merged: result.stdout, conflicts: result.status };
}

export const handleEjectGenerator = async ({ argv }: CommandArgs<EjectGeneratorCommandArgv>) => {
  const name = argv.generator ?? '';
  // Coarse usage telemetry: our command action, an ALLOWLISTED built-in name, and the
  // outcome category — never user paths, file contents, or user-chosen names.
  ejectGeneratorTelemetry.eject_generator_action = argv.update ? 'update' : 'eject';
  if (EJECTABLE.has(name) || TS_BUILTINS.has(name)) {
    ejectGeneratorTelemetry.eject_generator_name = name;
  }
  if (TS_BUILTINS.has(name)) {
    ejectGeneratorTelemetry.eject_generator_action = 'guidance';
    ejectGeneratorTelemetry.eject_generator_outcome = 'success';
    logger.info(
      `\nThe "${name}" generator is not ejectable — it is TypeScript-toolkit based.\n` +
        `Customize its output instead: publisher defaults via \`client.setup\`, behavior via middleware,\n` +
        `and options in \`redocly.yaml\` (see the "Customize client generation" guide).\n` +
        `Ejectable generators: ${[...EJECTABLE].join(', ')}.\n`
    );
    return;
  }
  if (!EJECTABLE.has(name)) {
    ejectGeneratorTelemetry.eject_generator_outcome = 'unknown-generator';
    throw new HandledError(
      `\n❌  Unknown generator "${name}". Ejectable generators: ${[...EJECTABLE].join(', ')}.\n`
    );
  }

  const assetsDir = ejectAssetsDir();
  const asset = readFileSync(join(assetsDir, 'generators', `${name}.mjs`), 'utf-8');
  const dir = resolve(argv.dir ?? './generators');
  const pristineDir = join(dir, '.pristine');
  const target = join(dir, `${name}.mjs`);
  const pristine = join(pristineDir, `${name}.mjs`);
  const printedTarget = relative(process.cwd(), target) || target;

  if (argv.update) {
    if (!existsSync(target) || !existsSync(pristine)) {
      ejectGeneratorTelemetry.eject_generator_outcome = 'missing-pristine';
      throw new HandledError(
        `\n❌  Nothing to update: ${printedTarget} (and its pristine snapshot) must exist. Eject first.\n`
      );
    }
    const { merged, conflicts } = threeWayMerge(
      readFileSync(target, 'utf-8'),
      readFileSync(pristine, 'utf-8'),
      asset,
      dir
    );
    writeFileSync(target, merged, 'utf-8');
    writeFileSync(pristine, asset, 'utf-8');
    dropAgentsSkill(dir, assetsDir);
    ejectGeneratorTelemetry.eject_generator_outcome = conflicts > 0 ? 'conflicts' : 'success';
    if (conflicts > 0) {
      ejectGeneratorTelemetry.eject_generator_conflicts = conflicts;
      logger.warn(
        `Updated ${printedTarget} with ${conflicts} conflict(s) — resolve the <<<<<<< markers, then regenerate.\n`
      );
    } else {
      logger.info(`Updated ${printedTarget} cleanly; pristine snapshot refreshed.\n`);
    }
    return;
  }

  if (existsSync(target) && !argv.force) {
    ejectGeneratorTelemetry.eject_generator_outcome = 'already-exists';
    throw new HandledError(
      `\n❌  ${printedTarget} already exists. Use --update to merge the newer version in, or --force to overwrite.\n`
    );
  }
  mkdirSync(pristineDir, { recursive: true });
  writeFileSync(target, asset, 'utf-8');
  writeFileSync(pristine, asset, 'utf-8');
  dropAgentsSkill(dir, assetsDir);
  ejectGeneratorTelemetry.eject_generator_outcome = 'success';
  const configPath = `./${relative(process.cwd(), target).split('\\').join('/')}`;
  logger.info(
    `Ejected the "${name}" generator to ${printedTarget} (pristine snapshot committed alongside).\n` +
      `It imports the authoring toolkit from @redocly/client-generator — install it once:\n\n` +
      `  npm install --save-dev @redocly/client-generator\n\n` +
      `Point your config at the file — the path entry takes over the built-in name:\n\n` +
      `  client:\n    generators:\n      - ${configPath}\n\n` +
      `The authoring guide for your agent is in ${relative(process.cwd(), join(dir, 'AGENTS.md'))}.\n`
  );
};
