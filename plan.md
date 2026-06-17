# Phase 1: Minimal Native gRPC / Protobuf Linting Prototype

## Goal

Extend the existing `redocly lint` architecture to support gRPC / Protobuf as another API specification family, alongside OpenAPI, AsyncAPI, Arazzo, Overlay, and OpenRPC.

The prototype should be intentionally small. It should prove that Redocly can parse `.proto` files, detect them as a supported API description format, run Redocly-native lint rules, and emit normal Redocly lint output.

## Architectural Principle

Follow the same approach Redocly already uses for other API specifications:

- reuse mature third-party libraries for low-level parsing or validation when useful,
- keep lint orchestration inside Redocly,
- keep rules inside Redocly,
- keep traversal inside Redocly,
- keep config integration inside Redocly,
- keep formatting, totals, ignore handling, and exit behavior inside Redocly.

Buf should not be the foundation of the implementation. Buf remains useful as research/reference tooling, especially for rule taxonomy and fixture comparison, but the prototype should not delegate `redocly lint` to `buf lint`.

Recommended framing:

> Implement Protobuf/gRPC as a first-class Redocly lint target. Use a Protobuf parser library if needed, but do not wrap an external linter as the product behavior.

## Phase 1 Scope

Supported:

- `redocly lint path/to/service.proto`
- `redocly lint "proto/**/*.proto"`
- `redocly lint alias-from-redocly-config` when the alias root points to an explicit `.proto` file
- output formats: `codeframe`, `stylish`, and `json`
- existing totals and exit behavior
- Redocly-native Protobuf rules

Explicitly unsupported in Phase 1:

- directory inputs such as `redocly lint proto/`
- remote `.proto` URLs
- full Protobuf compiler behavior
- advanced import/module/workspace resolution
- Buf config compatibility
- breaking-change detection
- code generation
- auto-formatting or autofix
- Google AIP strict mode
- Protovalidate runtime validation
- complete `.redocly.lint-ignore.yaml` generation for Protobuf unless stable node pointers are implemented

## Public Module Boundary

Keep parser details behind a narrow Protobuf module boundary. Rules must depend on Redocly's normalized Protobuf model, not on parser-specific objects.

Recommended internal API:

```ts
parseProtoDocument(source: string, absoluteRef: string): ProtoDocument;
lintProtoDocument(document: ProtoDocument, config: Config): NormalizedProblem[];
```

Recommended internal types:

- `ProtoDocument`
- `ProtoNode`
- `ProtoLocation`
- `ProtoParseError`
- `ProtoUnsupportedSyntaxError`
- `ProtoImportResolutionError`
- `protobufTypes`
- `protobufRules`

Non-negotiable boundary:

> No rule should import or depend on the selected parser library directly.

## Workstream 1: Existing Architecture Fit

Identify the smallest set of extension points needed to add Protobuf without disturbing existing specifications.

Tasks:

- Review current lint path:
  - `packages/cli/src/index.ts`
  - `packages/cli/src/commands/lint.ts`
  - `packages/core/src/lint.ts`
  - `packages/core/src/walk.ts`
  - `packages/core/src/config/config.ts`
  - `packages/core/src/config/rules.ts`
- Confirm where current spec detection happens.
- Confirm how existing spec families map to:
  - spec version,
  - major spec family,
  - normalized node types,
  - rulesets,
  - built-in plugin rules.
- Add the minimum new internal spec identifier.
- Recommendation: use `protobuf` as the spec family. gRPC is a service/RPC pattern inside Protobuf, while `.proto` is the input format.
- Keep service/RPC rules under `protobuf/` in Phase 1. Introduce `grpc/` later only if rules become truly gRPC-specific.

Deliverables:

- Short architecture note describing where Protobuf plugs into the existing lint path.
- List of files likely touched for prototype.
- Confirmation that existing OpenAPI/AsyncAPI/Arazzo behavior remains untouched.

## Workstream 2: Protobuf Parser Selection

Choose a parser library for `.proto` files that gives Redocly enough structure and location data to run native rules.

Tasks:

- Evaluate parser options such as:
  - `protobufjs` parser,
  - `@bufbuild/protobuf` ecosystem parser options, if available,
  - other maintained TypeScript/JavaScript Protobuf parsers.
