# Helper surface — pre-rewrite analysis

A complete inventory of the helper code in `@redocly/client-generator`, taken before the
generator-folder rewrite.
This says **what exists today, who uses it, and where it belongs** — so the rewrite moves
code with evidence rather than intuition.

It is a point-in-time analysis, not a living document.
Once the rewrite lands, [`../ARCHITECTURE.md`](../ARCHITECTURE.md) is the descriptive map and this file can go.

## Method

Measurements below come from static analysis of `src/`, excluding `__tests__`:

- **Reachability** — value imports (type-only imports are erased at runtime) followed transitively from each generator entry.
- **Direct symbol use** — `import { … } from …` bindings, attributed to the generator that owns the importing module.
- **Toolkit use** — identifier occurrences of each `AUTHORING_HELPER_NAMES` entry outside `authoring/`.

Totals: **87 files, 15,913 lines, 183 exported values, 107 exported types.**

Reachability overstates sharing (a module reached through three hops is not a shared helper), so
every claim below is based on direct symbol use.

## Headline: there are two parallel toolkits

`authoring/` is documented as "the language-neutral authoring toolkit — pure functions over the IR".
In practice it is **the toolkit the three non-TypeScript generators use.**
The TypeScript family has a complete shadow implementation in `emitters/`.

| Concern          | Neutral toolkit (`authoring/`)                                                     | TypeScript shadow (`emitters/`)                                                                     |
| ---------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Identifiers      | `identifierFor`, `uniqueIdentifiers`, `RESERVED_WORDS`                             | `sanitizeIdentifier`, `uniqueIdent`, `safeIdent`, `isIdentifier`, `isSafeIdentifier`, `TS_RESERVED` |
| Text building    | `Printer`                                                                          | `[…].join('\n')` arrays                                                                             |
| Description text | `docText`                                                                          | `splitLines`, `jsdocText`                                                                           |
| Comment escaping | —                                                                                  | `escapeJsDoc`                                                                                       |
| Schema shape     | `isNullable`, `unwrapNullable`, `flattenAllOf`, `enumValues`, `discriminatorCases` | inline in `ts-type.ts`                                                                              |
| Pagination       | `paginationRuleFor`                                                                | `resolveOperationPagination`, `resolveModelPagination`                                              |
| Casing           | `casing.pascal`                                                                    | `pascalCase`                                                                                        |

Consumers of each neutral helper, counted outside `authoring/`:

| Helper                | Consumers                                     |
| --------------------- | --------------------------------------------- |
| `NotSupportedError`   | 9 — package-wide error type, genuinely shared |
| `Printer`             | go, php, python, `cli-docs` (Markdown)        |
| `renderReferencePage` | go, php, python, **typescript**               |
| `schemaAtPointer`     | go, php, python, `pagination`                 |
| `headerCoerceType`    | go, php, python, `response-headers`           |
| `casing`              | go, `cli`, `runtime/cli`, `runtime-sources`   |
| `identifierFor`       | go, php, python                               |
| `uniqueIdentifiers`   | go, php, python                               |
| `RESERVED_WORDS`      | go, php, python                               |
| `flattenAllOf`        | go, php, python                               |
| `discriminatorCases`  | go, php, python                               |
| `isNullable`          | go, php, python                               |
| `unwrapNullable`      | go, php, python                               |
| `enumValues`          | go, php, python                               |
| `docText`             | go, php, python                               |
| `paginationRuleFor`   | go, php, python                               |

**Ten of sixteen neutral helpers have exactly three consumers, and they are always the same three.**
No TypeScript-family generator uses `Printer`, `docText`, `identifierFor`, or any of the schema-shape
helpers.
The neutral toolkit is not neutral in practice — it is the non-TypeScript toolkit, and TypeScript
duplicates it.

## What TypeScript generators actually share with each other

Measured at symbol level across all seven TypeScript-family generators (`typescript`, `zod`, `mock`,
`swr`, `tanstack-query`, `transformers`, `cli`), excluding each generator's own modules.

**Genuinely TypeScript-specific and shared — four functions, 27 lines:**

| Symbol        | Module          | Lines | Used by                                             |
| ------------- | --------------- | ----- | --------------------------------------------------- |
| `safeIdent`   | `identifier.ts` | 6     | mock, tanstack-query, transformers, zod, typescript |
| `pascalCase`  | `support.ts`    | 3     | mock, swr, transformers, zod, typescript            |
| `codeLiteral` | `ts-literal.ts` | 13    | typescript, mock, zod                               |
| `codeString`  | `identifier.ts` | 5     | typescript, tanstack-query                          |

