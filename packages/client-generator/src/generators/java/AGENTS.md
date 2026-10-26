# The `java` generator — its skill

This file is the generator's DESIGN. It ships to users on `redocly eject-generator java`
(as the `.claude/skills/java-generator/SKILL.md` agent skill) and governs our own changes: **to change the generator,
edit this skill first, then make the code match it** — a diff to `index.ts` that has no
covering sentence here is incomplete.

`npm run prepare` compiles it into `eject-assets/skills/java-generator/SKILL.md`,
the copy that ships to users — that asset is generated, so never edit it by hand.

## What it emits

One self-contained `<Stem>.java`: a `public final class` named after the output stem in
PascalCase (`client.ts` → `Client.java`, `openapi.client.ts` → `OpenapiClient.java`),
because Java puts one public class per file and names the file after it. The class nests
the model records, the enums, the union interfaces, the embedded runtime, and one typed
method per operation. Java ≥ 17 (records, sealed interfaces, `instanceof` patterns), HTTP
over `java.net.http.HttpClient`, JSON over the runtime's own reader/writer — zero
dependencies. The package derives from the API title the way the PHP namespace does:
lowercase words run together (`Cafe Orders API` → `package cafeordersapi;`), because a
class in the default package cannot be imported from any named package. A title that
cannot be a package as is follows Oracle's package-naming convention — a keyword, or `java`,
which the JVM keeps for the JDK, gets a trailing underscore (`java_`, `class_`); a leading
digit gets a leading underscore (`_3dprintingapi`); a title with no usable letters becomes
`api` — and the run warns with the package it used, since the reader cannot see it in the
title. The generator takes no options; a different package is a change to
`javaPackageName` in an ejected copy.

## Design decisions that must hold

- **JSON is hand-written in the runtime.** Java has no standard JSON library, and a
  dependency on one would break the zero-dependency story the other SDKs keep. `Json.parse`
  reads into a plain graph — `Map<String, Object>` (insertion ordered), `List<Object>`,
  `String`, `Long` for integral numbers, `Double` for the rest, `Boolean`, `null` — and
  `Json.write` serializes that graph plus the generated types: a `JsonValue` by its
  `toJson()`, a `WireValue` by its wire literal, a date by its ISO-8601 text. No streaming
  parse: a body is read whole, then parsed.
