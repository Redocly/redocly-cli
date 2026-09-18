# Recheck contributor guide

This document covers the build/test/release gotchas a contributor working on
Recheck itself runs into.
If you're adding or porting a lint rule, see
[`src/rules/CONTRIBUTING.md`](src/rules/CONTRIBUTING.md) instead — that file
is specifically about authoring assertions (scope rules and token rules); this
one is about everything else.

## Commands

Run these from the repository root:

```bash
npm run compile                                     # build lib/ from src/
npm run typecheck                                   # type-check without emitting
VITEST_SUITE=unit npx vitest run packages/recheck   # run this package's unit tests
npm run lint                                        # run oxlint
npm run format                                      # run oxfmt --write
```

## `scripts/generate-examples.mjs` and `oxfmt` are coupled — don't skip the regenerate step

The repo's pre-commit hook runs `npm run lint` and `oxfmt --write` over every
staged file, YAML included.
See the `lint-staged` config in the root `package.json`.
`oxfmt` has its own opinion on quote style that the example
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

The generator reads the built `lib/`, so compile first:

```bash
npm run compile
node scripts/generate-examples.mjs
```

Then confirm the drift test passes:

```bash
VITEST_SUITE=unit npx vitest run packages/recheck
```

## The built-in Realm Markdoc schema

`src/data/markdoc-realm-schema.ts` is generated from the Realm theme source, which lives in the Redocly monorepo.
Regenerate it there with `scripts/generate-markdoc-schema.mjs` pointed at this checkout, and copy the result into this file.
The drift test that compares the two runs in the monorepo, not here.