- Required parser capabilities:
  - parse `proto3` files,
  - expose packages,
  - expose imports,
  - expose messages,
  - expose fields and field numbers,
  - expose enums and enum values,
  - expose services,
  - expose RPC methods,
  - expose nested messages and enums if possible,
  - expose enough source location information for useful diagnostics.
- Parser selection must prioritize source-location quality. Codeframe output will be fragile without reliable locations.
- If no parser has good location support, define a Phase 1 fallback:
  - syntax errors use parser line/column when available,
  - lint diagnostics use stable node pointers plus best-effort line/column,
  - codeframes are best-effort,
  - JSON output remains structurally reliable.
- Do not implement semantic import resolution beyond the minimum needed for explicit files and simple fixtures.

Deliverables:

- Parser recommendation.
- Known parser limitations.
- Minimal parser-to-Redocly AST mapping.
- Source-location strategy.

## Workstream 3: Document and Spec Detection

Teach Redocly that `.proto` is a supported API description input.

Tasks:

- Add detection for `.proto` file paths.
- Add glob handling through the existing lint entrypoint.
- Explicitly reject directory inputs in Phase 1 with a clear message.
- Add a Protobuf document creation path analogous to existing parsed document handling.
- Preserve existing behavior for YAML/JSON API descriptions.
- Require `proto3` for Phase 1.
- Decide behavior for missing syntax or `syntax = "proto2";`.
- Recommendation:
  - `syntax = "proto3";` is supported,
  - `proto2` is a handled unsupported-syntax error,
  - missing syntax is a lint diagnostic or handled parse error, depending on parser behavior.
- Ensure invalid `.proto` syntax becomes a handled lint error with file and location when possible.
- Decide how telemetry/spec metadata should label Protobuf inputs.

Deliverables:

- Minimal detection contract.
- Unsupported input behavior.
- Proto syntax-version behavior.

## Workstream 4: Protobuf Document Model and Node Types

Create enough normalized node types for the existing Redocly visitor/walker model to traverse Protobuf structures.

Tasks:

- Define a minimal internal AST model, independent of parser-specific classes.
- Add node types for:
  - `ProtoDocument`,
  - `Syntax`,
  - `Package`,
  - `Import`,
  - `Message`,
  - `Field`,
  - `Enum`,
  - `EnumValue`,
  - `Service`,
  - `Rpc`.
- Include nested message and nested enum representation if parser support is acceptable.
- Attach source locations to every node when possible.
- Create stable logical node pointers early, even if ignore generation is deferred.
- Recommended pointer examples:

```text
#/package
#/messages/User
#/messages/User/fields/user_id
#/services/UserService
#/services/UserService/rpcs/GetUser
#/enums/UserStatus
#/enums/UserStatus/values/USER_STATUS_UNSPECIFIED
```

- Defer comment/documentation rules unless parser support is strong.
- Keep the model small and stable enough for initial rules.

Deliverables:

- Minimal Protobuf type tree.
- Parser-output to Redocly-node mapping.
- Stable node pointer format.

## Workstream 5: Config and Ruleset Extension

Extend existing config/rules machinery minimally so Protobuf rules can be enabled like other built-in rules.

Tasks:

- Add a Protobuf rules bucket alongside existing spec-specific rule buckets.
- Recommendation: start with `protobufRules`; introduce `grpcRules` later only if service-level rules need separation.
- Add Protobuf rules to the built-in plugin structure.
- Add config schema support so `redocly.yaml` config linting accepts Protobuf rule settings.
- Ensure `--skip-rule` works for Protobuf rule IDs.
- Ensure unused-rule warnings work correctly with Protobuf rules.
- Ensure `checkIfRulesetExist` recognizes Protobuf rules.
- Decide default config behavior.
- Recommendation: when a `.proto` input is detected and no config is provided, use the same `recommended` fallback concept with a small Protobuf recommended set.
- Avoid custom rule options in Phase 1. Start with severity-only rule config.

Deliverables:

- Minimal config extension proposal.
- Initial built-in Protobuf ruleset inclusion.
- Config validation update plan.

## Workstream 6: Initial Native Rule Subset