**Shared but not TypeScript-specific** — the generator contract and output plumbing:
`Generator` (7×), `anchor` (7×), `HEADER` (7×), `CodeSample`/`SampleContext` (2×), `DateType` (2×).

**Shared but IR analysis, misfiled into `emitters/`:**
`isSseOp` (3×), `resolveModelPagination` (2×), `PaginationConfig` (2×).

**Used by the `typescript` generator alone** — the "shared TypeScript emitter layer" is largely a
myth; this is one generator's body living in a shared directory:
`tsType`, `tsJsdoc`, `renderTypeAliases`, `operationSignature`, `templatePathParams`, `descriptor`,
`type-guards`, `reserved-names`, `response-headers`, `inline-runtime`, `runtime-sources`,
`render-client`, `client-assembly`.

**Cross-generator edges — exactly two in the entire package:**
`cli → typescript` for `embedCliRuntime` and `flatInputShape`.
Both lie along the `requires: ['typescript']` edge `cli` already declares.

**One two-generator cluster:** `wrapper-support.ts` (98 lines — `wrappableOperations`, `isQuery`,
`hasInputs`, `variablesName`, `sdkCallText`, `sdkNamedImportText`), used by `swr` and
`tanstack-query` only.
This is not incidental overlap: it is the **ABI of the generated TypeScript SDK**, derived from
`operationSignature`, which `typescript` owns.

## Duplications and conflicts

Twelve concrete defects, each verifiable in the current source.

| #   | Finding                                                                                                                                                                                                                                                                                                               | Evidence                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | **Two identifier systems.** `authoring/naming.ts` says so in its own header: _"TypeScript keeps its specialized sanitizer in emitters/identifier.ts; this is for the other output languages."_                                                                                                                        | `authoring/naming.ts:1-4`                                                                         |
| 2   | **`TS_RESERVED` is duplicated.** Two 44-word lists that must be hand-synced.                                                                                                                                                                                                                                          | `emitters/identifier.ts` vs `RESERVED_WORDS.typescript`                                           |
| 3   | **Opposite reserved-word conventions.** `sanitizeIdentifier` prefixes (`_class`); `identifierFor` suffixes (`class_`). Same problem, two answers, split by language accidentally.                                                                                                                                     | `identifier.ts:76`, `naming.ts:82`                                                                |
| 4   | **Two TypeScript string escapers with different security policies.** `codeString` escapes U+2028/U+2029; `sanitizeCodeString` also escapes `<`/`>` to stop a `</script>` breakout. Which protection applies depends on which one the caller imported.                                                                 | `identifier.ts:87`, `ts-literal.ts:21`                                                            |
| 5   | **Python and Go have no string escaper.** They call `JSON.stringify` inline — **19 sites in python, 28 in go** — relying on JSON escaping being close enough to Python and Go literal syntax. No policy, no test.                                                                                                     | `python/index.ts`, `go/index.ts`                                                                  |
| 6   | **Two pagination resolvers implementing the same three-source precedence.** `paginationRuleFor` (declaration-only) and `resolveOperationPagination` (verifies fit, reports errors). Python goes through one, TypeScript the other — **they can disagree about whether an operation paginates.**                       | `authoring/pagination.ts`, `emitters/pagination.ts`                                               |
| 7   | **Four hand-rolled doc-comment writers**, each re-deriving real per-language subtleties.                                                                                                                                                                                                                              | `writeDocstring` (py), `writeDocComment` (go), `writeDocComment` (php), `renderTitleComment` (ts) |
| 8   | **TypeScript syntax inside a "neutral" const.** `HEADER` is a hardcoded `//` comment, which is why `pythonGenerator` hand-writes its own `#` header.                                                                                                                                                                  | `emit-options.ts:13`                                                                              |
| 9   | **Indent units passed at call sites.** `new Printer('    ')`, `new Printer('\t')` — invisible in review.                                                                                                                                                                                                              | `python/index.ts:234`, `go/index.ts:172`                                                          |
| 10  | **`anchor` is a four-line `path.parse` wrapper** used by all seven TypeScript generators; python re-implements it as `pythonModulePath`.                                                                                                                                                                              | `generators/anchor.ts`, `python/index.ts:806`                                                     |
| 11  | **ADR-0001 and ARCHITECTURE.md describe deleted code.** Both document `ts.factory` AST codegen via `emitters/ts.ts` and `emitters/package-client.ts`. Neither module exists; every generator emits text. `jsdoc.ts` still refers the reader to `ts.ts`'s helper.                                                      | `docs/adr/0001`, `ARCHITECTURE.md`, `jsdoc.ts:12`                                                 |
| 12  | **`flatInputShape` contains no TypeScript.** It takes `OperationModel` + `NamedSchemaModel[]`, counts names, returns a verdict. It is TypeScript-only because it lives in `render-client.ts`. Python, Go, and PHP each re-derive the same collision question via `uniqueIdentifiers(…, { taken: METHOD_ARG_SLOTS })`. | `render-client.ts:174`, `python/index.ts:509`, `go/index.ts:494`, `php/index.ts:550`              |