- **Models are records** implementing the runtime's `JsonValue`. Every component is a
  reference type (`Long`, not `long`), so an optional or nullable value is simply `null`
  and a response that omits a required field hydrates instead of crashing. Hydration is
  compile-time generated per record — `static X fromJson(Object json)` reads each wire name
  through the runtime's null-tolerant readers (`asString`, `asLong`, `asList(…, item ->
  …)`, `Order.fromJson`, `Status.fromWire`, `parsePet`), and `toJson()` returns a
  `Map<String, Object>` of the components (nulls skipped for optionals) that `Json.write`
  serializes recursively. No reflection. `omit` schemas hydrate through their base record.
- **A `writeOnly` property is optional** even when required: requests and responses share
  one record, and a response never carries it.
- **Enums** are Java enums implementing `WireValue`: members in SCREAMING_SNAKE (the
  toolkit's `enumValues` names, unique per enum) carrying the wire literal — a `String` or
  a `Long` — with `wire()` and `fromWire(…)`, which returns `null` for `null` and throws
  `IllegalArgumentException` for an unknown value. Only string and integer enums get a type;
  other scalars stay their wire type.
- **Discriminated unions** whose mapping targets are all records become a `sealed
  interface X extends JsonValue` that each member record `implements`, so a consumer narrows
  with `instanceof` patterns; `parseX(Object json)` dispatches on the discriminator and
  throws `IllegalArgumentException` for an unknown value, since a sealed type has no raw
  member. `permits` is implied: the members sit in the same compilation unit. A union with a
  target that has no record of its own is typed `Object`, and its `parseX` returns the raw
  map for an unknown value. Undiscriminated unions, inline objects, and intersections that
  do not flatten are `Object`. **allOf** is flattened.
- **Types:** `String`/`Long`/`Double`/`Boolean`, `List<T>`, `Map<String, T>`, record and
  enum names, `Object` for everything untyped. Under `dateType: Date`, `date-time` is
  `OffsetDateTime` and `date` is `LocalDate`; hydration goes through `asOffsetDateTime` /
  `asLocalDate`, and the writer formats a date-time with `ISO_OFFSET_DATE_TIME` so the
  seconds never drop out (`OffsetDateTime.toString()` omits them when zero).
- **Reserved type names get a `Model` suffix.** Everything nests in one class, so a schema
  named like a runtime type (`Config`, `Envelope`) or a JDK type the runtime references
  (`Thread`, `List`) would shadow it: `naming.ts` reads those names off the runtime source
  and renames the schema (`ConfigModel`). A schema named like the enclosing class itself
  cannot nest in it at all, so that run fails with the fix (another `--output` name).
- **Naming:** types PascalCase, components and methods camelCase via
  `identifierFor(..., RESERVED_WORDS.java)`; a reserved word gets a trailing underscore
  (`class_`), `+1`/`-1` become `plus1`/`minus1`, and a digit-leading name gets `_`. Method
  names are unique across the client (`getUser`, `getUser2`).
- **Every path parameter is its own argument, so their names share one namespace** with
  the locals the method declares itself (`body`, `params`, `op`, `query`, `url`, …). Build
  them with `uniqueIdentifiers(..., { taken: … })`: a parameter named `body` becomes
  `body2`, and the wire name is untouched. Query parameters travel in a `<Op>Params` class
  — one nullable public field per parameter with a fluent setter of the same name
  (`new ListOrdersParams().limit(50L)`) — because Java has no named arguments; `null` for
  the whole class sends none. An array parameter repeats the key per element.
- **Method shape:** path parameters first, the body next (`Object` for an untyped
  multipart or a binary operation), then `<Op>Params` when the operation has query
  parameters. A JSON success returns its type, a non-JSON success (PDF, image, octet
  stream) returns `byte[]`, a bodiless success is `void`, and an SSE operation returns
  `Iterable<ServerSentEvent>`.
- **The operation literal is built where it is used** — `Operation op = new Operation(id,
  method, path, security, pagination)` at the top of each method — never a static table of
  every operation: a single static initializer of a large description (GitHub: ~1000
  operations) exceeds the JVM's 64 KB method size.
- **Errors:** unchecked exceptions ARE the error mode. `ApiException` (status, url, decoded
  body) for a non-2xx response, `ApiTimeoutException` when an attempt exceeds the configured
  timeout, `UncheckedIOException` for a transport failure; `errorMode` does not change the
  output (the generator declares `errorModes: ['throw']`, so `result` fails fast).
- **Config** is a fluent class: `serverUrl`, `httpClient` (an HTTP/1.1 client by default —
  the JDK default's h2c upgrade attempt confuses servers that do not speak HTTP/2),
  `header(name, value)` for every request (a `Content-Type` here wins over the description's,
  matched case-insensitively, so the header is never sent twice), `timeout` per attempt,
  `retry` (`Retry`: `retries` extra attempts, default 0; `delay`; `strategy` fixed or
  exponential; `noJitter`; `retryOn` replacing the default predicate), `middleware`
  (`onRequest(HttpRequest.Builder)` before each attempt, `onResponse` in reverse order),
  `idempotencyKey` supplier for POST/PATCH, and `auth` (`Auth`: `bearer`, `basic`, `apiKey`
  per scheme, each a value or a `Supplier` resolved per request).
- **Response headers:** an operation that DECLARES success-response headers gains a
  `<op>WithHeaders()` variant returning `Envelope<T>` (`data`, `headers` — coerced to
  `Long`/`Double`/`Boolean`/`String` under camelCase keys, absent or unparsable values
  omitted — and `status`); a bodiless operation returns `Envelope<Void>`. Operations without
  declared headers get no variant.
- **Pagination:** a paginated operation gains `<op>Pages()` and `<op>Items()`, both
  `Iterable<T>` over the runtime's `iterPages`, hydrated per page or item through
  `mapIterable` / `flattenItems`. Each `iterator()` starts a fresh request sequence.
- **Servers:** when the description declares servers, a `Servers` class is emitted with one
  static method per server; server VARIABLES become `String` arguments, and the
  description's defaults live in the method's doc comment (Java has no default arguments).
  The client's baked default stays `servers[0]` with variable defaults substituted.
- **Stream bodies pass through.** For an untyped `multipart/form-data` operation or a
  binary operation the body is `Object` and the runtime sorts it out (`multipartBody` /
  `binaryBody`): an `InputStream` is sent chunked, in exactly one attempt, whatever the
  retry policy says, because a consumed stream cannot be replayed; a `byte[]` or `String` is
  sent raw and keeps the retry policy; a map or a record of an untyped multipart operation
  is encoded with `toMultipart`; any other value of a binary operation is JSON-encoded. The
  caller's `Content-Type` (a `Config` header) wins over the description's or the multipart
  boundary's.
- **Parity surface:** auth OR-alternatives, retries with `Retry-After` + full-jitter
  backoff, per-attempt timeouts, idempotency keys, middleware, pagination, SSE (`iterSse`
  with `Last-Event-ID` reconnect and the server's `retry` hint), multipart, and the
  `X-Redocly-Client` header.
- **The runtime is hand-written in `runtime/Runtime.java`** in this folder, an `abstract
  class Runtime` that compiles on its own (`javac --release 17 -Xlint:all -Werror`) and is
  embedded at prepare time. Inline, the generator copies its class body into the generated
  class; under `--runtime module` it writes the same source as `<Stem>Runtime.java`, a
  `public abstract class` the client `extends`, so every runtime name resolves unqualified
  in both modes and the two cannot drift. Package-private members stay reachable because
  both classes share one package.
- Authored ONLY with the neutral toolkit — the dogfooding guard fails otherwise.
- **It documents itself.** With `client.docs` (or `--docs`), the `docs` hook writes
  `<stem>.java.md`: the security schemes, then one section per operation with its parameters,
  body, response type, and behavior notes. The call snippets come from this generator's own
  `sample` hook, so the page can only show the syntax of the SDK beside it, and the layout
  comes from `renderReferencePage` in the authoring toolkit — reachable from an ejected copy
  through `@redocly/client-generator`.

## The modify loop

1. Edit this skill: state the new behavior or decision.
2. Change `index.ts` (and `runtime/Runtime.java` for runtime behavior; `javac` it, then
   `npm run prepare -w @redocly/client-generator`).
3. Verify: `npm run compile`, then
   `npx vitest run packages/client-generator/src/generators/java/__tests__` (output-string checks),
   `packages/client-generator/tests/e2e/java/render.test.ts`
   (real `javac` bars), the e2e smoke (`packages/client-generator/tests/e2e/java/client.test.ts`),
   and the large-description bars (`packages/client-generator/tests/e2e/java/large-descriptions.test.ts`).
