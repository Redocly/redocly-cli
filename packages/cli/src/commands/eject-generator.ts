import { HandledError, isPlainObject, logger, parseYaml } from '@redocly/openapi-core';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as semver from 'semver';

import { ejectGeneratorTelemetry } from '../utils/client-generator-telemetry.js';
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
  'typescript',
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

/**
 * The assets directory beside the bundled module — the CLI build copies it into `lib/`.
 * Absent when running straight from `src`; build the CLI first.
 */
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
      `eject-generator: ${target} exists without the managed markers — leaving it untouched.\n`
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
 * Assets as a past version shipped them, taken from that version's package on the
 * registry — the header records which version to ask for, so the merge base needs
 * nothing committed. `spec` is anything npm can pack (a version spec; a directory in
 * tests). Members that cannot be read are simply absent from the result, so the caller
 * falls back per file instead of merging against the wrong base.
 */
export function packedAssets(spec: string, members: string[]): Map<string, string> {
  const scratch = mkdtempSync(join(tmpdir(), 'redocly-eject-base-'));
  const extracted = new Map<string, string>();
  try {
    const packed = spawnSync('npm', ['pack', spec, '--pack-destination', scratch], {
      encoding: 'utf-8',
    });
    if (packed.status !== 0) return extracted;
    const tarball = readdirSync(scratch).find((file) => file.endsWith('.tgz'));
    if (tarball === undefined) return extracted;
    for (const member of members) {
      const extraction = spawnSync('tar', ['-xzf', join(scratch, tarball), '-C', scratch, member], {
        encoding: 'utf-8',
      });
      if (extraction.status === 0)
        extracted.set(member, readFileSync(join(scratch, member), 'utf-8'));
    }
    return extracted;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const generatorMember = (name: string) => `package/eject-assets/generators/${name}.mjs`;
const skillMember = (skill: string) => `package/eject-assets/skills/${skill}/SKILL.md`;

/**
 * Refresh one skill during `--update`. The skill tells its owner to edit it first, so it
 * gets the same three-way merge as the generator: ours is the user's copy, the base is
 * the skill the recorded version shipped, theirs is the current one. Without a base (a
 * legacy `.pristine` eject, a failed fetch), an edited copy is kept and the new skill
 * lands beside it as `SKILL.md.new`. Returns the conflict count.
 */
function updateSkill(skill: string, assetsDir: string, baseSkill: string | undefined): number {
  const target = join(process.cwd(), '.claude', 'skills', skill, 'SKILL.md');
  const updated = readFileSync(join(assetsDir, 'skills', skill, 'SKILL.md'), 'utf-8');
  if (!existsSync(target)) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, updated, 'utf-8');
    return 0;
  }
  const current = readFileSync(target, 'utf-8');
  if (current === updated) return 0;
  if (baseSkill === undefined) {
    writeFileSync(`${target}.new`, updated, 'utf-8');
    logger.warn(
      `${relative(process.cwd(), target)} was edited and has no merge base — the new skill is beside it as SKILL.md.new.\n`
    );
    return 0;
  }
  const { merged, conflicts } = threeWayMerge(current, baseSkill, updated);
  writeFileSync(target, merged, 'utf-8');
  return conflicts;
}

/** The built-in generators already ejected into `dir`, so the pointer lists every one of them. */
function ejectedIn(dir: string): string[] {
  return [...EJECTABLE].filter((name) => existsSync(join(dir, `${name}.mjs`)));
}

/**
 * Record `@redocly/client-generator` in the project's devDependencies — the ejected file
 * imports the authoring toolkit from it. Installing stays the user's call; this only makes
 * the requirement part of the project so a fresh clone or CI gets it. With `refresh` (the
 * `--update` path), a recorded range that no longer covers `version` is moved to
 * `^version` wherever the project keeps it — the merged file targets the new toolkit.
 */
