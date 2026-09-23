# @redocly/reunite-integration

## 2.55.0

### Minor Changes

- Removed the `getRemotesList()` method from the Reunite API client, together with the `ListRemotesResponse` and `Remote` types.

  **Note**: `getRemotesList()`, `ListRemotesResponse`, and `Remote` are no longer exported from `@redocly/reunite-integration`.

### Patch Changes

- Updated @redocly/openapi-core to v2.55.0.

## 2.54.2

### Patch Changes

- Updated @redocly/config to v0.57.0.
- Updated @redocly/openapi-core to v2.54.2.

## 2.54.1

### Patch Changes

- Republished the package with its compiled `lib` output.

  **Note**: Version 2.54.0 shipped without the `lib` output and cannot be imported. Upgrade to this version.

- Updated @redocly/openapi-core to v2.54.1.

## 2.54.0

### Minor Changes

- Added the `@redocly/reunite-integration` package that exposes the Reunite platform related code and types.

### Patch Changes

- Updated @redocly/openapi-core to v2.54.0.
