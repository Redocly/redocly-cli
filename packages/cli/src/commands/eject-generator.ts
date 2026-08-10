import { HandledError, logger } from '@redocly/openapi-core';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
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

/** Every built-in generator ships as a vendorable asset. */
export const EJECTABLE = new Set([
  'python',
  'go',
  'php',
  'sdk',
  'zod',
  'mock',
  'swr',
  'tanstack-query',
  'transformers',
  'cli',
  'cli-docs',
]);

/**
 * The tanstack-query framework variants share one implementation — the framework is a
 * single argument in the ejected file — so they point at the base generator instead of
 * shipping four near-identical bundles.
 */
export const FRAMEWORK_VARIANTS = new Map([
  ['tanstack-query-vue', 'vue'],
  ['tanstack-query-svelte', 'svelte'],
  ['tanstack-query-solid', 'solid'],
]);

/** The packages an ejected generator imports; recorded as devDependencies. */
const TOOLKIT_PACKAGE = '@redocly/client-generator';
const CORE_PACKAGE = '@redocly/openapi-core';

const AGENTS_BEGIN =
  '<!-- redocly-generators:begin — managed by `redocly eject-generator`; content between markers is refreshed on eject -->';
const AGENTS_END = '<!-- redocly-generators:end -->';

/** The assets directory, resolved relative to the bundled module (repo and published alike). */
export function ejectAssetsDir(): string {
  return fileURLToPath(new URL('./eject-assets/', import.meta.url));
}

/** Copy a shipped skill into the repo's `.claude/skills/<skill>/SKILL.md`, overwriting ours. */
function dropSkill(skill: string, assetsDir: string): string {
  const target = join(process.cwd(), '.claude', 'skills', skill, 'SKILL.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(
    target,
    readFileSync(join(assetsDir, 'skills', skill, 'SKILL.md'), 'utf-8'),
    'utf-8'
  );
  return relative(process.cwd(), target);
}

/**
 * Drop or refresh the pointer at `<dir>/AGENTS.md`: it says what these files are and
 * where their design lives, so the directory explains itself to an agent that opens it
 * without the skills loaded. Managed between markers; anything the user adds is kept.
 */
