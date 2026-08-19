---
'@redocly/client-generator': minor
'@redocly/cli': minor
---

Added agent-friendly client generation: `python`, `go`, `php`, and `cli` generators in addition to TypeScript generators.

Added `--docs` (`client.docs`), which writes the reference documentation for what a run generates: each generator documents itself with one Markdown page next to its output.

Added composable generated CLIs (custom commands, one binary over several APIs via `client.cliOutput`).

Added language-neutral authoring toolkit with per-generator options, including `client.options.python.models: pydantic`, which emits `BaseModel` classes instead of dataclasses.

Added an `eject-generator` command that vendors any built-in generator, with its design as an agent skill, into your repo.

Fixed generated Python, PHP, and Go clients for descriptions that use one parameter name in two locations (`id` in the path and in the query, which OpenAPI permits), or a parameter named after an argument the method declares itself (`body`, `headers`, `timeout`, `params`). The later parameter now takes a suffixed name — `id_2` in Python, `$id2` in PHP, `id2` in Go — and the wire names stay as written, so both values still reach the API. Before this, the generated module did not parse at all: a `SyntaxError` in Python, a fatal redefinition in PHP, and a compile error in Go.

Renamed pagination operation extension from `x-redocly-pagination` to `x-redoclyPagination`.
The previous name is no longer read.

**Note**: every generated TypeScript operation now takes ONE input object, and `argsStyle: grouped` is the default. The input groups its values by transport layer — `path`, `query`, `headers`, `cookies`, and `body` as sibling keys — so `updateOrder({ path: { orderId }, body })` replaces the old positional call. `argsStyle: flat` remains, redefined as the same object with the layers merged into one level (`updateOrder({ orderId, ...body })`); it merges the properties of a required object body, and keeps a `body` key for a body it cannot merge. Two smaller consequences: the module-level exports are now bindings of the client's own methods (`export const { updateOrder } = client;`) rather than wrapper functions, so one operation can no longer have two argument shapes; and the query-parameter type alias is `<Op>Query` (was `<Op>Params`), beside a new `<Op>Path`. The compiler points at every call site that needs the edit.

**Note**: the generated TypeScript client no longer exports per-scheme credential setters (`setBearer`, `setBasicAuth`, `setApiKey<Scheme>`). Set credentials with `configure({ auth: … })` or on the instance with `client.auth.bearer(…)`, `client.auth.basic(…)`, and `client.auth.apiKey('<scheme key>', …)`. One consequence is welcome: a setter name is no longer reserved, so an operation or schema of that name keeps it.

**Note**: the TypeScript client generator is now selected as `typescript` instead of `sdk`, matching the language-named generators. Update `client.generators` lists and `--generator` flags; the old name fails with a message that points at the rename.