Implement the smallest useful rule subset first. The goal is to prove the architecture end to end, not to match Buf or Google API Linter.

Phase 1 required rules:

- `protobuf/package-defined`
  - Every `.proto` file should declare a package.
- `protobuf/message-pascal-case`
  - Message names should use PascalCase.
- `protobuf/field-snake-case`
  - Field names should use snake_case.

Phase 1 optional rules after the required path works:

- `protobuf/package-lower-snake-case`
- `protobuf/package-version-suffix`
- `protobuf/enum-pascal-case`
- `protobuf/enum-zero-value`
- `protobuf/service-pascal-case`
- `protobuf/rpc-pascal-case`
- `protobuf/rpc-request-response-names`
- `protobuf/no-duplicate-field-numbers`
- `protobuf/no-duplicate-enum-values`

Tasks:

- Implement each rule as a Redocly visitor.
- Use existing problem reporting shape.
- Assign default severities.
- Keep rule implementation independent of parser internals.
- Do not add field-number semantic rules until Protobuf numeric ranges and reserved ranges are handled correctly.
- Do not add import-dependent rules until import resolution is explicitly implemented.

Deliverables:

- Minimal native Protobuf rule set.
- Rule ID and severity table.
- Clear list of rules deferred from Phase 1.

## Workstream 7: CLI Behavior

Keep `redocly lint` as the only command needed for the prototype.

Tasks:

- Support:
  - `redocly lint path/to/service.proto`
  - `redocly lint proto/**/*.proto`
  - `redocly lint alias-from-redocly-config`
- Reject:
  - `redocly lint proto/`
  - remote `.proto` URLs
- Reuse existing options where possible:
  - `--format`,
  - `--max-problems`,
  - `--skip-rule`,
  - `--lint-config`,
  - `--config`,
  - `--extends`.
- Decide whether `--generate-ignore-file` is supported in Phase 1.
- Recommendation: support it only if stable Protobuf node pointers are implemented; otherwise return a handled unsupported-feature message for Protobuf.
- Preserve existing output and exit behavior:
  - errors fail,
  - warnings do not fail,
  - JSON output uses existing `formatProblems`,
  - codeframe/stylish output uses existing formatter where location data allows.
- Ensure mixed commands such as `redocly lint openapi.yaml service.proto` have deterministic formatting and totals.

Deliverables:

- CLI contract for prototype.
- Unsupported option list.
- Mixed-input behavior decision.

## Workstream 8: Error Handling and Reliability

Create Protobuf-specific errors and translate them once at the lint boundary.

Tasks:

- Add or define error types:
  - `ProtoParseError`,
  - `ProtoUnsupportedSyntaxError`,
  - `ProtoImportResolutionError`,
  - `ProtoLocationError`,
  - `ProtoInternalError`.
- Convert parser-library exceptions into Protobuf-specific errors.
- Convert Protobuf-specific errors into existing handled CLI errors or normalized lint problems.
- Ensure JSON output remains valid even when Protobuf parsing fails.
- Ensure parser errors do not appear as unexpected stack traces.
- Define behavior for:
  - invalid syntax,
  - unsupported `proto2`,
  - missing syntax,
  - unreadable file,
  - invalid UTF-8,
  - missing import,
  - unsupported directory input.

Deliverables:

- Error taxonomy.
- Centralized error mapping strategy.
- Edge-case behavior table.

## Workstream 9: Fixtures

Add small Protobuf fixtures that exercise the native path.

Tasks:

- Add one valid `proto3` fixture:
  - syntax declaration,
  - package,
  - service,
  - RPC,
  - request/response messages,
  - enum with zero value.
- Add required-rule invalid fixtures:
  - missing package,
  - bad message casing,
  - bad field casing.
- Add parser/error fixtures:
  - invalid syntax,
  - unsupported `proto2`,
  - missing syntax.
- Add optional-rule fixtures only after optional rules are implemented.
- Add one config alias fixture.
- Add one glob/multiple-file fixture using explicit files.

Deliverables:

- Fixture list.
- Expected diagnostics per fixture.

## Workstream 10: Tests

Add tests at the same levels used by the existing lint command.

Tasks:

