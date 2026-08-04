# @redocly/client-generator

## 0.2.1

### Patch Changes

- Updated @redocly/openapi-core to v2.43.3.

## 0.2.0

### Minor Changes

- Added three request-hardening options to generated clients: `timeout` aborts slow attempts (a fresh budget per retry attempt, composable with your own `AbortSignal`; failures surface as a structured `TimeoutError` carrying the operation, budget, and attempt), `idempotencyKey` stamps POST/PATCH requests with a stable `Idempotency-Key` header and makes their retries safe under the default policy, and an `X-Redocly-Client` identification header is sent outside browsers (override or disable it with `clientHeader`). The default retry predicate is now exported as `defaultRetryOn` so custom `retryOn` rules can compose with it instead of replacing it.

### Patch Changes

- Fixed request bodies to be sent with the operation's declared content type (for example `application/merge-patch+json`) instead of always `application/json`, and pagination pointers (`items`, `nextCursor`, `hasMore`) to resolve through `allOf` response schemas, so collection schemas composed from a shared base no longer need flattening.
- Updated @redocly/openapi-core to v2.43.2.

## 0.1.2

### Patch Changes

- Updated @redocly/openapi-core to v2.43.1.

## 0.1.1

### Patch Changes

- Updated @redocly/openapi-core to v2.43.0.

## 0.1.0

### Minor Changes

- Added an experimental `generate-client` command that generates a typed, zero-dependency TypeScript client from an OpenAPI description — auth, retries, middleware, typed SSE streaming, pagination, and multipart included — plus optional companion generators for Zod validation, TanStack Query and SWR hooks, MSW mocks, and date transformers.
  See the [`generate-client` command reference](https://redocly.com/docs/cli/commands/generate-client) and the [Use the generated client](https://redocly.com/docs/cli/guides/use-generated-client) guide.

### Patch Changes

- Updated @redocly/openapi-core to v2.42.0.
