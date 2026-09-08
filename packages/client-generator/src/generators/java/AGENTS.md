# The `java` generator — its skill (DRAFT, design under review — no code exists yet)

This file is the generator's DESIGN, written before any implementation (skill-first).
Once approved it ships to users on `redocly eject-generator java` (as the
`.claude/skills/java-generator/SKILL.md` agent skill) and governs all changes: **edit this skill first, then
make the code match it.**

## What it emits

A Java SDK from an OpenAPI description: typed models, a `Client` with one method per
operation, and the embedded runtime. **Java ≥ 17** (records, sealed interfaces,
switch patterns), HTTP over `java.net.http.HttpClient` — part of the JDK since 11.

## ⚠ Open decisions for review (resolve before implementing)

1. **JSON.** Java has NO stdlib JSON. Options:
   - **(Recommended) Hand-written minimal JSON in the embedded runtime** — `Json.parse`
     into a `Map/List/String/Double/Boolean/null` graph plus `Json.write`; ~300 lines,
     verified like the other hand-written runtimes. Keeps the zero-dependency story
     uniform with go/php. Limits (recorded honestly): no streaming parse; integral
     numbers surface as `long`, fractions as `double`.
   - Depend on Jackson — idiomatic and battle-tested, but the first generated SDK with a
     runtime dependency, breaking the story users already know from go/php.
2. **File layout.** Java allows one public top-level class per file, so a single-file SDK
   is impossible in the flat style the other languages use. Options:
   - **(Recommended) Multi-file**: the generator emits a directory —
     `<stem>/Client.java`, one file per model, `Runtime` support classes — under a
     `package` derived from the API title (`com.example` configurable later). First
     generator to use directory output; the pipeline already supports multiple files.
   - Single file with everything nested inside one public class (`Api.Order`,
     `Api.Client`) — keeps single-file symmetry but reads unidiomatic to Java teams.
3. **Errors.** Unchecked `ApiException extends RuntimeException` (recommended — checked
   exceptions on every call poison lambdas/streams), carrying `status`, `url`, decoded
   `body`; `TimeoutException` variant for exhausted attempts.

## Design decisions (settled by precedent with the other languages)

- **Models are records**: required components first; optionals as nullable boxed fields
  (`Integer`, not `int`). Hydration is compile-time generated per record —
  `static Order fromJson(Object json)` and `Object toJson()` over the runtime's JSON
  graph, mirroring PHP's `fromArray`/`toArray` (no reflection). Wire names inline.
- **Every parameter is its own argument, so their names share one namespace** with the
  arguments the method declares itself (`body`, `headers`, `options`). Build them with
  `uniqueIdentifiers(..., { taken: … })`: OpenAPI lets one operation use a name in two
  locations (`id` in the path AND in the query), and Java rejects a duplicate parameter. The
  wire name is untouched, so the request is unchanged.
- **Naming:** classes PascalCase, fields/methods camelCase via
  `identifierFor(..., RESERVED_WORDS.java)` (the `java` reserved set is new toolkit work);
  `+1`/`-1` → `plus1`/`minus1`; digit-leading names get a letter prefix.
- **Enums** are Java enums with a `wire()` accessor and a `fromWire(String)` factory
  (values like `in-progress` are not valid Java identifiers, so members are
  SCREAMING_SNAKE with the wire literal attached).
- **Discriminated unions** are `sealed interface X permits A, B` with a generated
  `static X parseX(Object json)` dispatcher on the discriminator property. Members
  gain `implements X`. Undiscriminated unions surface as `Object`.
- **allOf** is flattened via `flattenAllOf`; `omit` uses the base record (readOnly
  fields simply omitted from requests).
- **Client:** `new Client(Config config)`; per-op methods
  `OrderPage listOrders(ListOrdersParams params)` throwing `ApiException`; params
  objects are records with a builder (Java has no named arguments).
- **Parity surface** (same as python/go/php): auth (bearer/basic/apiKey), retries with
  `Retry-After` + jittered backoff, per-attempt timeouts, idempotency keys, middleware
  (`UnaryOperator`-style interceptors), pagination (`Iterable<OrderPage> listOrdersPages()`
  / `Iterable<Order> listOrdersItems()`), SSE (`Iterator<ServerSentEvent>` with
  `Last-Event-ID` reconnect), multipart (hand-built body), `X-Redocly-Client` header.
- The runtime is hand-written in `java-runtime/` and embedded at prepare time; verified
  with `javac` (and the smoke against the shared mock server). The large-description
  suite gains a `javaBar` (`javac` on the big real-world outputs). CI runners ship a JDK.
- Authored ONLY with the neutral toolkit — the dogfooding guard extends to `java/index.ts`.

## The modify loop (once implemented)

1. Edit this skill: state the new behavior or decision.
2. Change `index.ts` (and `java-runtime/` for runtime behavior, then
   `npm run prepare -w @redocly/client-generator`).
3. Verify: `npm run compile`, the generator unit suite (real `javac` bars), the e2e
   smoke, and the large-description bars (`tests/e2e/generate-client/large-descriptions.test.ts`).