- Unit test parser adapter:
  - valid parse,
  - syntax error,
  - unsupported syntax,
  - source locations,
  - AST normalization.
- Unit test stable node pointers.
- Unit test initial rules.
- Unit test spec detection for `.proto`.
- Unit test directory rejection.
- Unit test remote URL rejection.
- Unit test `--skip-rule` with Protobuf rules.
- E2E test:
  - valid `.proto` passes,
  - invalid `.proto` fails,
  - parser error is handled,
  - `--format=codeframe`,
  - `--format=stylish`,
  - `--format=json`,
  - config alias,
  - glob with multiple explicit `.proto` files.
- Add regression check that existing OpenAPI lint behavior is unchanged.
- Add Windows path coverage where practical.

Deliverables:

- Test matrix.
- Snapshot plan.

## Workstream 11: Documentation

Document the minimal prototype clearly.

Tasks:

- Add basic usage examples:

```bash
redocly lint proto/users/v1/user.proto
redocly lint "proto/**/*.proto"
```

- Document unsupported Phase 1 inputs:
  - directories,
  - remote `.proto` URLs,
  - advanced imports/workspaces.
- Document initial rule subset.
- Document parser limitations.
- Document unsupported features:
  - breaking-change detection,
  - Buf config compatibility,
  - autofix,
  - advanced import/module handling.
- Mention Buf as a reference/comparison tool, not the underlying engine.

Deliverables:

- Draft docs or README section for prototype behavior.

## Manual Toil vs. Human Review

Work suitable for AI-assisted scaffolding:

- fixture generation,
- repetitive rule test generation,
- snapshot scaffolding,
- docs drafts,
- rule catalog table,
- mechanical folder/file scaffolding once architecture is decided.

Work requiring careful human review:

- parser selection,
- source-location quality,
- stable node pointer design,
- config schema naming,
- rule namespace naming,
- import-resolution scope,
- performance on large `.proto` sets,
- cross-platform path behavior,
- regression risk for existing lint flows.

## Recommended Implementation Order

1. Select Protobuf parser library based on AST and location quality.
2. Define normalized `ProtoDocument` and stable node pointers.
3. Add minimal `.proto` detection for files and globs.
4. Reject directories and remote `.proto` URLs with handled errors.
5. Add Protobuf node types.
6. Add Protobuf rules bucket/config integration.
7. Implement required rules only:
   - `protobuf/package-defined`,
   - `protobuf/message-pascal-case`,
   - `protobuf/field-snake-case`.
8. Route `.proto` files through existing `redocly lint`.
9. Reuse existing formatters and totals.
10. Add fixtures and tests.
11. Expand rule subset only after the minimal path works end to end.

## Phase 1 Success Criteria

The prototype is successful when:

- `redocly lint valid.proto` succeeds.
- `redocly lint invalid.proto` reports Redocly-native lint problems.
- parser errors are handled cleanly.
- directory and remote inputs are rejected clearly.
- output formats work for `codeframe`, `stylish`, and `json`.
- existing OpenAPI/AsyncAPI/Arazzo lint behavior remains unchanged.
- Protobuf rules are implemented as Redocly rules, not external Buf diagnostics.
- rules depend on the normalized Protobuf model, not parser-specific objects.
- the implementation feels like an extension of the existing lint architecture, not a separate linting product bolted onto the CLI.

## What Will Break First

The first real production stress point will be source locations. If the selected parser cannot provide reliable locations, codeframe output and ignore support will be fragile.

The second stress point will be imports. Real Protobuf projects are usually multi-file and import shared definitions. Phase 1 must clearly define that only explicit files and globs are supported, with advanced import/module behavior deferred.

The third stress point will be config validation. If `protobufRules` is not added consistently to config schema, built-in presets, skip logic, and unused-rule tracking, `redocly.yaml` linting will fail before API linting starts.

## Open Questions

- Which TypeScript/JavaScript Protobuf parser gives the best AST and source location support?
- Should the internal spec family be named `protobuf` or `proto3`?
- Can `.redocly.lint-ignore.yaml` support Protobuf cleanly with stable node pointers in Phase 1?
- How much import resolution is required to avoid surprising early users?
- Should package version suffix be part of `recommended` or only a future stricter preset?