function wireDependency(
  packages: Record<string, string>,
  refresh = false
): 'added' | 'updated' | 'present' | 'no-package-json' {
  const manifestPath = join(process.cwd(), 'package.json');
  if (!existsSync(manifestPath)) return 'no-package-json';
  const manifestSource = readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestSource) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  let outcome: 'added' | 'updated' | 'present' = 'present';
  const missing: Record<string, string> = {};
  for (const [name, version] of Object.entries(packages)) {
    const section =
      manifest.devDependencies?.[name] !== undefined
        ? manifest.devDependencies
        : manifest.dependencies?.[name] !== undefined
          ? manifest.dependencies
          : undefined;
    if (section === undefined) {
      missing[name] = `^${version}`;
      outcome = 'added';
    } else if (
      refresh &&
      !(semver.validRange(section[name]) !== null && semver.satisfies(version, section[name]))
    ) {
      section[name] = `^${version}`;
      if (outcome === 'present') outcome = 'updated';
    }
  }
  if (outcome === 'present') return 'present';
  if (Object.keys(missing).length > 0) {
    const devDependencies = { ...manifest.devDependencies, ...missing };
    manifest.devDependencies = Object.fromEntries(
      Object.entries(devDependencies).sort(([left], [right]) => left.localeCompare(right))
    );
  }
  const indent = /^([ \t]+)"/m.exec(manifestSource)?.[1] ?? '  ';
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, indent)}\n`, 'utf-8');
  return outcome;
}

/**
 * The config has no top-level `generators:` list — add one, unless an api's own `client`
 * block would replace it wholesale (`forAlias`); then the caller prints the snippet and
 * the user picks the block.
 */
function insertGeneratorsList(
  configPath: string,
  source: string,
  lines: string[],
  clientLine: number,
  entry: string
): boolean {
  const parsed = parseYaml(source);
  const apis = isPlainObject(parsed) && isPlainObject(parsed.apis) ? parsed.apis : {};
  if (Object.values(apis).some((api) => isPlainObject(api) && isPlainObject(api.client))) {
    return false;
  }
  if (clientLine === -1) {
    if (/^client:/m.test(source)) return false; // `client: {...}` or similar — not a shape we edit
    const separator = source === '' || source.endsWith('\n') ? '' : '\n';
    writeFileSync(
      configPath,
      `${source}${separator}client:\n  generators:\n    - ${entry}\n`,
      'utf-8'
    );
    return true;
  }
  lines.splice(clientLine + 1, 0, '  generators:', `    - ${entry}`);
  writeFileSync(configPath, lines.join('\n'), 'utf-8');
  return true;
}

/**
 * Point `client.generators` at the ejected file, editing the text so comments and
 * formatting survive. A bare `<name>` entry is replaced — keeping both would collide on
 * the name the ejected file takes over. A shape this can't extend without guessing
 * returns false, and the caller prints the snippet instead of reshaping someone's config.
 */
export function wireConfig(configPath: string | undefined, name: string, entry: string): boolean {
  if (configPath === undefined || !existsSync(configPath)) return false;
  const source = readFileSync(configPath, 'utf-8');
  const isItem = (value: string) => (item: string) =>
    item === value || item === `'${value}'` || item === `"${value}"`;
  const isNameEntry = isItem(name);
  const isPathEntry = isItem(entry);
  const lines = source.split('\n');
  const clientLine = lines.findIndex((line) => /^client:\s*$/.test(line));
  let generatorsLine =
    clientLine === -1
      ? -1
      : lines.findIndex((line, index) => index > clientLine && /^\s+generators:/.test(line));
  // A `generators:` beyond a dedented line belongs to another block.
  if (
    generatorsLine !== -1 &&
    lines.slice(clientLine + 1, generatorsLine).some((line) => /^\S/.test(line))
  ) {
    generatorsLine = -1;
  }
  if (generatorsLine === -1) {
    return insertGeneratorsList(configPath, source, lines, clientLine, entry);
  }

  const flow = lines[generatorsLine].match(/^(\s+generators:\s*\[)(.*)\]\s*$/);
  if (flow !== null) {
    const items = flow[2]
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
    if (items.some(isPathEntry)) return true;
    const nameEntry = items.findIndex(isNameEntry);
    if (nameEntry === -1) items.push(entry);
    else items[nameEntry] = entry;
    lines[generatorsLine] = `${flow[1]}${items.join(', ')}]`;
    writeFileSync(configPath, lines.join('\n'), 'utf-8');
    return true;
  }
  if (!/^\s+generators:\s*$/.test(lines[generatorsLine])) return false;
  let lastItem = generatorsLine;
  let itemIndent = `${lines[generatorsLine].match(/^\s+/)![0]}  `;
  for (let index = generatorsLine + 1; index < lines.length; index++) {
    if (/^\s*(#|$)/.test(lines[index])) continue;
    const item = lines[index].match(/^(\s+)- (.*?)\s*$/);
    if (item === null) break;
    const comment = item[2].match(/\s+#.*$/)?.[0] ?? '';
    const value = comment === '' ? item[2] : item[2].slice(0, -comment.length);
    if (isPathEntry(value)) return true;
    if (isNameEntry(value)) {
      lines[index] = `${item[1]}- ${entry}${comment}`;
      writeFileSync(configPath, lines.join('\n'), 'utf-8');
      return true;
    }
    lastItem = index;
    itemIndent = item[1];
  }
  lines.splice(lastItem + 1, 0, `${itemIndent}- ${entry}`);
  writeFileSync(configPath, lines.join('\n'), 'utf-8');
  return true;
}

/**
 * The `--update` flow: three-way-merge the newer built-in version into the user's copy,
 * merging the two skills the same way, and report the conflict count.
 */
function updateEjectedGenerator({
  name,
  asset,
  toolkitVersion,
  assetsDir,
  dir,
  target,
  printedTarget,
}: {
  name: string;
  asset: string;
  toolkitVersion: string;
  assetsDir: string;
  dir: string;
  target: string;
  printedTarget: string;
}): void {
  if (!existsSync(target)) {
    ejectGeneratorTelemetry.eject_generator_outcome = 'missing-target';
    throw new HandledError(
      `\n❌  Nothing to update: ${printedTarget} does not exist. Eject first.\n`
    );
  }
  // Legacy ejects left a `.pristine` snapshot behind; it still works as the merge base.
  const legacyBase = join(dir, '.pristine', `${name}.mjs`);
  const customized = readFileSync(target, 'utf-8');
  const from = recordedVersion(customized);
  // The header is user-editable text, so the version is recorded only when it parses.
  if (from !== undefined && semver.valid(from) !== null) {
    ejectGeneratorTelemetry.eject_generator_from_version = from;
  }
  ejectGeneratorTelemetry.eject_generator_to_version = toolkitVersion;
  // One pack fetches every merge base: the generator plus both skills it shipped with.
  const packed =
    existsSync(legacyBase) || from === toolkitVersion || from === undefined
      ? new Map<string, string>()
      : packedAssets(`${TOOLKIT_PACKAGE}@${from}`, [
          generatorMember(name),
          skillMember('client-generators'),
          skillMember(`${name}-generator`),
        ]);
  const base = existsSync(legacyBase)
    ? readFileSync(legacyBase, 'utf-8')
    : from === toolkitVersion
      ? asset
      : packed.get(generatorMember(name));
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
  // The skills are edit-first files too, so they merge the same way the generator did.
  const skillBase = (skill: string): string | undefined =>
    from === toolkitVersion
      ? readFileSync(join(assetsDir, 'skills', skill, 'SKILL.md'), 'utf-8')
      : packed.get(skillMember(skill));
  const skillConflicts =
    updateSkill('client-generators', assetsDir, skillBase('client-generators')) +
    updateSkill(`${name}-generator`, assetsDir, skillBase(`${name}-generator`));
  dropPointer(dir, ejectedIn(dir));
  // The merged file targets the new toolkit; a range recorded at eject time may not.
  const dependency = wireDependency({ [TOOLKIT_PACKAGE]: toolkitVersion }, true);
  if (dependency === 'updated' || dependency === 'added') {
    logger.info(
      `Set ${TOOLKIT_PACKAGE} to ^${toolkitVersion} in package.json — run your installer.\n`
    );
  }
  const totalConflicts = conflicts + skillConflicts;
  ejectGeneratorTelemetry.eject_generator_outcome = totalConflicts > 0 ? 'conflicts' : 'success';
  if (totalConflicts > 0) {
    ejectGeneratorTelemetry.eject_generator_conflicts = totalConflicts;
    logger.warn(
      `Updated ${printedTarget} with ${totalConflicts} conflict(s)${
        skillConflicts > 0 ? ' (some in .claude/skills)' : ''
      } — resolve the <<<<<<< markers, then regenerate.\n`
    );
  } else {
    logger.info(`Updated ${printedTarget} cleanly.\n`);
  }
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
  // Every path that finishes overwrites this, so it survives only an unaccounted throw.
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
  // The ejected file records and imports the toolkit's version; the CLI versions
  // independently of it.
  const { GENERATOR_VERSION: toolkitVersion } = await import('@redocly/client-generator');
  const dir = resolve(argv.dir ?? './generators');
  const target = join(dir, `${name}.mjs`);
  const printedTarget = relative(process.cwd(), target) || target;

  if (argv.update) {
    updateEjectedGenerator({ name, asset, toolkitVersion, assetsDir, dir, target, printedTarget });
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
  // Config-file entries resolve against the config's directory, so the wired path is
  // relative to it — real paths on both sides, so a symlink doesn't skew the walk.
  const configEntry = `./${relative(
    config.configPath === undefined ? process.cwd() : realpathSync(dirname(config.configPath)),
    realpathSync(target)
  )
    .split('\\')
    .join('/')}`;
  const dependency = wireDependency({ [TOOLKIT_PACKAGE]: toolkitVersion });
  // A bundled TypeScript generator also imports from core; without hoisting it must be explicit.
  const needsCore = asset.includes(`from "${CORE_PACKAGE}"`);
  const wired = wireConfig(config.configPath, name, configEntry);
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
        ? `Added it to client.generators in ${relative(process.cwd(), config.configPath!)} — the path to your copy replaces the built-in name.\n`
        : `Point your config at the file — the path to your copy replaces the built-in name:\n\n` +
          `  client:\n    generators:\n      - ${configEntry}\n\n`) +
      `Your agent's skills: ${designSkill} (this generator's design) and ${authoringSkill} (the toolkit).\n`
  );
  // Last, so wiring the dependency or the config entry failing is not reported as success.
  ejectGeneratorTelemetry.eject_generator_outcome = 'success';
};
