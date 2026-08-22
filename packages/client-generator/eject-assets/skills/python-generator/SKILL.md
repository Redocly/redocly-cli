---
name: python-generator
description: Design of the ejected Redocly `python` client generator. Read it, and update it, before changing generators/python/.
---

# The `python` generator — its skill

This file is the DESIGN of your ejected `python` generator (`generators/python/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/python/` that has no covering sentence here is incomplete.

## What it emits

One self-contained `<stem>.py`: typed dataclass models, a sync `Client` and an async
`AsyncClient`, and the embedded runtime. Python ≥ 3.9; the only dependency is
[httpx](https://www.python-httpx.org/) (`pip install httpx`).

## Design decisions that must hold

- **The file name is an importable module name.** The `--output` stem follows the TypeScript
  convention (`openapi.client.ts`), and `openapi.client.py` cannot be imported by name — nor
  can hyphens or a leading digit. The stem is converted with
  `identifierFor(stem, snake)`, so `rebilly-core.client.ts` emits
  `rebilly_core_client.py` and `import rebilly_core_client` just works.

- **Models are dataclasses by default**, required fields first (a dataclass constraint),
  optionals `Optional[T] = None`. Wire names live in a `_field_map: ClassVar[Dict[str, str]]`;
  decode/encode is reflective (`_decode.py`, `get_type_hints`) — no per-model codecs.
- **`models: pydantic` emits `BaseModel` classes instead**, for the FastAPI-shaped half of
  the ecosystem that expects them. A wire name becomes `Field(alias=…)` with
  `populate_by_name=True`, so `_field_map` is not emitted in this mode — the alias is the
  mapping. Everything else is unchanged: the same class names, the same field names, the
  same `Optional[T] = None`, the same enums and union aliases, the same client and runtime.
  Switching modes must not change a call site.
- **A discriminated union carries its discriminator into the pydantic annotation.** The
  decoder hands a whole object tree to `model_validate`, so a union nested in a model is
  resolved by pydantic and never reaches the `DISCRIMINATORS` table that dataclass mode
  walks. Pydantic resolves it correctly from `Annotated[Union[...], Field(discriminator=…)]`,
  which it accepts only when every member types that property as a `Literal` — and the
  mapping already pins one value per member, so the members get `Literal["cat"]`. Such a
  union registers no table entry: pydantic owns it at every depth, and the `Literal` makes
  the decoder's member probe exact. A union whose members never declare the property keeps
  the plain `Union` and the table entry, and pydantic then matches nested members its own
  way — the description is what has to change there.
- **One runtime serves both model modes.** `_decode.py` dispatches on the target: a class
  with `model_validate` is validated by pydantic, a dataclass is hydrated reflectively, and
  `encode` mirrors that with `model_dump(by_alias=True, exclude_none=True, mode="json")`.
  A second runtime variant per mode would double the surface that has to stay in step, and
  pydantic's `ValidationError` already subclasses `ValueError`, so union member probing
  needs no new except clause.
- **`models: pydantic` adds a dependency, and the header says so.** The default mode keeps
  httpx as the only requirement; the pydantic header asks for both. A mode that quietly
  needed a package the file never named would fail at import with nothing to act on.
- **Every parameter is its own argument, so their names share one namespace** with the
  arguments the method declares itself (`body`, `headers`, `timeout`, `retry`, `idempotency_key`). Build them with
  `uniqueIdentifiers(..., { taken: … })`: OpenAPI lets one operation use a name in two
  locations (`id` in the path AND in the query), and a `def` that declared one name twice is a `SyntaxError`. The
  wire name is untouched, so the request is unchanged.
- **Naming:** fields/methods snake*case via `identifierFor(..., RESERVED_WORDS.python)`;
  reserved words get a trailing underscore (`class*`); `+1`/`-1`become`plus_1`/`minus_1`.
- **Enums** are `class X(str, Enum)` with SCREAMING members; **unions** are `Union[...]`
  aliases. A DISCRIMINATED union registers its dispatch table in the runtime's
  `DISCRIMINATORS` registry (`DISCRIMINATORS[Pet] = ("petType", {"cat": Cat, ...})`),
  and `decode()` routes through it — `isinstance` narrowing works on decoded members.
  Undiscriminated unions decode by trying each member in order (the first that
  hydrates wins — see `_decode.py`). **allOf** is flattened via `flattenAllOf`.
- **Auth keys match the other languages.** `auth={"apiKey": {...}}` is the documented key —
  the same spelling TypeScript and PHP use, and the same as the scheme kind — with
  `api_key` accepted as an alias so a snake_case config keeps working.
- **Errors:** `errorMode` maps to raising `ApiError` (default) or returning a `Result`
  dataclass — the only generator with both modes outside TypeScript.
- **Dates:** `dateType: Date` annotates `format: date-time` as `datetime` and `date` as
  `date`; `_decode.py` parses ISO strings into them and `encode()` writes `isoformat()`
  back. The default (`string`) keeps the wire shape.
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
- The runtime is hand-written in `runtime/*.py` in this folder and embedded as strings at prepare
  time — generator code never builds runtime logic from templates.
  Under `--runtime module` the same sources are written as sibling `_*.py` files instead
  (package-relative imports become sibling imports; the client star-imports each module).
- Authored ONLY with the neutral toolkit (`Printer`, naming, schema, pagination helpers) —
  the dogfooding guard fails otherwise.

- **It documents itself.** With `client.docs` (or `--docs`), the `docs` hook writes
  `<stem>.python.md`: the security schemes, then one section per operation with its parameters,
  body, response type, and behavior notes. The call snippets come from this generator's own
  `sample` hook, so the page can only show the syntax of the SDK beside it, and the layout
  comes from `renderReferencePage` in the authoring toolkit — reachable from an ejected copy
  through `@redocly/client-generator`. Pagination on the page is decided by
  `paginationRuleFor`, the same helper this generator resolves pagination with.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/python/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator python --update`.
