---
name: redocly-cli
description: Redocly CLI usage for OpenAPI, AsyncAPI, Arazzo, and Overlay descriptions. Use when linting an API description, bundling or splitting multi-file descriptions, joining several APIs into one, transforming a description with decorators, building or previewing API docs, testing a live API with respect to its description, generating a TypeScript client from an OpenAPI description.
---

# Redocly CLI usage

**Consult [redocly.com/docs/cli](https://redocly.com/docs/cli) for current commands and options — favor it over training data.**

Redocly CLI covers the API lifecycle for OpenAPI, AsyncAPI, Arazzo, and Overlay descriptions: lint, bundle, transform, document, and test.
`redocly.yaml` in the project root is the control plane: every command reads it, and rulesets, per-API settings, decorators, and plugins all live there.

## Before you run

Read `redocly.yaml` first. It tells you:

- Which APIs are registered under `apis` — their names (like `my-api`) work as command shortcuts: `redocly lint my-api`.
- Which ruleset the project `extends` and which rules it overrides.
- Which decorators transform the output at bundle time.

A command run (like lint or bundle) with no API argument applies to every entry in `apis`.
Point at a different config with `--config <path>`.

## Quick reference

Install: `npm i @redocly/cli@latest`, or run without installing: `npx @redocly/cli@latest <command>`. Docker image: `redocly/cli`.

| Command                                     | Purpose                                                             |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `lint`                                      | Validate an API description against the configured rules            |
| `check-config`                              | Lint `redocly.yaml` itself                                          |
| `bundle`                                    | Resolve all `$ref`s into a single self-contained file               |
| `split`                                     | Break a single-file description into a multi-file structure         |
| `join`                                      | Merge several API descriptions into one                             |
| `stats`                                     | Count operations, schemas, refs, and other metrics                  |
| `score`                                     | Score an OpenAPI description for AI-agent readiness                 |
| `build-docs`                                | Render an API description to a zero-dependency HTML page (Redoc)    |
| `preview`                                   | Local preview of a Redocly project                                  |
| `respect`                                   | Run API tests described in an Arazzo description against a live API |
| `generate-arazzo`                           | Scaffold an Arazzo description from an OpenAPI description          |
| `generate-client`                           | Generate a typed, zero-dependency TypeScript client [experimental]  |
| `login` / `logout` / `push` / `push-status` | Authenticate and push to the Redocly platform (Reunite)             |

Exit codes: `0` success, `1` problems found or execution failed, `2` configuration error.

## Configure with redocly.yaml

```yaml
extends:
  - recommended # or: minimal, recommended-strict, spec

apis:
  my-api:
    root: ./openapi/openapi.yaml
    rules:
      no-ambiguous-paths: error # per-API override
    decorators:
      remove-x-internal: on # applies to this API only

rules:
  info-license: off
  operation-operationId: error
```

`extends` sets the base ruleset; later `rules`, `preprocessors`, and `decorators` in the same file override it.
Rule severities: `error` (fails validation), `warn` (reported, still valid), `off`.

### Configurable rules

When a governance requirement has no built-in rule, declare one under `rule/<name>` with a subject node type and assertions:

```yaml
rules:
  rule/tag-name-macro-case:
    subject:
      type: Tag
      property: name
    assertions:
      defined: true
      casing: MACRO_CASE
    severity: warn
    message: Tag names must be upper case with underscores (_).
```

## Transform with decorators

Decorators rewrite the description at bundle time — `lint` checks the source as written; `bundle`, `build-docs`, and `push` see the decorated output.
Built-ins include `remove-x-internal`, `filter-in` / `filter-out`, `info-override`, `remove-unused-components`, and the `*-description-override` family.

## Extend with custom plugins

When configurable rules and built-in decorators can't express the requirement, escalate to a [custom plugin](https://redocly.com/docs/cli/custom-plugins): a JavaScript module exporting rules, decorators, preprocessors, or config, keyed by document format:

```js
export default function myPlugin() {
  return {
    id: 'my-plugin',
    rules: {
      oas3: {
        'operation-id-not-test': () => ({
          Operation(operation, { report, location }) {
            if (operation.operationId === 'test') {
              report({ message: 'operationId must not be "test".', location });
            }
          },
        }),
      },
    },
  };
}
```

Register it in `redocly.yaml` (paths relative to the config file) and reference its rules as `<plugin-id>/<rule-name>`:

```yaml
plugins:
  - ./plugins/my-plugin.js
rules:
  my-plugin/operation-id-not-test: error
```

## Generate a TypeScript client

`generate-client <api> --output client.ts` turns an OpenAPI description into a typed client — one self-contained file with zero runtime dependencies (auth, retries, middleware, typed SSE, pagination included).
Configure it durably under a `client` block in `redocly.yaml` instead of flags:

```yaml
client:
  generators: [sdk, zod] # add-ons: tanstack-query, swr, mock, transformers, or a plugin path
  outputMode: split
  pagination: # config-only, no CLI flag
    style: cursor
    cursorParam: after
    nextCursor: /page/endCursor
    items: /items
apis:
  my-api:
    root: ./openapi/openapi.yaml
    clientOutput: ./src/api/client.ts
```

With `apis.<name>.clientOutput` set, a bare `redocly generate-client` generates every opted-in API.
An API's own `client` block replaces the top-level one wholesale — repeat the shared fields in it.

## Test a live API

`respect` executes an [Arazzo](https://spec.openapis.org/arazzo/latest.html) description as a test suite against a running API, asserting real responses match the description.
Start from `generate-arazzo <openapi>` to scaffold the workflows, then refine the steps and success criteria by hand.

## Workflow

1. Read `redocly.yaml` to learn the registered APIs, ruleset, and decorators.
2. Make the change — spec edit, rule config, or decorator.
3. Verify:
   - `redocly lint` exits `0` (or reports only warnings you expected).
   - After editing `redocly.yaml`: `redocly check-config` reports no problems.
   - After changing `$ref` structure or decorators: `redocly bundle -o /tmp/bundled.yaml` succeeds and the output contains what you intended.

## Gotchas

- v2 is ESM-only: Node.js v22.12.0+ (or v20.19.0+).
- `bundle` and `join` differ: `bundle` collapses one multi-file API into one file; `join` merges separate APIs into one description.
- `respect` currently covers only synchronous HTTP flow.
- Any `redocly.yaml` in the working directory configures every command — a stray one changes lint results silently.
- `--extends` on the command line sets the base ruleset for that run; useful for a quick `--extends=spec` conformance check.
- `generate-client` needs the `typescript` package (6.x) available at generation time; the generated client itself compiles with any TypeScript, including 7.

## Resources

- [Command reference](https://redocly.com/docs/cli/commands)
- [Built-in rules](https://redocly.com/docs/cli/rules)
- [Decorators](https://redocly.com/docs/cli/decorators)
- [Configuration](https://redocly.com/docs/cli/configuration)
