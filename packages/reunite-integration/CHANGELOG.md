# @redocly/reunite-integration

## 2.55.0

### Minor Changes

- Added the `--replace` option to the `push` command.
  `--replace` removes the files under the mount path that are not part of the push.

### Patch Changes

- Updated @redocly/openapi-core to v2.55.0.

## 2.54.3

### Patch Changes

- Added the value of the `REDOCLY_ENVIRONMENT` environment variable to the `user-agent` header of the `login`, `push`, and `push-status` requests.
- Updated @redocly/openapi-core to v2.54.3.

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
