# The `python` generator — its skill

This file is the generator's DESIGN. It ships to users on `redocly eject-generator python`
(as `generators/python.AGENTS.md`) and governs our own changes: **to change the generator,
edit this skill first, then make the code match it** — a diff to `index.ts` that has no
covering sentence here is incomplete.

## What it emits

One self-contained `<stem>.py`: typed dataclass models, a sync `Client` and an async
`AsyncClient`, and the embedded runtime. Python ≥ 3.9; the only dependency is
[httpx](https://www.python-httpx.org/) (`pip install httpx`).

## Design decisions that must hold

- **Models are dataclasses**, required fields first (a dataclass constraint), optionals
  `Optional[T] = None`. Wire names live in a `_field_map: ClassVar[Dict[str, str]]`;
  decode/encode is reflective (`_decode.py`, `get_type_hints`) — no per-model codecs.
- **Naming:** fields/methods snake*case via `identifierFor(..., RESERVED_WORDS.python)`;
  reserved words get a trailing underscore (`class*`); `+1`/`-1`become`plus_1`/`minus_1`.
- **Enums** are `class X(str, Enum)` with SCREAMING members; **unions** are `Union[...]`
  aliases, decoded by trying each member in order (the first that hydrates wins — see
  `_decode.py`); a discriminator, when present, is emitted as a table COMMENT on the
  alias, not as runtime dispatch. (Discriminator-driven dispatch is a known improvement
  candidate: update this paragraph first, then `_decode.py`.) **allOf** is flattened via
  `flattenAllOf`.
- **Errors:** `errorMode` maps to raising `ApiError` (default) or returning a `Result`
  dataclass — the only generator with both modes outside TypeScript.
- **Parity surface:** auth (bearer/basic/apiKey), retries with `Retry-After` + jittered
  backoff, timeouts, idempotency keys, middleware, pagination (`<op>_pages()` /
  `<op>_items()` + `aiter` mirrors), SSE (`iter_sse`/`aiter_sse`), multipart.
- The runtime is hand-written in `python-runtime/*.py` and embedded as strings at prepare
  time — generator code never builds runtime logic from templates.
- Authored ONLY with the neutral toolkit (`Printer`, naming, schema, pagination helpers) —
  the dogfooding guard fails otherwise.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change `index.ts` (and `python-runtime/*.py` if runtime behavior changes; then
   `npm run prepare -w @redocly/client-generator` re-embeds).
3. Verify: `npm run compile`, then
   `VITEST_SUITE=unit npx vitest run packages/client-generator/src/generators/__tests__/python.test.ts`
   (real `py_compile` bars), the e2e smoke (`tests/e2e/generate-client/python.test.ts`),
   and `npm run harness` (import bars over the large real-world descriptions).
