# `redocly graph` Command — Design

**Date:** 2026-06-11
**Branch:** `feat/graph-command`
**Status:** Approved

## Motivation

Multi-file OpenAPI projects spread their structure across dozens of files connected by `$ref`. Today there is no way to see that structure without reading the files. Two audiences need it:

1. **AI tooling (primary driver).** AI Review must know which files are impacted by a change without guessing or reading every file in the repo. A machine-readable dependency graph plus a built-in "what is affected by a change to file X" query answers this in one command call and saves tokens.
2. **Humans.** A `tree`-style view of an API project for quick orientation, and a Mermaid diagram for docs and PR comments (GitHub renders Mermaid natively).

The data already exists: `resolveDocument()` in `packages/core/src/resolve.ts` produces a `ResolvedRefMap` whose entries identify, for every `$ref`, the source file, the `$ref` string, the target file, and whether the reference crosses file boundaries (`isRemote`). The command surfaces what core already computes on every bundle/lint run.

## Goals

- New CLI command `redocly graph` that prints the file-level `$ref` dependency graph of one or more API descriptions.
- Output formats: `stylish` (ASCII tree, default), `json` (machine-readable), `mermaid` (renderable diagram).
- Impact query: `--affected-by <file...>` prints only the subgraph affected by changes to the given files.
- Works for every spec type core can resolve (OpenAPI 2/3.x, AsyncAPI, Arazzo) with no spec-specific logic.

## Non-goals

- No changes to `packages/core` — the command consumes existing public core APIs (`BaseResolver`, `resolveDocument`, spec detection/type normalization), following the precedent of the `stats` command.
- No component-level (pointer-level) graph nodes; nodes are files. Edge metadata does include the distinct `$ref` strings, which is enough detail for impact analysis.
- No DOT/Graphviz output in MVP.
- No validation: broken `$ref`s are displayed, not reported as errors — that is `lint`'s job.

## CLI Surface

```bash
redocly graph [apis...]                        # no args: all APIs from redocly.yaml (lint convention)
redocly graph openapi.yaml                     # explicit root(s)
redocly graph --format <stylish|json|mermaid>  # default: stylish
redocly graph --affected-by <file> [--affected-by <file>] # impact filter; repeat the flag per file
redocly graph --config <path>                  # standard config flag
```

- Registered in `packages/cli/src/index.ts` via yargs, executed through `commandWrapper(handleGraph)` like every other command.
- Multiple roots produce one **merged** graph (shared nodes/edges deduplicated, every root flagged). This is required for trustworthy impact analysis: a shared schema may affect 2 of 5 configured APIs, and the answer must say which.
- Exit codes follow repo convention: `0` success (including "file affects nothing"), `1` execution error (root missing/unparseable), `2` config error.

## Data Model

The single contract consumed by all three printers:

```ts
type DependencyGraph = {
  roots: string[]; // root file ids
  nodes: GraphNode[];
  edges: GraphEdge[]; // deduplicated file→file edges
};

type GraphNode = {
  id: string; // path relative to cwd; http(s) refs keep the URL as id
  root?: boolean; // entry-point API file
  external?: boolean; // http(s) reference
  resolved: boolean; // false: referenced but missing/unparseable
};

type GraphEdge = {
  from: string;
  to: string;
  refs: string[]; // distinct $ref strings used from `from` to `to`
};
```

Notes:

- Node ids are stable, cwd-relative paths so output is reproducible in CI and diffable.
- `refs` per edge comes directly from `ResolvedRefMap` entries and tells AI consumers _which_ references create the dependency, not just that one exists.
- Cycles between files are legal and representable (edges form a general directed graph, not a tree).
- Failed resolutions become nodes with `resolved: false` so the graph honestly shows holes without failing the command.

## Execution Flow

Mirrors `stats`, minus bundling (the bundle output is not needed — only the resolution pass):

```
handleGraph({ argv, config })
  → getFallbackApisOrExit(argv.apis, config)
  → one shared BaseResolver(config.resolve) for the whole invocation
  → for each root:
      resolver.resolveDocument(rootPath)       // parse root document
      detect spec + normalized types            // same helpers stats uses
      resolveDocument({ rootDocument, rootType, externalRefResolver })
  → buildGraph(resolvedRefMaps, roots)          // pure function → DependencyGraph
  → if --affected-by: filterAffected(graph, files)
  → printGraph[format](graph)                   // stdout
```

- One shared `BaseResolver` means files shared between roots are read once (resolver caches by absolute path).
- `buildGraph` iterates `ResolvedRefMap` entries: source file comes from the entry key (`makeRefId(sourceAbsoluteRef, $ref)`), target file from the resolved document's `source.absoluteRef`, cross-file edges identified via `isRemote`. Exact field access is verified against `resolve.ts` during implementation.
- Telemetry parity with other commands: `collectSpecData` is called with each parsed root, and `commandWrapper` handles the rest.

## `--affected-by` Semantics

Reverse BFS over edges starting from the given files: collect every file that references them, transitively, up to the roots. The result is the induced subgraph (changed files + all transitive dependents + edges among them), rendered in whichever `--format` is active.

