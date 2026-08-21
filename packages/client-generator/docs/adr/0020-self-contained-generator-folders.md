# ADR 0020: Self-contained generator folders, ejected as source

- Status: Accepted
- Date: 2026-08-21

## Context

Built-in generators have two incompatible shapes, and `redocly eject-generator` papers over the difference.

`python`, `go`, and `php` are each one self-contained file that imports only the neutral toolkit.
Ejecting one type-strips its own source, so the user reads what we wrote.
The other seven — `typescript`, `zod`, `mock`, `swr`, `tanstack-query`, `transformers`, `cli` — are thin entries over shared `emitters/` modules.
Ejecting one **esbuild-bundles about 24 modules**: the result opens with `__defProp`/`__name` shims, ends with a renamed `entry_typescript_default`, and inlines copies of `authoring/printer.ts`, `authoring/schema.ts`, `authoring/pagination.ts`, and `authoring/reference-page.ts` — code that is already public API and should have been imported.
At 178 kB it is compiler output, not a file anyone owns.

Three further problems follow from the split:

1. **The import rewrite is a string swap.** The eject build does `.replaceAll("'../../authoring/index.js'", "'@redocly/client-generator'")`. Nothing stops a generator from deep-importing `../../authoring/schema.js` or any private emitter, which would silently ship a broken eject.
2. **The two shapes hide that the generators are the same pipeline.** `pythonGenerator` emits header → models → servers → embedded runtime → descriptor table → client class. `emitClient` emits header → schema statements → servers → embedded runtime → ops wiring → descriptor table → client section. Eleven stages line up 1:1. The difference is organizational drift, not architecture.
3. **`emitters/` mixes three unrelated things** — one generator's body, genuinely shared syntax helpers, and IR analysis that contains no TypeScript at all (see [`../helper-surface.md`](../helper-surface.md)).

Measured at symbol level, the seven TypeScript generators share **four functions totalling 27 lines** (`safeIdent`, `pascalCase`, `codeLiteral`, `codeString`).
The rest of `emitters/` is single-owner.
The fear that self-contained generators would duplicate a large shared TypeScript layer is not supported by the code.

## Decision

**Every generator is a self-contained folder, and ejecting copies that folder as TypeScript source.**

1. **One skeleton for every language.** A generator folder is `AGENTS.md`, `index.ts` (`run`/`sample`/`docs`/`options`), and one file per pipeline stage: `naming`, `types`, `models`, `descriptor`, `operations`, `pagination`, `client`, plus `runtime/` where the generator embeds one.
   The skeleton is **descriptive, not prescriptive** — a language omits a stage it does not have (python has no `split`, zod has no `client`), and there are no empty placeholder files.
   An agent that has read `generators/python/` can navigate `generators/typescript/` without re-learning.
2. **The single-file generators are refactored into the same shape — they are not grandfathered.**
   `python`, `go`, and `php` are already self-contained, but self-containment was never the goal on its own: the uniform skeleton is what makes generators comparable, navigable, and reviewable.
   A 953-line `python/index.ts` and a 1169-line `go/index.ts` are past the size anyone holds at once, and leaving them whole would keep exactly the asymmetry this ADR removes — one language you read as a folder, another you read by scrolling.
   The refactor is a **re-grouping, not a rewrite**: python's existing functions already sort into the stages cleanly — `className`/`fieldName`/`operationIdents` into `naming`, `pythonType` into `types`, `writeDataclass`/`renderPythonModels`/`pydanticDiscriminators` into `models`, `securitySpecs`/`paginationSpec`/`envelopeHeaderSpecs` into `descriptor`, `writeMethod` into `operations`, `writePaginationWrappers` into `pagination`, `writePythonServers`/`writeClientClass` into `client`.
   Go and PHP sort the same way.
3. **`emitters/` is dissolved.** Each module moves to the generator that owns it, to a language printer ([ADR-0021](./0021-text-printers.md)), or to the neutral toolkit.
4. **Three import rules, enforced by a guard test.** A generator folder may import only its own files, `@redocly/client-generator`, `@redocly/client-generator/printers/<language>`, `@redocly/client-generator/runtime-sources`, and the contract of a generator it `requires`.
   No relative import may leave the folder.
   `language-dogfooding.test.ts` generalizes from three generators to all ten.
5. **Package specifiers in source, resolved by `paths`.** Source imports the same specifier the ejected file does; a tsconfig `paths` entry maps it to `src/` for typechecking.
   The `replaceAll` rewrite is deleted, and the source/ejected import lines become byte-identical.
6. **Sharing has four tiers, and only four.** The neutral toolkit (IR analysis, contract types, `Printer`); the language printer (syntax); `runtime-sources`; and a required generator's published **contract**.
   `contracts/typescript` exports the generated SDK's ABI — `operationSignature`, `variablesName`, `sdkCallText`, `wrappableOperations`, `flatInputShape` — for the generators that declare `requires: ['typescript']`.
   A generator may never import another generator's internals.
7. **Eject copies the folder as `.ts`.** No esbuild, no bundling, no synthesized entry module, no import rewriting.
   The descriptor default export is still appended from `BUILTIN_META`, which keeps `meta.ts`'s laziness intact.
   `--update` merges per file with the three-way merge already used for skills.
8. **Ejected `.ts` requires a Node floor check at the point of use.** Built-in generators compile to `lib/*.js` and are unaffected; only an ejected folder is TypeScript.
   The resolver checks the running Node version when an entry resolves to a `.ts` file and errors with the required version.

## Consequences

- A user who ejects `typescript` owns eight readable files averaging about 200 lines instead of one 178 kB bundle. Ejected code is the code we wrote, in every language.
- Ejected generators keep full type checking against the IR's 273 lines of model types. An agent editing an ejected generator gets errors at edit time rather than at generation time — the largest single agent-affordance in this plan.
- A `--update` conflict lands in one stage file instead of anywhere in an 1800-line bundle.
- The four sharing tiers are mechanically checkable, so "accidentally imported something not exposed" stops being possible rather than becoming a review item.
- **Cost: a large mechanical migration.** Thirty-plus modules move, and python, go, and php each split from one ~1000-line file into about eight. The diff is enormous and mostly moves.
- **Cost: ejecting requires a newer Node.** Anyone on the current floor who ejects gets a clear error instead of a working generator until they upgrade.
- **Cost: `contracts/typescript` is a new public surface** to version and document. It is the honest name for a dependency that already exists — `swr` and `tanstack-query` already code against the TypeScript SDK's calling convention — but naming it makes it a compatibility obligation.
- Divergence between an ejected generator and a package-side assumption stays possible. The `requiresGenerator` range already in the ejected descriptor is the place to extend a contract-version check.
