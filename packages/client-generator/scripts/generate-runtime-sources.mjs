import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Snapshot the runtime sources (src/generators/typescript/runtime/*.ts and the cli
// engine at src/generators/cli/runtime/cli.ts) into a tracked TS module so the inline
// assembler can embed the real runtime (a readFileSync asset would not survive the CLI's
// esbuild bundling). Order is the assembler's fixed dependency order; the barrel
// (index.ts) is not embedded — the assembler emits its own local createClient wiring.
//
// The contract types the runtime imports from the package level (ADR-0022: the setup
// contract in src/runtime-contract.ts, `PaginationSpec` beside its resolver in
// src/pagination.ts) are spliced back into the embedded `types.ts` here, replacing the
// re-export statements — the embedded module stays self-contained with one definition
// in the source tree.
const MODULES = [
  'types',
  'errors',
  'url',
  'parse',
  'retry',
  'multipart',
  'auth',
  'setup',
  'send',
  'sse',
  'create-client',
  'paginate',
  'cli',
];

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const runtimeDir = join(pkgRoot, 'src', 'generators', 'typescript', 'runtime');
const outFile = join(pkgRoot, 'src', 'runtime-sources', 'typescript.ts');

// The package-level modules whose type declarations the embed splices back in, keyed by
// the specifier the runtime imports them with.
const CONTRACT_MODULES = {
  '../../../runtime-contract.js': join(pkgRoot, 'src', 'runtime-contract.ts'),
  '../../../pagination.js': join(pkgRoot, 'src', 'pagination.ts'),
  '../../../cli-contract.js': join(pkgRoot, 'src', 'cli-contract.ts'),
};

/** The declaration's start including its own doc comment, excluding detached trivia. */
function declStartWithDocs(source, declaration) {
  const ranges = ts.getLeadingCommentRanges(source, declaration.getFullStart()) ?? [];
  let start = declaration.getStart();
  for (let index = ranges.length - 1; index >= 0; index--) {
    if (/\n\s*\n/.test(source.slice(ranges[index].end, start))) break;
    start = ranges[index].pos;
  }
  return start;
}

/** The named type declarations of a contract module, verbatim and in source order. */
function contractDeclarationsText(modulePath, names) {
  const source = readFileSync(modulePath, 'utf-8');
  const file = ts.createSourceFile('__contract.ts', source, ts.ScriptTarget.Latest, true);
  const wanted = new Set(names);
  const parts = [];
  for (const statement of file.statements) {
    const named =
      (ts.isTypeAliasDeclaration(statement) || ts.isFunctionDeclaration(statement)) &&
      statement.name !== undefined;
    if (named && wanted.has(statement.name.text)) {
      parts.push(source.slice(declStartWithDocs(source, statement), statement.end));
      wanted.delete(statement.name.text);
    }
  }
  if (wanted.size > 0) {
    throw new Error(`contract splice: ${[...wanted].join(', ')} not found in ${modulePath}`);
  }
  return parts.join('\n\n');
}

/**
 * Replace the runtime module's contract imports/re-exports with the definitions they
 * point at, so every downstream use (full source, stripped embed, declared names) sees
 * one self-contained module.
 */
function spliceContracts(source) {
  const file = ts.createSourceFile('__splice.ts', source, ts.ScriptTarget.Latest, true);
  const edits = [];
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && CONTRACT_MODULES[statement.moduleSpecifier.text]) {
      // Delete the import line and its trailing newlines only — the module's header
      // comment is this statement's leading trivia and must survive.
      let end = statement.end;
      while (source[end] === '\n') end++;
      edits.push({ start: statement.getStart(), end, text: '' });
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier !== undefined &&
      CONTRACT_MODULES[statement.moduleSpecifier.text]
    ) {
      const names = statement.exportClause.elements.map((element) => element.name.text);
      const block = contractDeclarationsText(
        CONTRACT_MODULES[statement.moduleSpecifier.text],
        names
      );
      edits.push({ start: statement.getFullStart(), end: statement.end, text: `\n\n${block}` });
    }
  }
  let spliced = source;
  for (const edit of edits.reverse()) {
    spliced = spliced.slice(0, edit.start) + edit.text + spliced.slice(edit.end);
  }
  return spliced;
}

/** A runtime module's embeddable source: the cli engine lives in the cli generator. */
function runtimeSource(name) {
  const path =
    name === 'cli'
      ? join(pkgRoot, 'src', 'generators', 'cli', 'runtime', 'cli.ts')
      : join(runtimeDir, `${name}.ts`);
  return spliceContracts(readFileSync(path, 'utf-8'));
}

