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
  aliases. A DISCRIMINATED union registers its dispatch table in the runtime's
  `DISCRIMINATORS` registry (`DISCRIMINATORS[Pet] = ("petType", {"cat": Cat, ...})`),
  and `decode()` routes through it — `isinstance` narrowing works on decoded members.
  Undiscriminated unions decode by trying each member in order (the first that
  hydrates wins — see `_decode.py`). **allOf** is flattened via `flattenAllOf`.
- **Errors:** `errorMode` maps to raising `ApiError` (default) or returning a `Result`
  dataclass — the only generator with both modes outside TypeScript.
- **Response headers:** an operation that DECLARES success-response headers gains a
  `<op>_with_headers()` variant (sync and async) returning `Envelope[T]` — `data`,
  `headers` (coerced to int/bool/str with snake_case keys; absent/unparsable values
  omitted), and the raw `response`. Operations without declared headers get no
  variant, and the base method stays body-only.
- **Servers:** when the description declares servers, a `Servers` class is emitted with
  one static method per server; server VARIABLES become keyword arguments defaulting to
  the spec's defaults (`Servers.production(organization_id="org_x")`), so templated base
  URLs need no manual string building. The client's baked default stays `servers[0]`
  with variable defaults substituted.
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
   and the large-description bars (`tests/e2e/generate-client/large-descriptions.test.ts`).
