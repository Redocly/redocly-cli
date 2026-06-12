# `redocly tree` Command Rework — Design

**Date:** 2026-06-12
**Branch:** `feat/graph-command` (rework on top of the existing implementation; the PR stays open)
**Supersedes:** the file-level-only design in `2026-06-11-graph-command-design.md` (kept for history)
**Status:** Approved

## Motivation (PR feedback)

The shipped `graph` command shows only the file-level `$ref` graph, which is useful only for split specs. Review feedback:

1. The command must be named **`tree`**.
2. The primary case is a spec in **one file**. The command must show the structure of the **OpenAPI document itself** — paths, operations, and their component dependency chains — and `--affected-by` must answer "which paths/operations are impacted" even for a single-file spec.
3. The file-level view is the less useful mode and is demoted behind a flag.

## Decisions (confirmed with the user)

- **One command `tree`.** Default mode = internal document structure. `--files` flag = the existing file-level graph, unchanged.
- Stylish depth in default mode: root file → `/pets` → `GET`/`POST` → transitive component chains, with the existing `↺` repeat marker.
- `--affected-by` accepts a component pointer (`#/components/schemas/Pet`), a shorthand (`schemas/Pet`, bare `Pet`), or a file path. Output is the affected subgraph; the summary reports affected operations and paths.

## Goals

- `redocly tree [api]` prints the internal structure tree of one API description (any spec type core resolves).
- `--files` preserves today's multi-API file-level graph byte-for-byte (snapshots are the regression guard).
- All three formats (`stylish` default, `json`, `mermaid`) work in both modes; `json`/`mermaid` stdout stays pure.
- `--affected-by` works in both modes; in default mode it reports impacted operations/paths.

## Non-goals

- No `packages/core` changes.
- No exploding of operations defined inside a `$ref`'d path-item _file_ — the file node represents them (documented limitation).
- Orphan (unreachable from root) components are pruned from the default-mode graph — unused-component detection stays `lint`'s job.
- No changes to `--files` mode semantics.

## Node model

`DependencyGraph`/`GraphEdge` stay as-is. `GraphNode` gains optional fields set only by the structure builder (files mode emits objects identical to today):

```ts
export type NodeKind = 'root' | 'path' | 'operation' | 'component' | 'file';

type GraphNode = {
  id: string;
  root?: boolean;
  external?: boolean;
  resolved: boolean;
  kind?: NodeKind; // default mode only
  file?: string; // cwd-relative source file of the node; default mode only
};
```

Id scheme (id = display label; renderers print ids directly):

| Node                                                                                    | id                                                                                              | kind        |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------- |
| Root API document                                                                       | `openapi.yaml` (cwd-relative, as in files mode)                                                 | `root`      |
| Path                                                                                    | `/pets` (unescaped pointer fragment)                                                            | `path`      |
| Operation                                                                               | `GET /pets` (uppercased method + space + path)                                                  | `operation` |
| Component in root file (OAS3/AsyncAPI/Arazzo)                                           | `schemas/Pet` (`components/` wrapper dropped, no `#/` prefix)                                   | `component` |
| Component in root file (OAS2 sections)                                                  | `definitions/Pet`, `parameters/limitParam`, `responses/NotFound`, `securityDefinitions/api_key` | `component` |
| Generic root-level fallback (`webhooks/*`, `channels/*`, `workflows/*`, `servers/0`, …) | first two pointer segments (or one)                                                             | `component` |
| Whole external file                                                                     | `schemas/pet.yaml` (cwd-relative; URLs as-is + `external`)                                      | `file`      |
| Component inside another file                                                           | `common.yaml#/components/schemas/Pet` (copy-pasteable as `$ref`)                                | `component` |

Disambiguation is structural: path ids start with `/`, operation ids contain a space, file ids contain an extension or `#`.

- Nested target pointers normalize to their top-level component (`#/components/schemas/Pet/properties/x` → `schemas/Pet`).
- Self-edges (recursive schemas) are kept → stylish renders `schemas/Pet ↺` as its own child.
- After building, the graph is pruned to nodes reachable from the root so all three formats agree.
- **Default mode processes exactly one API.** Multiple APIs (args or config fallback) → clear error suggesting a single API or `--files`. Rationale: path/component ids from different documents would collide and merge wrongly.

## Structure builder

New `build-structure.ts` + pure `node-id.ts`, using `walkDocument` exactly like `stats` (resolveDocument → normalizeVisitors → walkDocument):

- `PathItem` / `Operation` enter hooks create the root → path → operation spine. They act only when `rawLocation` is in the root file AND the pointer is exactly `/paths/{p}` (2 segments) or `/paths/{p}/{method}` (3 segments, method ∈ get/put/post/delete/options/head/patch/trace/query/x-query). This stateless pointer check is immune to callback/webhook false positives. For AsyncAPI/Arazzo these visitor keys don't exist in the type map and are silently ignored — the command stays spec-agnostic.
- A `ref` enter hook fires at every `$ref` site. Owner = mapped site location; target = mapped resolved-target location. Edge owner→target collects distinct `$ref` strings (dedup as in files mode). Spine edges carry `refs: []`.
- Ownership mapping (`node-id.ts`):
  - `#/paths/~1pets/get/...` → `GET /pets`; `#/paths/~1pets/parameters/0` → `/pets`; `#/components/schemas/User/properties/address` → `schemas/User`; callback sites map to the outer operation; other root-level sites → generic fallback node with a root spine edge.
  - Site/target in a non-root file → file node, or `file#/components/...`-style component node when the pointer addresses a component section inside that file.
