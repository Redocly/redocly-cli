# @redocly/client-generator

## 0.5.0

### Minor Changes

- Added pass-through stream request bodies to the generated TypeScript, Python, Go, and PHP clients.
  A stream body is sent as is in one attempt, and the caller's `Content-Type` wins over the one in the API description.

### Patch Changes

- Updated @redocly/openapi-core to v2.61.0.

## 0.4.25

### Patch Changes

- Updated @redocly/openapi-core to v2.60.0.

## 0.4.24

### Patch Changes

- Updated @redocly/openapi-core to v2.59.0.

## 0.4.23

### Patch Changes

- Fixed an issue where the generated PHP client failed with `Undefined constant "OPERATIONS"` when OPcache preload was enabled.
- Updated @redocly/openapi-core to v2.58.2.

## 0.4.22

### Patch Changes

- Updated @redocly/openapi-core to v2.58.1.

## 0.4.21

### Patch Changes

- Updated @redocly/openapi-core to v2.58.0.

## 0.4.20

### Patch Changes

- Updated @redocly/openapi-core to v2.57.0.

## 0.4.19

### Patch Changes

- Updated @redocly/openapi-core to v2.56.1.

## 0.4.18

### Patch Changes

- Fixed the `codeSamples` overlay so it applies to paths that contain a quote and to path items defined in `components.pathItems`, and adds the samples of a path item that several paths share only once.
- Updated @redocly/openapi-core to v2.56.0.

## 0.4.17

### Patch Changes

- Updated @redocly/openapi-core to v2.55.0.

## 0.4.16

### Patch Changes

- Fixed an issue where generated clients attempted to parse compressed archives (`application/gzip`, `application/x-tar`), PDF files, Office documents, audio, video and font responses as JSON instead of decoding them as binary.
- Updated @redocly/openapi-core to v2.54.3.

## 0.4.15

### Patch Changes

- Updated @redocly/openapi-core to v2.54.2.

## 0.4.14

### Patch Changes

- Updated @redocly/openapi-core to v2.54.1.

## 0.4.13

### Patch Changes

- Updated @redocly/openapi-core to v2.54.0.

## 0.4.12

### Patch Changes

- Updated @redocly/openapi-core to v2.53.3.

## 0.4.11

### Patch Changes

- Updated @redocly/openapi-core to v2.53.2.

## 0.4.10

### Patch Changes

- Updated @redocly/openapi-core to v2.53.1.

## 0.4.9

### Patch Changes

- Updated @redocly/openapi-core to v2.53.0.

## 0.4.8

### Patch Changes

- Updated @redocly/openapi-core to v2.52.1.

## 0.4.7

### Patch Changes

- Updated @redocly/openapi-core to v2.52.0.

## 0.4.6

### Patch Changes

- Updated @redocly/openapi-core to v2.51.2.

## 0.4.5

### Patch Changes

- Updated @redocly/openapi-core to v2.51.1.

## 0.4.4

### Patch Changes

- Updated @redocly/openapi-core to v2.51.0.

## 0.4.3

### Patch Changes

- Updated @redocly/openapi-core to v2.50.0.

## 0.4.2

### Patch Changes

- Updated @redocly/openapi-core to v2.49.1.

## 0.4.1

### Patch Changes

- Updated @redocly/openapi-core to v2.49.0.

## 0.4.0

### Minor Changes

- Added agent-friendly client generation: `python`, `go`, `php`, and `cli` generators beside the TypeScript client, each self-documenting with `--docs`, configurable per generator, and available as source in your own repository through `eject-generator`.

### Patch Changes

- Updated @redocly/openapi-core to v2.48.0.

## 0.3.8

### Patch Changes

- Updated @redocly/openapi-core to v2.47.0.

## 0.3.7

### Patch Changes

- Updated @redocly/openapi-core to v2.46.2.

## 0.3.6

### Patch Changes

- Updated @redocly/openapi-core to v2.46.1.

## 0.3.5

### Patch Changes

- Updated @redocly/openapi-core to v2.46.0.

## 0.3.4

### Patch Changes

- Updated @redocly/openapi-core to v2.45.1.

## 0.3.3

### Patch Changes

- Updated @redocly/openapi-core to v2.45.0.

## 0.3.2

### Patch Changes

- Updated @redocly/openapi-core to v2.44.2.

## 0.3.1

### Patch Changes

- Updated @redocly/openapi-core to v2.44.1.

## 0.3.0

### Minor Changes

- Added an opt-in success envelope to throw-mode calls.

### Patch Changes

- Updated @redocly/openapi-core to v2.44.0.

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