function dropPointer(dir: string, ejected: string[]): void {
  const lines = [
    '# Ejected client generators',
    '',
    'These files are Redocly client generators you own; `redocly generate-client` runs them.',
    'Their design and the authoring toolkit are agent skills — edit the skill first, then make',
    'the code match, and never hand-edit generated client output:',
    '',
    '- `.claude/skills/client-generators/SKILL.md` — the API model, the helpers, the loop.',
    ...ejected.map(
      (name) =>
        `- \`.claude/skills/${name}-generator/SKILL.md\` — the \`${name}\` generator's design.`
    ),
  ];
  const managed = `${AGENTS_BEGIN}\n\n${lines.join('\n')}\n\n${AGENTS_END}\n`;
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
export function threeWayMerge(
  customized: string,
  base: string,
  updated: string
): { merged: string; conflicts: number } {
  const scratch = mkdtempSync(join(tmpdir(), 'redocly-eject-merge-'));
  const paths = {
    ours: join(scratch, '.merge-ours'),
    base: join(scratch, '.merge-base'),
    theirs: join(scratch, '.merge-theirs'),
  };
  writeFileSync(paths.ours, customized, 'utf-8');
  writeFileSync(paths.base, base, 'utf-8');
  writeFileSync(paths.theirs, updated, 'utf-8');
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
  rmSync(scratch, { recursive: true, force: true });
  if (result.error || result.status === null) {
    ejectGeneratorTelemetry.eject_generator_outcome = 'merge-tool-missing';
    throw new HandledError(
      '\n❌  `--update` needs `git` on PATH for the three-way merge. Alternative: eject to a temporary directory and diff by hand.\n'
    );
  }
  // `git merge-file` exits with the conflict count truncated to 127; anything above
  // that is its negative error exit, where stdout is empty — writing it would destroy
  // the user's copy.
  if (result.status > 127) {
    ejectGeneratorTelemetry.eject_generator_outcome = 'merge-failed';
    throw new HandledError(
      `\n❌  \`git merge-file\` could not merge the update (your copy is untouched): ${result.stderr.trim()}\n`
    );
  }
  return { merged: result.stdout, conflicts: result.status };
}

/** The toolkit version an ejected file records in its provenance header. */
function recordedVersion(ejected: string): string | undefined {
  return /Ejected from @redocly\/client-generator@(\S+)/.exec(ejected)?.[1];
}

/**
 * The asset as a past version shipped it, taken from that version's package on the
 * registry — the header records which version to ask for, so the merge base needs
 * nothing committed. `spec` is anything npm can pack (a version spec; a directory in
 * tests). Returns undefined when the fetch or the extraction fails, so the caller can
 * fall back instead of merging against the wrong base.
 */
export function packedAsset(spec: string, name: string): string | undefined {
  const scratch = mkdtempSync(join(tmpdir(), 'redocly-eject-base-'));
  try {
    const packed = spawnSync('npm', ['pack', spec, '--pack-destination', scratch], {
      encoding: 'utf-8',
    });
    if (packed.status !== 0) return undefined;
    const tarball = readdirSync(scratch).find((file) => file.endsWith('.tgz'));
    if (tarball === undefined) return undefined;
    const member = `package/eject-assets/generators/${name}.mjs`;
    const extracted = spawnSync('tar', ['-xzf', join(scratch, tarball), '-C', scratch, member], {
      encoding: 'utf-8',
    });
    if (extracted.status !== 0) return undefined;
    return readFileSync(join(scratch, member), 'utf-8');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** The built-in generators already ejected into `dir`, so the pointer lists every one of them. */
function ejectedIn(dir: string): string[] {
  return [...EJECTABLE].filter((name) => existsSync(join(dir, `${name}.mjs`)));
}

/**
 * Record `@redocly/client-generator` in the project's devDependencies — the ejected file
 * imports the authoring toolkit from it. Installing stays the user's call; this only makes
 * the requirement part of the project so a fresh clone or CI gets it. Returns what happened.
 */
function wireDependency(packages: Record<string, string>): 'added' | 'present' | 'no-package-json' {
  const manifestPath = join(process.cwd(), 'package.json');
  if (!existsSync(manifestPath)) return 'no-package-json';
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const missing = Object.entries(packages).filter(
    ([name]) =>
      manifest.dependencies?.[name] === undefined && manifest.devDependencies?.[name] === undefined
  );
  if (missing.length === 0) return 'present';
  const devDependencies = { ...manifest.devDependencies, ...Object.fromEntries(missing) };
  manifest.devDependencies = Object.fromEntries(
    Object.entries(devDependencies).sort(([left], [right]) => left.localeCompare(right))
  );
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  return 'added';
}

/**
 * Add the ejected file to `client.generators` in the configuration file, editing the text
 * so comments and formatting survive. Only the two shapes we can extend without guessing
 * are handled — a block sequence and a flow sequence under a top-level `client:` — and
 * anything else returns false, so the caller prints the snippet instead of reshaping
 * someone's config.
 */
function wireConfig(configPath: string | undefined, entry: string): boolean {
  if (configPath === undefined || !existsSync(configPath)) return false;
  const source = readFileSync(configPath, 'utf-8');
  const lines = source.split('\n');
  const clientLine = lines.findIndex((line) => /^client:\s*$/.test(line));
  if (clientLine === -1) return false;
  const generatorsLine = lines.findIndex(
    (line, index) => index > clientLine && /^\s+generators:/.test(line)
  );
  if (generatorsLine === -1) return false;
  // Between `client:` and `generators:` there must be nothing dedented — otherwise the
  // `generators:` we found belongs to another block.
  if (lines.slice(clientLine + 1, generatorsLine).some((line) => /^\S/.test(line))) return false;
  if (source.includes(entry)) return true;

  const flow = lines[generatorsLine].match(/^(\s+generators:\s*\[)(.*)\]\s*$/);
  if (flow !== null) {
    const existing = flow[2].trim();
    lines[generatorsLine] = `${flow[1]}${existing === '' ? '' : `${existing}, `}${entry}]`;
    writeFileSync(configPath, lines.join('\n'), 'utf-8');
    return true;
  }
  if (!/^\s+generators:\s*$/.test(lines[generatorsLine])) return false;
  let lastItem = generatorsLine;
  let itemIndent = `${lines[generatorsLine].match(/^\s+/)![0]}  `;
  for (let index = generatorsLine + 1; index < lines.length; index++) {
    const item = lines[index].match(/^(\s+)- /);
    if (item === null) break;
    lastItem = index;
    itemIndent = item[1];
  }
  lines.splice(lastItem + 1, 0, `${itemIndent}- ${entry}`);
  writeFileSync(configPath, lines.join('\n'), 'utf-8');
  return true;
}

export const handleEjectGenerator = async ({
  argv,
  config,
}: CommandArgs<EjectGeneratorCommandArgv>) => {
  const name = argv.generator ?? '';
  // Coarse usage telemetry: our command action, an ALLOWLISTED built-in name, and the
  // outcome category — never user paths, file contents, or user-chosen names.
  ejectGeneratorTelemetry.eject_generator_action = argv.update ? 'update' : 'eject';
  if (EJECTABLE.has(name) || FRAMEWORK_VARIANTS.has(name)) {
    ejectGeneratorTelemetry.eject_generator_name = name;
  }
  // Every path that finishes overwrites this, so it survives only when something we did
  // not account for throws — an unreadable asset, a failed write, a missing directory.
  ejectGeneratorTelemetry.eject_generator_outcome = 'unexpected-error';
  const framework = FRAMEWORK_VARIANTS.get(name);
  if (framework !== undefined) {
    ejectGeneratorTelemetry.eject_generator_action = 'guidance';
    ejectGeneratorTelemetry.eject_generator_outcome = 'success';
    logger.info(
      `\nThe "${name}" generator is the "tanstack-query" generator with one argument changed.\n` +
        `Eject that one and set the framework in your copy's default export:\n\n` +
        `  redocly eject-generator tanstack-query\n` +
        `  # then in generators/tanstack-query.mjs: run: tanstackQueryGenerator('${framework}')\n`
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
  // The version that matters is the TOOLKIT's (what the ejected file records and imports),
  // not the CLI's — they version independently.
  const { GENERATOR_VERSION: toolkitVersion } = await import('@redocly/client-generator');
  const dir = resolve(argv.dir ?? './generators');
  const target = join(dir, `${name}.mjs`);
  // Ejects before the base moved to the registry left a snapshot behind; it still works
  // as the base, which keeps `--update` offline for anyone mid-migration.
  const legacyBase = join(dir, '.pristine', `${name}.mjs`);
  const printedTarget = relative(process.cwd(), target) || target;

  if (argv.update) {
    if (!existsSync(target)) {
      ejectGeneratorTelemetry.eject_generator_outcome = 'missing-target';
      throw new HandledError(
        `\n❌  Nothing to update: ${printedTarget} does not exist. Eject first.\n`
      );
    }
    const customized = readFileSync(target, 'utf-8');
    const from = recordedVersion(customized);
    const base = existsSync(legacyBase)
      ? readFileSync(legacyBase, 'utf-8')
      : from === toolkitVersion
        ? asset
        : from === undefined
          ? undefined
          : packedAsset(`${TOOLKIT_PACKAGE}@${from}`, name);
    if (base === undefined) {
      ejectGeneratorTelemetry.eject_generator_outcome = 'missing-base';
      const sideBySide = `${target}.new`;
      writeFileSync(sideBySide, asset, 'utf-8');
      throw new HandledError(
        `\n❌  Could not read the version this file was ejected from (${from ?? 'not recorded in its header'}), so there is no merge base.\n` +
          `   The current generator is written to ${relative(process.cwd(), sideBySide)} — diff it against your copy and merge by hand.\n`
      );
    }
    const { merged, conflicts } = threeWayMerge(customized, base, asset);
    writeFileSync(target, merged, 'utf-8');
    if (existsSync(legacyBase)) {
      logger.info(
        `Used ${relative(process.cwd(), legacyBase)} as the merge base. Later updates read the version from the file's header, so you can delete that .pristine directory.\n`
      );
    }
    dropSkill('client-generators', assetsDir);
    dropSkill(`${name}-generator`, assetsDir);
    dropPointer(dir, ejectedIn(dir));
    ejectGeneratorTelemetry.eject_generator_outcome = conflicts > 0 ? 'conflicts' : 'success';
    if (conflicts > 0) {
      ejectGeneratorTelemetry.eject_generator_conflicts = conflicts;
      logger.warn(
        `Updated ${printedTarget} with ${conflicts} conflict(s) — resolve the <<<<<<< markers, then regenerate.\n`
      );
    } else {
      logger.info(`Updated ${printedTarget} cleanly.\n`);
    }
    return;
  }

  if (existsSync(target) && !argv.force) {
    ejectGeneratorTelemetry.eject_generator_outcome = 'already-exists';
    throw new HandledError(
      `\n❌  ${printedTarget} already exists. Use --update to merge the newer version in, or --force to overwrite.\n`
    );
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(target, asset, 'utf-8');
  const authoringSkill = dropSkill('client-generators', assetsDir);
  const designSkill = dropSkill(`${name}-generator`, assetsDir);
  dropPointer(dir, ejectedIn(dir));
  const configEntry = `./${relative(process.cwd(), target).split('\\').join('/')}`;
  const dependency = wireDependency({ [TOOLKIT_PACKAGE]: `^${toolkitVersion}` });
  // A bundled TypeScript generator also imports `logger`/`isPlainObject` from core, which
  // the toolkit depends on — worth saying out loud for a package manager that doesn't hoist.
  const needsCore = asset.includes(`from "${CORE_PACKAGE}"`);
  const wired = wireConfig(config.configPath, configEntry);
  logger.info(
    `Ejected the "${name}" generator to ${printedTarget}.\n` +
      (dependency === 'added'
        ? `Added ${TOOLKIT_PACKAGE} to devDependencies (the ejected file imports its toolkit) — run your installer.\n`
        : dependency === 'no-package-json'
          ? `The ejected file imports its toolkit from ${TOOLKIT_PACKAGE} — install it: npm install --save-dev ${TOOLKIT_PACKAGE}\n`
          : '') +
      (needsCore
        ? `It also imports ${CORE_PACKAGE} (a dependency of the toolkit) — add it explicitly if your package manager does not hoist.\n`
        : '') +
      (wired
        ? `Added it to client.generators in ${relative(process.cwd(), config.configPath!)} — the path entry takes over the built-in name.\n`
        : `Point your config at the file — the path entry takes over the built-in name:\n\n` +
          `  client:\n    generators:\n      - ${configEntry}\n\n`) +
      `Your agent's skills: ${designSkill} (this generator's design) and ${authoringSkill} (the toolkit).\n`
  );
  // Last, so wiring the dependency or the config entry failing is not reported as success.
  ejectGeneratorTelemetry.eject_generator_outcome = 'success';
};
