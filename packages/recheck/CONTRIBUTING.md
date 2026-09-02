# Contributing to Recheck

This document covers the build/test/release gotchas a contributor working on
Recheck itself runs into. If you're adding or porting a lint rule, see
[`src/rules/CONTRIBUTING.md`](src/rules/CONTRIBUTING.md) instead — that file
is specifically about authoring assertions (scope rules and token rules); this
one is about everything else.

## The stale `tsconfig.tsbuildinfo` trap

**If `pnpm build` looks like it did nothing** (output missing, stale, or not
reflecting a source change you just made) — `pnpm build` can silently no-op
and still report success. TypeScript's incremental build considers
`tsconfig.tsbuildinfo` (and `tsconfig.typecheck.tsbuildinfo`) authoritative for
"are the outputs up to date," so it can skip regenerating `dist/` even after
`dist/` itself has been deleted, if those cache files still exist and look
current. Delete **both** the `dist/` directory and the `*.tsbuildinfo` files
before rebuilding if output ever looks wrong — deleting `dist/` alone is not
sufficient:

```bash
rm -rf dist tsconfig.tsbuildinfo tsconfig.typecheck.tsbuildinfo
pnpm build
```

This has caught contributors (and reviewers reading a stale `dist/`) more than
once.

## `pnpm parity` requires `--corpus`

Unlike `pnpm build`/`pnpm test`, `pnpm parity` has no default corpus — a bare
invocation exits with status 2 and a usage error:

```
Usage: node benchmarks/parity/run-parity.mjs --corpus <name> [--profile default|rebilly] [--rules MD001,MD013]
```

Always pass `--corpus` explicitly, e.g.:

```bash
pnpm parity --corpus monorepo-docs --profile default
```

`--profile` defaults to `default` (recheck/markdown preset vs. markdownlint's
own defaults) if omitted; pass `--profile rebilly` to diff against a real
`.markdownlint.yaml` instead. See `benchmarks/parity/run-parity.mjs` for the
list of known corpora — an unrecognized `--corpus` value fails fast with the
same kind of usage error, naming the corpora it does know about.

## The Markdoc schema drift test needs a fresh theme build, and only works in this monorepo

`src/data/markdoc-realm-schema.ts` (the built-in `MARKDOC_REALM_SCHEMA` that `markdoc:
true` / `{ schema: 'realm' }` resolves to) is generated, not hand-written. It comes from
the composed Markdoc configuration Realm renders with: `@markdoc/markdoc`'s built-in tags,
overridden by `packages/portal`'s built-in tags, overridden by `packages/theme`'s tag map.

`src/data/__tests__/markdoc-realm-schema.test.ts` re-resolves that same composition at
test time and fails if it no longer matches the committed file. Editing a tag's schema in
theme or portal without regenerating therefore breaks the test, by design.

Regenerate with:

```bash
pnpm markdoc-schema:generate            # writes src/data/markdoc-realm-schema.ts
pnpm markdoc-schema:generate --check    # exits 1 if the file would change; writes nothing
```

Two things to get right:

- **Build `packages/theme` first.** The generator resolves `@redocly/theme/markdoc/default`
  to that package's built `lib/` output (via its `exports` map), not to `src/`. A stale
  build — theme compiled a while back, its tags edited since — resolves successfully
  against out-of-date definitions, so it produces a wrong schema with nothing obviously
  broken about it. Run `nx run @redocly/theme:build` (or `pnpm --filter @redocly/theme run
build`) before regenerating if you've touched a theme tag definition. The generator's
  `assertThemeBuildIsFresh` check refuses to run in both failure cases: a missing
  `lib/markdoc/` throws immediately, and an mtime comparison of every `src/markdoc/` file
  against every `lib/markdoc/` file catches a build that merely predates a source edit.
- **Use the package script, not a bare `tsx`/`node` invocation.** `packages/portal`'s tag
  modules are TypeScript source with no built JS output, so the generator needs `tsx`'s
  esbuild-based loader to resolve their imports — and the repo root carries a stale `tsx`
  shim that `npx tsx` prefers over the real devDependency. `pnpm markdoc-schema:generate`
  resolves the correct one; running the script directly with `npx tsx` or plain `node`
  may not.

**Both the generator and the drift test only work inside this monorepo.** They import
`@redocly/theme` as a package dependency and read `packages/portal`'s TypeScript source by
relative path, which only resolves while `packages/recheck` sits in the same pnpm
workspace as theme and portal. Moving recheck to another repository would break both
imports, and neither this document nor the current code picks a replacement — the likely
options are comparing against theme's published package or running a separate cross-repo
check.

## `scripts/generate-examples.mjs` and `oxfmt` are coupled — don't skip the regenerate step

The repo's pre-commit hook runs `oxfmt --write` over every staged file, YAML
included (see the root `package.json`'s `lint-staged` config, `**/*` ->
`oxfmt --write`). `oxfmt` has its own opinion on quote style that the example
generator's YAML serializer doesn't match by default, so
`scripts/generate-examples.mjs` runs `oxfmt` itself on its own output (inside
`renderExample()`, the one function both the CLI and the drift test call) —
this is what keeps a freshly generated file byte-identical to what the
pre-commit hook would otherwise rewrite it to.

**Practical consequence**: if you change the generator's formatting (or
anything that affects `examples/*.yaml`/`examples/appendices/*.yaml`), you
must regenerate and re-commit the generated files in the same change, or
`examples-drift.test.ts` will fail for the next person — the committed files
and a fresh render need to match exactly, and only running `oxfmt` by hand
without regenerating (or vice versa) will not produce that match.

```bash
pnpm examples:generate
```

Run this after touching `scripts/generate-examples.mjs`, before committing.
