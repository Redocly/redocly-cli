# @redocly/reunite-integration

## 2.59.0

### Patch Changes

- Updated `@redocly/config` to `v0.62.0`.
- Updated @redocly/openapi-core to v2.59.0.

## 2.58.2

### Patch Changes

- Updated @redocly/openapi-core to v2.58.2.

## 2.58.1

### Patch Changes

- Updated `@redocly/config` to `v0.61.1`.
- Updated @redocly/openapi-core to v2.58.1.

## 2.58.0

### Minor Changes

- Resolved organization and project slugs to IDs in the `push` and `push-status` commands before calling the Reunite API, with a deprecation notice that shows the IDs to use.
  The `--organization` and `--project` options now expect the IDs from the organization and project settings pages in Reunite; slugs are still accepted but deprecated.

### Patch Changes

- Updated @redocly/openapi-core to v2.58.0.

## 2.57.0

### Patch Changes

- Updated @redocly/openapi-core to v2.57.0.

## 2.56.1

### Patch Changes

- Updated @redocly/openapi-core to v2.56.1.

## 2.56.0

### Patch Changes

- Updated `undici` to the `6.29.0` version.
- Updated @redocly/config to v0.59.0.
- Updated @redocly/openapi-core to v2.56.0.

## 2.55.0

### Minor Changes

- Added the `--replace` option to the `push` command.
  `--replace` removes the files under the mount path that are not part of the push.

### Patch Changes

- Updated @redocly/config to v0.58.0.
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