- Input paths are resolved against cwd to absolute form and matched to node ids; output stays cwd-relative.
- Multiple files: the affected sets are unioned. The flag is passed once per file (`--affected-by a.yaml --affected-by b.yaml`) — the CLI's global `greedy-arrays: false` parser setting means space-separated values after one flag would be read as extra API positionals.
- `stylish` prunes the tree to affected branches, marks the queried files with a `← changed` suffix, and appends a summary line, e.g. `2 of 6 files affected · affected roots: openapi.yaml`.
- A queried file that is not part of the graph produces a **stderr** warning (`schemas/Unused.yaml is not referenced by any processed API`) and exit code `0` — for AI Review "nothing depends on this" is a legitimate answer, not an error. If no queried file is in the graph, the output is an empty graph in the chosen format (`stylish` prints `No files affected.`).
- stdout stays pure for `json` and `mermaid` (no banners or progress text) so output can be piped.

## Output Formats

### stylish (default)

One tree per root, root filename as the header line:

```
openapi.yaml
├── paths/pets.yaml
│   └── components/schemas/Pet.yaml
└── paths/users.yaml
    └── components/schemas/User.yaml
        ├── components/schemas/Pet.yaml ↺
        └── components/schemas/missing.yaml ✗ not found
```

- `↺` — node already expanded earlier in this tree; children are not repeated. This single rule handles both cycles and fan-in (a schema referenced 50 times prints its subtree once), keeping output linear in the number of edges.
- `✗ not found` — unresolved reference (`resolved: false`).
- `(external)` suffix — http(s) URL nodes.

### json

The `DependencyGraph` model serialized as-is (2-space indent):

```json
{
  "roots": ["openapi.yaml"],
  "nodes": [
    { "id": "openapi.yaml", "root": true, "resolved": true },
    { "id": "paths/users.yaml", "resolved": true },
    { "id": "components/schemas/User.yaml", "resolved": true }
  ],
  "edges": [
    { "from": "openapi.yaml", "to": "paths/users.yaml", "refs": ["paths/users.yaml"] },
    {
      "from": "paths/users.yaml",
      "to": "components/schemas/User.yaml",
      "refs": ["../components/schemas/User.yaml"]
    }
  ]
}
```

### mermaid

`flowchart LR` with stable sequential node ids and roots highlighted:

```
flowchart LR
  n0["openapi.yaml"]:::root
  n1["paths/users.yaml"]
  n2["components/schemas/User.yaml"]
  n0 --> n1
  n1 --> n2
  classDef root font-weight:bold
```

Labels are double-quoted (Mermaid's mechanism for special characters such as brackets); literal `"` inside a label is escaped as `#quot;`.

## Error Handling

| Situation                              | Behavior                                                                |
| -------------------------------------- | ----------------------------------------------------------------------- |
| Root file missing                      | `getFallbackApisOrExit` reports and exits (existing behavior), exit `1` |
| Root file unparseable                  | Clear error via `commandWrapper`, exit `1`                              |
| Broken `$ref` inside the graph         | Node with `resolved: false`, command succeeds with exit `0`             |
| `--affected-by` file outside the graph | stderr warning, exit `0`                                                |
| Config problems                        | Standard config error path, exit `2`                                    |

## File Layout

```
packages/cli/src/commands/graph/
├── index.ts          # handleGraph: resolve roots → build → filter → print
├── build-graph.ts    # pure: ResolvedRefMap[] + roots → DependencyGraph
├── filter-affected.ts# pure: DependencyGraph + files → induced subgraph
└── print/
    ├── stylish.ts
    ├── json.ts
    └── mermaid.ts
```

Every function carries a concise purpose docstring (repo code-quality standard). No wrapper layers beyond this — handler calls pure functions directly.

## Testing

- **Unit** (`packages/cli/src/commands/graph/__tests__/`):
  - `build-graph`: edges from a refMap fixture; cycle between two files; external URL node; unresolved ref node.
  - `filter-affected`: chain where root `$ref`s B and B `$ref`s C; querying C yields `{root, B, C}`; untouched sibling branch excluded; queried file outside graph → empty result.
  - Printers: inline snapshots of all three formats over one small fixture graph.
- **E2E**: one multi-file fixture (root + two path files + one shared schema), snapshots for default tree, `--format=json`, and `--affected-by`, following the existing e2e suite structure.
- Coverage stays above the repo's 71% threshold; no `console.log` added to production paths outside the printers (e2e is snapshot-based).

## Documentation & Release

- New page `docs/@v2/commands/graph.md` modeled on `stats.md`: description, usage, options table, examples — including the AI Review scenario (`--affected-by` + `--format=json`).
- Sidebar entry in `docs/@v2/v2.sidebars.yaml`.
- Changeset: `minor` for `@redocly/cli` (new feature; `@redocly/openapi-core` untouched).

## Decisions Log

| Decision            | Choice                               | Rationale                                                                                                                   |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Audience            | Both human + machine via `--format`  | One data model, cheap formatters; follows `stats` precedent                                                                 |
| Impact query in MVP | Yes, `--affected-by`                 | It is the stated motivation (AI Review); cheap reverse BFS over already-built edges; output filtering saves tokens          |
| Formats             | `stylish` + `json` + `mermaid`       | Mermaid covers the "graphical" ask and renders natively on GitHub; DOT deferred (YAGNI)                                     |
| Architecture        | CLI-only, no core changes            | Identical to `stats` pattern; smallest review surface; pure `buildGraph` can move to core later if language-server needs it |
| Multiple roots      | Merged graph, lint-style `[apis...]` | Impact analysis must span all configured APIs to be trustworthy                                                             |
| Broken refs         | Shown, not fatal                     | Graph reports structure; validation belongs to `lint`                                                                       |