Findings 4, 5, and 6 are correctness or security issues, not tidiness.

## Where each helper lands

Five destinations.
The rule: **facts belong on the data, syntax belongs on the printer, shape belongs to the generator.**

### 1. Neutral toolkit — `@redocly/client-generator`

Language-agnostic analysis over the IR, plus the authoring contract.

| Keep                                                                                                                      | Add (re-homed from `emitters/`)                              |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `Printer` (structure only), `casing`, `identifierFor`, `uniqueIdentifiers`, `RESERVED_WORDS`                              | `inputNameCollisions` — the neutral half of `flatInputShape` |
| `flattenAllOf`, `discriminatorCases`, `isNullable`, `unwrapNullable`, `enumValues`, `schemaAtPointer`, `headerCoerceType` | —                                                            |
| `docText`, `renderReferencePage`, `NotSupportedError`                                                                     | —                                                            |
| `Generator`, `GeneratorInput`, `CodeSample`, `SampleContext`, `DateType`                                                  | —                                                            |

**Removed by becoming data rather than helpers:**

| Helper                                                                        | Becomes                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `isSseOp`, `eventSchema`, `sseDataKind`                                       | `op.sse?: { eventSchema?, dataKind }` — computed once by the IR builder |
| `paginationRuleFor` + `resolveModelPagination` + `resolveOperationPagination` | **one** resolver, run once by the pipeline → `input.pagination`         |
| `anchor`                                                                      | `input.output: { path, dir, stem, ext }`                                |
| `HEADER`, `banner`, `renderTitleComment`                                      | `input.banner: string[]` (content) + `printer.doc()` (syntax)           |

### 2. Language printers — `@redocly/client-generator/printers/<language>`

Syntax mechanics with exactly one right answer.
The boundary: **the printer owns syntax, the generator owns shape.**
No `class()`, `func()`, `method()`, or `signature()` helpers — those stay template literals so the
emitted code remains visible to whoever edits the generator next.

Common core: `typeName`, `memberName`, `identifier`, `identifiers`, `string`, `literal`, `comment`,
`doc`, plus a `layout(source)` pass and a baked-in `indentUnit`.

| Printer             | Absorbs                                                                                                                                                                                      | Language-specific extension                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `TypeScriptPrinter` | `pascalCase`, `safeIdent`, `uniqueIdent`, `sanitizeIdentifier`, `codeString` + `sanitizeCodeString` (merged on the stricter policy), `codeLiteral`, `escapeJsDoc`, `jsdocText`, `splitLines` | `key(name)` — bare-or-quoted object key. No other language has quotable keys.            |
| `PythonPrinter`     | `className`, `fieldName`, `pythonLiteral`, `writeDocstring`, `Printer('    ')`                                                                                                               | `constName` (SCREAMING_SNAKE); `memberName` reports whether it renamed, for `_field_map` |
| `GoPrinter`         | `exported` (incl. the `_`→`N` rule), `writeDocComment`, `Printer('\t')`                                                                                                                      | `layout` = `gofmtShape` + `alignGoColumns`; `packageName` validation                     |
| `PhpPrinter`        | `className`, `propertyName`, `phpString`, `writeDocComment`                                                                                                                                  | `doc` takes `tags` — PHP's `array`/`\Generator` erase element types                      |

Two notes on the extensions.
Go's `exported` carries knowledge that must not be re-derived: `identifierFor` prefixes `_` for a
digit-leading name, and in Go a leading `_` means **unexported**, so `encoding/json` would silently
skip the field.
Go's `layout` cannot be done line-by-line — column padding depends on the widest member of a run of
adjacent lines, which is not known when the first line is emitted.

### 3. Generator-owned — `src/generators/<name>/`

Everything that decides output _shape_.

This runs in both directions.
The TypeScript-family generators **gain** the modules that are theirs alone, as `emitters/` dissolves.
The single-file generators are **split** into the same stages rather than left whole — `python`
(953 lines), `go` (1169), and `php` (1092) are self-contained already, but the uniform skeleton is
what makes them comparable, and their existing functions re-group into it without rewriting:

| Stage        | python                                                           | go                                         | php                                                           |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| `naming`     | `className`, `fieldName`, `operationIdents`                      | `exported`, `goOperationIdents`            | `className`, `propertyName`, `methodName`                     |
| `types`      | `pythonType`                                                     | `goType`                                   | `phpType`, `phpNullable`, `phpUnionType`                      |
| `models`     | `writeDataclass`, `renderPythonModels`, `pydanticDiscriminators` | `writeStruct`, `renderGoModels`            | `writeClass`, `renderPhpModels`, `hydration`, `serialization` |
| `descriptor` | `securitySpecs`, `paginationSpec`, `envelopeHeaderSpecs`         | `goSecurityLiteral`, `goPaginationLiteral` | `phpSecurityLiteral`, `phpPaginationLiteral`                  |
| `operations` | `writeMethod`                                                    | `writeGoMethod`                            | `writePhpMethod`, `methodArgs`, `writeRequestSetup`           |
| `pagination` | `writePaginationWrappers`                                        | `writeGoPaginationWrappers`                | `writePhpPaginationWrappers`                                  |
| `client`     | `writePythonServers`, `writeClientClass`                         | `writeGoServers`                           | `writeServers`                                                |

`emitters/` dissolves entirely:

| Generator        | Absorbs                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typescript`     | `client-assembly`, `render-client`, `descriptor`, `type-guards`, `reserved-names`, `response-headers`, `operation-types`, `operations`, `inline-runtime`, `runtime-sources`, `ts-type`, `emit-options` |
| `zod`            | `zod.ts`                                                                                                                                                                                               |
| `mock`           | `mock.ts`, `mock-value.ts`, `faker.ts`, `sample.ts`                                                                                                                                                    |
| `cli`            | `cli.ts`, `cli-docs.ts`                                                                                                                                                                                |
| `swr`            | `swr.ts`                                                                                                                                                                                               |
| `tanstack-query` | `tanstack-query.ts`                                                                                                                                                                                    |
| `transformers`   | `transformers.ts`                                                                                                                                                                                      |

### 4. Generator contracts — `@redocly/client-generator/contracts/<name>`

A generator's published output ABI, importable **only** along a declared `requires` edge.

`contracts/typescript` exports `operationSignature`, `templatePathParams`, `variablesName`,
`hasInputs`, `isQuery`, `sdkCallText`, `sdkNamedImportText`, `wrappableOperations`, `flatInputShape`
— consumed by `swr`, `tanstack-query` (`requires: ['typescript']`), and `cli`
(`requires: ['typescript', 'zod']`).

Duplicating `wrapper-support` into swr and tanstack-query would put the SDK's ABI in two places,
which is exactly the drift its own header says it exists to prevent.

### 5. Deleted

`emitters/setup-bake.ts` stays (reached via a dynamic import from `pipeline.ts`), but these go:

- The duplicate `TS_RESERVED` list.
- One of the two TypeScript string escapers.
- One of the two pagination resolvers.
- `anchor.ts`, `sse.ts`, `support.ts`, `jsdoc.ts`, `identifier.ts`, `ts-literal.ts` as standalone modules.
- **The root entry's client-runtime exports** — `createClient`, `ApiError`, `TimeoutError`,
  `mergeSetup`, `defaultRetryOn`, `runCli`, `invokedName`, and the runtime type surface
  ([ADR-0022](./adr/0022-runtime-inline-or-module.md)).
  The setup contract stays public and moves up a layer: it is defined at package level and the
  TypeScript runtime imports it, inverting today's `runtime-contract.ts` → `runtime/types.ts`
  direction so the root never reaches into a generator folder.
- **`entry-weight.test.ts`** — with no app-runtime consumer of the package root, the constraint it
  guards stops existing.

## Behavior changes in scope

Three items change output bytes.
All three are in scope for the rewrite — the package is experimental, and each fixes a defect rather
than relocating code — but each lands with its own tests and snapshot updates so a byte change is
reviewed as a behavior change rather than disappearing inside a large move:

1. **`string()` for Python and Go.** Defining a real escaping policy replaces 47 raw `JSON.stringify`
   calls and will differ for some inputs (non-ASCII, U+2028/U+2029, Go rune escapes).
2. **Merging the two TypeScript escapers.** Adopting the stricter policy means `<`/`>` are escaped in
   places that previously left them literal.
3. **Unifying the pagination resolvers.** Wherever the two disagree today, one language's output changes.

## Stale documentation to fix alongside

- **ADR-0001** documents `ts.factory` AST codegen. Superseded by the printer ADR.
- **ARCHITECTURE.md** describes `emitters/ts.ts`, `emitters/package-client.ts`, and a `getWriter`
  pipeline seam. None exist.
- **`jsdoc.ts:11`** refers the reader to `ts.ts`'s `jsdoc` helper, which was deleted.
