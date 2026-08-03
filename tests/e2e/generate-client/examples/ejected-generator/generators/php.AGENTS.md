# The `php` generator — its skill

This file is the generator's DESIGN. It ships to users on `redocly eject-generator php`
(as `generators/php.AGENTS.md`) and governs our own changes: **to change the generator,
edit this skill first, then make the code match it** — a diff to `index.ts` that has no
covering sentence here is incomplete.

## What it emits

One self-contained `<stem>.php`: promoted-constructor model classes, a `Client` with one
typed method per operation, and the embedded runtime. PHP ≥ 8.1, HTTP over the curl
extension — zero Composer dependencies. The namespace derives from the API title
(`identifierFor(title, pascal)` — e.g. `RedoclyCafe`).

## Design decisions that must hold

- **Models are `final class`es** with constructor property promotion, required parameters
  first, optionals nullable `= null`. Hydration is compile-time generated per class:
  `fromArray(array $data): self` and `toArray(): array` (wire names inline; nulls
  skipped on serialize) — no reflection. `omit` schemas hydrate/serialize through their
  base class.
- **Naming:** classes PascalCase, properties/methods camelCase via
  `identifierFor(..., RESERVED_WORDS.php)`; reserved words get a trailing underscore.
- **Enums** are native backed enums (string/int); other scalars stay aliases.
  **Discriminated unions** are `match`-based `unmarshalX(array $data)` dispatchers;
  **allOf** is flattened.
- **Errors:** exceptions ARE the error mode (`ApiError`/`TimeoutError` extend
  `\RuntimeException`); `errorMode` does not change the output.
- **Method arguments:** required path params positional, JSON body next, optional query
  params as nullable NAMED arguments, then `?array $headers`, and `?string
$idempotencyKey` on mutating methods.
- **Parity surface:** auth, retries with `Retry-After` + jittered backoff, per-attempt
  curl timeouts, middleware callables, pagination (`<op>Pages()` / `<op>Items()` as
  `\Generator`s), SSE (`iterSse` over a curl_multi pump), multipart.
- The runtime is hand-written in `php-runtime/runtime.php` (`php -l`-clean) and embedded
  at prepare time. `curl_close` is never called (deprecated since PHP 8.5, no-op since 8.0).
- Authored ONLY with the neutral toolkit — the dogfooding guard fails otherwise.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change `index.ts` (and `php-runtime/runtime.php` for runtime behavior; `php -l` it,
   then `npm run prepare -w @redocly/client-generator`).
3. Verify: `npm run compile`, then
   `VITEST_SUITE=unit npx vitest run packages/client-generator/src/generators/__tests__/php.test.ts`
   (real `php -l` + `require` bars), the e2e smoke (`tests/e2e/generate-client/php.test.ts`),
   and `npm run harness`.