- Unresolved refs: target id derived from the raw `$ref` (same-file pointer → `mapRootPointer`; uri part → injected `resolveRef(siteFile, uri)`), node upserted `resolved: false` (`✗ not found` marker reused). `isAbsoluteUrl` targets → `external: true`.
- Deterministic output: same codepoint sorting as the files-mode builder.

## `--affected-by` matching (default mode)

Pure `match-affected-by.ts`; per input, first rule that matches wins:

1. **Exact node id** (`schemas/Pet`, `/pets`, `GET /pets`, file ids, URLs).
2. **Pointer form** (starts with `#`): mapped via `mapRootPointer` (`#/components/schemas/Pet`; bonus: `#/paths/~1pets/get`).
3. **File path**: normalized cwd-relative; matches all nodes with `node.file === rel`. Passing the root file itself → the whole tree is affected: `changedIds` = all nodes, the `← changed` marker goes on the root only, stderr note `<root> is the root document — the whole tree is affected.`
4. **Bare component name** (`Pet`): all `kind: 'component'` nodes whose last `/`-segment equals it. Ambiguous → match ALL + stderr note listing the matches (impact analysis must over-report, not under-report).

Unknown input → stderr warning (`<input> does not match any path, operation, or component of <root>.`), exit 0. Files mode keeps today's matching and warning text verbatim.

## Renderer adjustments

Only `print/stylish.ts` changes. `StylishOptions` becomes `{ changed?: string[]; summary?: string; emptyMessage?: string }` — the handler composes the summary:

- Files mode: byte-identical summary to today (`N of M files affected · affected roots: ...`).
- Default mode: `N of M operations affected · affected paths: /pets, /users` (counted via `kind`), falling back to `N of M nodes affected` when the document has no operations (AsyncAPI/Arazzo). Empty result: `No nodes affected.` (files mode keeps `No files affected.`).

`json.ts` / `mermaid.ts` unchanged (`kind`/`file` appear additively in json; mermaid labels are quoted so spaces in `GET /pets` are safe).

## CLI surface

```bash
redocly tree [api]                       # default: internal structure (exactly one API)
redocly tree --files [apis...]           # file-level $ref graph (multi-API supported, today's behavior)
redocly tree --format <stylish|json|mermaid>
redocly tree --affected-by <input> [--affected-by <input>]  # repeat per input
redocly tree --config <path>
```

- Command name `tree`, description `Display the structure of an API description as a tree.`, env prefix `REDOCLY_CLI_TREE`.
- `TreeArgv` replaces `GraphArgv` in the `CommandArgv` union; `TreeFormat` replaces `GraphFormat` (same values — the `lint.ts` mermaid guard is untouched).
- Exit codes unchanged: 0 success (incl. "affects nothing"), 1 execution error (incl. multi-API in default mode), 2 config error.

## Error handling

| Situation                             | Behavior                                                    |
| ------------------------------------- | ----------------------------------------------------------- |
| Multiple APIs in default mode         | `exitWithError`: pass a single API or use `--files`, exit 1 |
| Root missing/unparseable              | unchanged (clear error, exit 1)                             |
| Broken `$ref`                         | `resolved: false` node, exit 0                              |
| `--affected-by` input matches nothing | stderr warning, exit 0                                      |
| Root file passed to `--affected-by`   | full tree + root marked, stderr note, exit 0                |

## Testing

- Unit: `node-id.ts` (~10 mapping cases incl. `~1`/`~0` escaping, OAS2 sections, foreign files), `build-structure.ts` (~12 cases via the score test-harness pattern: spine enumeration, op→component edges, transitive chains, nested-pointer normalization, path-level params, self-edges, callback attribution, webhook fallback, unresolved, external URL, pruning, OAS2), `match-affected-by.ts` (~7 cases), adapted stylish tests. Existing `build-graph` (6) and `filter-affected` (5) tests survive unchanged.
- E2E: new primary single-file fixture (paths + component chains + fan-in + path-level param + pruned orphan): default stylish, json, pointer input, bare-name input, unknown input; multi-file fixture in default mode (cross-file blend) and with a file input (headline AI-review case); the 4 existing files-mode tests kept with **unchanged snapshot content** (regression guard).

## Documentation & release

- `docs/@v2/commands/graph.md` → `tree.md`, rewritten: structure mode first, `--files` section, all `--affected-by` input forms, markers legend, non-OpenAPI note, ref'd-path-item-file limitation.
- Sidebar entry moves to after `translate` (alphabetical); commands index line updated.
- `.changeset/graph-command.md` rewritten in place (still `'@redocly/cli': minor` — the command was never released).
