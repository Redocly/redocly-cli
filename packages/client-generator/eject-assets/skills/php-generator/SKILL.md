---
name: php-generator
description: Design of the ejected Redocly `php` client generator. Read it, and update it, before changing generators/php/.
---

# The `php` generator — its skill

This file is the DESIGN of your ejected `php` generator (`generators/php/`):
**to change the generator, edit this skill first, then make the code match it** — a diff
to `generators/php/` that has no covering sentence here is incomplete.

## What it emits

One self-contained `<stem>.php`: promoted-constructor model classes, a `Client` with one
typed method per operation, and the embedded runtime. PHP ≥ 8.1, HTTP over the curl
extension — zero Composer dependencies. The namespace derives from the API title
(`identifierFor(title, pascal)` — e.g. `CafeOrders`).

## Design decisions that must hold

- **Models are `final class`es** with constructor property promotion, required parameters
  first, optionals nullable `= null`. Hydration is compile-time generated per class:
  `fromArray(array $data): self` and `toArray(): array` (wire names inline; nulls
  skipped on serialize) — no reflection. `omit` schemas hydrate/serialize through their
  base class. A property or response typed as a DISCRIMINATED union hydrates through the
  union's `unmarshalX` dispatcher, so consumers can narrow with `instanceof`;
  undiscriminated unions stay raw arrays.
- The `Client` class is NOT `final` — PHP test suites mock concrete classes
  (`createMock(Client::class)`), and `final` would force a wrapper interface on every
  consumer. Model classes stay `final`.
- **Every parameter is its own argument, so their names share one namespace** with the
  arguments the method declares itself (`$body`, `$headers`, `$idempotencyKey`). Build them with
  `uniqueIdentifiers(..., { taken: … })`: OpenAPI lets one operation use a name in two
  locations (`id` in the path AND in the query), and PHP rejects a redefined parameter outright. The
  wire name is untouched, so the request is unchanged.
- **Naming:** classes PascalCase, properties/methods camelCase via
  `identifierFor(..., RESERVED_WORDS.php)`; reserved words get a trailing underscore.
- **Enums** are native backed enums (string/int); other scalars stay aliases.
  **Discriminated unions** are `match`-based `unmarshalX(array $data)` dispatchers;
  **allOf** is flattened.
- **Unions keep their types where PHP 8.1 can express them.** A union of scalars, enums,
  classes, or arrays becomes a native union type (`int|string`, `PromotionType|array`)
  rather than collapsing to `mixed` — rich list filters are the common case and losing
  their types loses the point of a typed SDK. It falls back to `mixed` only when a member
  has no PHP type of its own (an inline object, an intersection, `unknown`), because
  `mixed` cannot appear inside a union. Nullability is expressed as `|null` in a union
  (PHP forbids mixing `?` with `|`) and `?T` for a single type.
- **Errors:** exceptions ARE the error mode (`ApiError`/`TimeoutError` extend
  `\RuntimeException`); `errorMode` does not change the output (the generator declares
  `errorModes: ['throw']`, so `result` fails fast).
- **Dates:** `dateType: Date` types `format: date`/`date-time` as
  `\DateTimeImmutable`; hydration is `new \DateTimeImmutable(...)` and serialization
  formats with `\DateTimeInterface::ATOM` (date-time) or `'Y-m-d'` (date), including
  for query parameters.
- **Method arguments:** required path params positional, JSON body next, optional query
  params as nullable NAMED arguments, then `?array $headers`, and `?string
$idempotencyKey` on mutating methods.
- **Non-JSON success bodies** (PDFs, images, octet streams) return the raw body as
  `string` — a binary download must never degrade to `void`.
- **PHPDoc carries what the signature cannot.** PHP's `array` and `\Generator` erase their
  element type, so a docblock states it: `@return Customer[]` for collection returns and
  `@return \Generator<int, Customer>` on `<op>Pages()`/`<op>Items()`. Static analysis and
  readers go by these; a hydrated return with no annotation looks untyped.
- **Response headers:** an operation that DECLARES success-response headers gains a
  `<op>WithHeaders()` variant returning an `Envelope` (`data`, `headers` — coerced to
  int/bool/string with camelCase keys, absent/unparsable values omitted — and `status`).
  Operations without declared headers get no variant, and the base method stays
  body-only (PHP cannot vary a return type on a flag).
- **Servers:** when the description declares servers, a `Servers` class is emitted with
  one static method per server; server VARIABLES become named string arguments defaulting
  to the spec's defaults (`Servers::production(organizationId: 'org_x')`), so templated
  base URLs need no manual string building. The client's baked default stays `servers[0]`
  with variable defaults substituted.
- **Parity surface:** auth, retries with `Retry-After` + jittered backoff, per-attempt
  curl timeouts, middleware callables, pagination (`<op>Pages()` / `<op>Items()` as
  `\Generator`s), SSE (`iterSse` over a curl_multi pump), multipart.
- The runtime is hand-written in `runtime/runtime.php` in this folder (`php -l`-clean) and embedded
  at prepare time. `curl_close` is never called (deprecated since PHP 8.5, no-op since 8.0).
  Under `--runtime module` it is written as a `runtime.php` the client `require_once`s,
  with its namespace rewritten to the client's so one namespace spans both files.
- Authored ONLY with the neutral toolkit — the dogfooding guard fails otherwise.

## Migrating from a service-based SDK

- Per-resource services (`$client->customers()->get($id)`) map to flat methods named
  after operationIds (`$client->getCustomer($id)`); optional query params keep their
  named-argument style (`filter:`, `sort:`, `limit:`).
- Collection wrappers exposing pagination RESPONSE HEADERS (`getTotalItems()`,
  `getLimit()`) map to the `<op>WithHeaders()` envelope
  (`->headers['paginationTotal']`); plain iteration maps to `<op>Items()` /
  `<op>Pages()` generators.
- Dedicated validation-exception classes exposing field errors map to
  `catch (ApiError $e)` + `$e->status === 422` + the decoded `$e->body`.
- Session/bearer token flows map to `auth: ['bearer' => $tokenProvider]` with a
  callable — resolved per request, so refresh needs no client rebuild.

- **It documents itself.** With `client.docs` (or `--docs`), the `docs` hook writes
  `<stem>.php.md`: the security schemes, then one section per operation with its parameters,
  body, response type, and behavior notes. The call snippets come from this generator's own
  `sample` hook, so the page can only show the syntax of the SDK beside it, and the layout
  comes from `renderReferencePage` in the authoring toolkit — reachable from an ejected copy
  through `@redocly/client-generator`. Pagination on the page is decided by
  `paginationRuleFor`, the same helper this generator resolves pagination with.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Make `generators/php/` match it.
3. Run `redocly generate-client` and inspect the `git diff` of the generated output —
   generated files are never hand-edited.

Newer built-in versions merge in with `redocly eject-generator php --update`.
