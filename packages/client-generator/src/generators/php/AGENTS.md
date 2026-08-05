# The `php` generator — its skill

This file is the generator's DESIGN. It ships to users on `redocly eject-generator php`
(as `generators/php.AGENTS.md`) and governs our own changes: **to change the generator,
edit this skill first, then make the code match it** — a diff to `index.ts` that has no
covering sentence here is incomplete.

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
- **Naming:** classes PascalCase, properties/methods camelCase via
  `identifierFor(..., RESERVED_WORDS.php)`; reserved words get a trailing underscore.
- **Enums** are native backed enums (string/int); other scalars stay aliases.
  **Discriminated unions** are `match`-based `unmarshalX(array $data)` dispatchers;
  **allOf** is flattened.
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
- The runtime is hand-written in `php-runtime/runtime.php` (`php -l`-clean) and embedded
  at prepare time. `curl_close` is never called (deprecated since PHP 8.5, no-op since 8.0).
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

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change `index.ts` (and `php-runtime/runtime.php` for runtime behavior; `php -l` it,
   then `npm run prepare -w @redocly/client-generator`).
3. Verify: `npm run compile`, then
   `VITEST_SUITE=unit npx vitest run packages/client-generator/src/generators/__tests__/php.test.ts`
   (real `php -l` + `require` bars), the e2e smoke (`tests/e2e/generate-client/php.test.ts`),
   and the large-description bars (`tests/e2e/generate-client/large-descriptions.test.ts`).