// Emit the literal exactly as oxfmt (singleQuote: true) would format it, so that
// compile → format is a no-op: prefer single quotes unless that needs more escapes.
function toStringLiteral(source) {
  const singles = (source.match(/'/g) ?? []).length;
  const doubles = (source.match(/"/g) ?? []).length;
  const json = JSON.stringify(source); // handles all escaping, double-quoted
  if (singles > doubles) return json;
  const inner = json
    .slice(1, -1)
    .replace(/\\\\|\\"|'/g, (m) => (m === '\\\\' ? m : m === '\\"' ? '"' : "\\'"));
  return `'${inner}'`;
}

const entries = MODULES.map((name) => {
  const source = runtimeSource(name);
  const line = `  '${name}.ts': ${toStringLiteral(source)},`;
  // oxfmt (printWidth: 100) breaks an over-width property onto a continuation line.
  return line.length <= 100 ? line : `  '${name}.ts':\n    ${toStringLiteral(source)},`;
});

// Top-level declared names of every runtime module, precomputed here (with the TS
// parser, a devDependency) so the runtime-agnostic pipeline never needs `typescript`
// to build the reserved-name set. Mirrors collectDeclaredName's rules.
function declaredNames() {
  const names = new Set();
  for (const name of MODULES) {
    const source = runtimeSource(name);
    const file = ts.createSourceFile(`${name}.ts`, source, ts.ScriptTarget.Latest, false);
    for (const statement of file.statements) {
      if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) &&
        statement.name !== undefined
      ) {
        names.add(statement.name.text);
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
        }
      }
    }
  }
  return [...names].sort();
}

// The Python runtime (src/generators/python/runtime/*.py) embeds the same way: hand-authored
// once, stitched into every generated Python client by the python generator.
const PYTHON_MODULES = [
  '_errors',
  '_auth',
  '_url',
  '_decode',
  '_send',
  '_paginate',
  '_sse',
  '_multipart',
];
const pythonDir = join(pkgRoot, 'src', 'generators', 'python', 'runtime');
const pythonOut = join(pkgRoot, 'src', 'runtime-sources', 'python.ts');
const pythonEntries = PYTHON_MODULES.map((name) => {
  const source = readFileSync(join(pythonDir, `${name}.py`), 'utf-8');
  const line = `  '${name}.py': ${toStringLiteral(source)},`;
  return line.length <= 100 ? line : `  '${name}.py':\n    ${toStringLiteral(source)},`;
});
writeFileSync(
  pythonOut,
  [
    '// GENERATED by scripts/generate-runtime-sources.mjs — do not edit. Regenerated on install (`prepare`); manually: `npm run prepare -w @redocly/client-generator`.',
    'export const PYTHON_RUNTIME_SOURCES = {',
    ...pythonEntries,
    '} as const;',
    '',
    'export type PythonRuntimeModuleName = keyof typeof PYTHON_RUNTIME_SOURCES;',
    '',
  ].join('\n')
);

// The Go runtime embeds the same way (a single stdlib-only module).
const goDir = join(pkgRoot, 'src', 'generators', 'go', 'runtime');
const goOut = join(pkgRoot, 'src', 'runtime-sources', 'go.ts');
const goSource = readFileSync(join(goDir, 'runtime.go'), 'utf-8');
writeFileSync(
  goOut,
  [
    '// GENERATED by scripts/generate-runtime-sources.mjs — do not edit. Regenerated on install (`prepare`); manually: `npm run prepare -w @redocly/client-generator`.',
    // oxfmt (printWidth 100) wraps the over-width const onto a continuation line.
    `export const GO_RUNTIME_SOURCE =\n  ${toStringLiteral(goSource)};`,
    '',
  ].join('\n')
);

// The PHP runtime embeds the same way (a single curl-only module).
const phpDir = join(pkgRoot, 'src', 'generators', 'php', 'runtime');
const phpOut = join(pkgRoot, 'src', 'runtime-sources', 'php.ts');
const phpSource = readFileSync(join(phpDir, 'runtime.php'), 'utf-8');
writeFileSync(
  phpOut,
  [
    '// GENERATED by scripts/generate-runtime-sources.mjs — do not edit. Regenerated on install (`prepare`); manually: `npm run prepare -w @redocly/client-generator`.',
    // oxfmt (printWidth 100) wraps the over-width const onto a continuation line.
    `export const PHP_RUNTIME_SOURCE =\n  ${toStringLiteral(phpSource)};`,
    '',
  ].join('\n')
);

// Stripped variants for inline embedding (generators/typescript/inline-runtime.ts): imports dropped,
// `export` removed except on the kept surface — done HERE at prepare time so the embed
// path needs no TypeScript at generate time. Slices are AST-position-driven (no regexes),
// so comments and formatting survive byte-for-byte.
const KEEP_EXPORTS = {
  'types.ts': () => true,
  'errors.ts': (statement) => ts.isClassDeclaration(statement),
  'retry.ts': (statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'defaultRetryOn',
  'setup.ts': () => true,
};

function stripModule(name, source) {
  const file = ts.createSourceFile(
    '__embed.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const keeps = KEEP_EXPORTS[name];
  const parts = [];
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) continue;
    const text = source.slice(statement.getFullStart(), statement.end);
    const exportModifier = ts
      .getModifiers(statement)
      ?.find((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (exportModifier && !keeps?.(statement)) {
      const at = exportModifier.getStart() - statement.getFullStart();
      parts.push(text.slice(0, at) + text.slice(at + 'export '.length));
    } else {
      parts.push(text);
    }
  }
  return parts.join('').trim();
}

const strippedEntries = MODULES.map((name) => {
  const source = runtimeSource(name);
  const stripped = stripModule(`${name}.ts`, source);
  const line = `  '${name}.ts': ${toStringLiteral(stripped)},`;
  return line.length <= 100 ? line : `  '${name}.ts':\n    ${toStringLiteral(stripped)},`;
});

const content = [
  '// GENERATED by scripts/generate-runtime-sources.mjs — do not edit. Regenerated on install (`prepare`); manually: `npm run prepare -w @redocly/client-generator`.',
  'export const RUNTIME_SOURCES = {',
  ...entries,
  '} as const;',
  '',
  '/** Inline-embed variants: imports dropped, `export` stripped outside the kept surface. */',
  'export const RUNTIME_SOURCES_STRIPPED = {',
  ...strippedEntries,
  '} as const;',
  '',
  'export type RuntimeModuleName = keyof typeof RUNTIME_SOURCES;',
  '',
  '/** Top-level declared names of the runtime modules — precomputed so the pipeline',
  ' * builds the reserved-name set without the TypeScript parser. */',
  'export const RUNTIME_DECLARED_NAMES = [',
  ...declaredNames().map((name) => `  '${name}',`),
  '] as const;',
  '',
].join('\n');

writeFileSync(outFile, content);
