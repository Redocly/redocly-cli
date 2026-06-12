# `redocly tree` Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework `redocly graph` into `redocly tree`: default mode shows the internal structure of one API description (root → paths → operations → component chains); the existing file-level graph moves behind `--files` unchanged.

**Spec:** `docs/superpowers/specs/2026-06-12-tree-command-rework-design.md` (the contract — read it first).

**Architecture:** CLI-only. New pure modules `node-id.ts` (pointer→node mapping), `build-structure.ts` (walkDocument-based builder using the stats pattern + a `ref` visitor for every `$ref` site), `match-affected-by.ts` (input matcher). Reused untouched: `filter-affected.ts`, `print/json.ts`, `print/mermaid.ts`, `build-graph.ts` (files mode). Adjusted: `types.ts` (additive `kind`/`file`), `print/stylish.ts` (caller-provided `summary`/`emptyMessage`), handler (mode dispatch).

**Verified mechanics (trust these):**

- `walkDocument` fires `ref` enter visitors at EVERY ref site (`packages/core/src/walk.ts` ~182-209): visitor `(node, ctx, resolved)` where `ctx.location`/`ctx.rawLocation` = ref-site Location (`source.absoluteRef` + `pointer`), `resolved = { node, location: resolvedLocation, error }` with target Location (`source.absoluteRef` + `nodePointer`). Cycles terminate via the walker's seen-node dedup.
- Type-enter visitors receive `rawLocation` = the ref-site location for `$ref`'d nodes — pointer-prefix checks on `PathItem`/`Operation` hooks are reliable and immune to callbacks/webhooks misattribution.
- `normalizeVisitors` ignores visitor keys absent from the spec's type map → `PathItem`/`Operation` hooks are inert for AsyncAPI/Arazzo.
- PathItem methods across specs: `get put post delete options head patch trace query x-query`.
- Core public barrel: `unescapePointerFragment`, `escapePointerFragment`, `isAbsoluteUrl`, `slash`, `Source`, `normalizeVisitors`, `walkDocument`, `normalizeTypes`, `getTypes`, `detectSpec`, `resolveDocument`, `BaseResolver`, `logger`, types `Document`, `ResolvedRefMap`, `NormalizedNodeType`, `WalkContext`. NOT exported: `parsePointer`/`parseRef`/`joinPointer` → `node-id.ts` carries a tiny local `parsePointerSegments`.
- Unit-test harness for walking without fs: see `packages/cli/src/commands/score/__tests__/collect-metrics-helper.ts` (`Source` + parsed object + `normalizeTypes(getTypes(v), {})` + `resolveDocument` + `WalkContext`).
- Files referencing the command outside its folder: `packages/cli/src/index.ts` (yargs block), `packages/cli/src/types.ts` (union), docs/changeset/e2e. `lint.ts` guard keys on format values only — unchanged.
- Sidebar: `tree` sorts after `translate` (currently last in the Commands group).
- Known pre-existing failures (NOT ours): build-docs e2e bundle-size drift; respect-core `entity.test.ts` timeout flake; occasional `local-json-server` flake.

## Node model & id scheme

See spec. Summary: `GraphNode += kind?: 'root'|'path'|'operation'|'component'|'file'; file?: string` (default mode only). Ids: `openapi.yaml` / `/pets` / `GET /pets` / `schemas/Pet` (root-file component, no `#/`) / `definitions/Pet` (OAS2) / `webhooks/newPet` (fallback, first two segments) / `schemas/pet.yaml` (whole foreign file) / `common.yaml#/components/schemas/Pet` (component in foreign file). Nested target pointers normalize to the top-level component. Self-edges kept. Post-build prune to root-reachable. Default mode = exactly one API (else `exitWithError` suggesting `--files`).

## `node-id.ts` contract (T3)

```ts
const OPERATION_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
  'query',
  'x-query',
]);
const OAS2_COMPONENT_SECTIONS = new Set([
  'definitions',
  'parameters',
  'responses',
  'securityDefinitions',
]);

/** '#/paths/~1pets/get' -> ['paths', '/pets', 'get'] */
export function parsePointerSegments(pointer: string): string[];

export type MappedNode = {
  id: string;
  kind: NodeKind;
  /** Ancestor ids for structural spine edges, outermost first ([] = link directly to root; undefined = no structural link). */
  ancestry?: string[];
};

/** Maps a pointer within the ROOT document to its owning tree node. */
export function mapRootPointer(pointer: string, rootId: string): MappedNode;
// paths/{p}            -> { id: p, kind: 'path', ancestry: [] }
// paths/{p}/{method}.. -> { id: `${METHOD} ${p}`, kind: 'operation', ancestry: [p] }
// paths/{p}/<other>..  -> { id: p, kind: 'path', ancestry: [] }          (path-level params etc.)
// components/{t}/{n}.. -> { id: `${t}/${n}`, kind: 'component' }          (no ancestry)
// OAS2 {section}/{n}.. -> { id: `${section}/${n}`, kind: 'component' }
// ''                   -> { id: rootId, kind: 'root' }
// anything else        -> { id: first two segments (or one), kind: 'component', ancestry: [] }

/** Maps a location in a NON-root file: component inside it or the whole file. */
export function mapForeignLocation(fileId: string, pointer: string): MappedNode & { file: string };
// components-section pointer (depth 3) or OAS2 section (depth 2) -> { id: `${fileId}#/<canonical>`, kind: 'component' }
// otherwise -> { id: fileId, kind: 'file' }
```

## `build-structure.ts` contract (T4)

```ts
export function buildStructure(options: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  resolvedRefMap: ResolvedRefMap;
  ctx: WalkContext;
  cwd: string;
  resolveRef: (base: string, uri: string) => string; // BaseResolver.resolveExternalRef in prod
}): DependencyGraph;
```

- Visitor: `PathItem.enter` / `Operation.enter` act only when site is root file AND pointer has exactly 2 / 3 segments starting with `paths` (3rd ∈ OPERATION_METHODS) → materialize node + spine edges (refs `[]`).
- `ref.enter(refNode, ctx, resolved)`: owner = map(ctx.location), target = `resolved.location` ? map(resolved.location) : unresolved-target derivation (raw `$ref` split on `#`; empty uri → root-pointer mapping; else `resolveRef(siteFile, uri)` → file/foreign mapping; node `resolved:false`). Edge owner→target collects distinct `$ref` strings. `isAbsoluteUrl` ids → `external: true`.
- `materialize(mapped)` upserts node with kind/file and wires `root → ...ancestry → node` spine edges when `ancestry !== undefined`.
- Post-build: BFS-prune to root-reachable; codepoint-sort nodes/edges/refs (same comparator as `build-graph.ts`); `roots: [rootId]`.

## `match-affected-by.ts` contract (T6)

```ts
export function matchAffectedBy(
  graph: DependencyGraph,
  inputs: string[],
  options: { cwd: string; rootId: string }
): { changedIds: string[]; markerIds: string[]; notes: string[]; warnings: string[] };
```

Rules per input (first match wins): exact id → pointer (`#...` via mapRootPointer) → file path (`slash(path.relative(cwd, path.resolve(cwd, input)))`; equals rootId → ALL node ids changed, marker = root only, note) → bare component name (last segment match over `kind:'component'`; ambiguous → all + note). No match → warning. Handler logs notes/warnings via `logger.warn` (stderr), exit 0.

## Stylish options (T5)

`StylishOptions = { changed?: string[]; summary?: string; emptyMessage?: string }` — renderer appends `summary` after a blank line when set; empty graph returns `emptyMessage ?? 'No files affected.'`. Handler composes: files mode summary byte-identical to today; default mode `N of M operations affected · affected paths: <paths|none>` (fallback `N of M nodes affected` when the full graph has zero `kind:'operation'` nodes); default empty message `No nodes affected.`

## Tasks (TDD, one commit each; verification: `npm run compile` before unit/e2e)

- **T1** Spec+plan docs (this file + spec) → `docs: add tree command rework spec and plan`
- **T2** Mechanical rename: `git mv packages/cli/src/commands/graph packages/cli/src/commands/tree`; `git mv tests/e2e/graph tests/e2e/tree`; symbols `handleGraph→handleTree`, `GraphArgv→TreeArgv`, `GraphFormat→TreeFormat`; yargs `'tree [apis...]'` + desc `Display the structure of an API description as a tree.` + `.env('REDOCLY_CLI_TREE')`; union import/member in `packages/cli/src/types.ts`; e2e test runs `'tree'`, snapshot dirs `graph-*` → `tree-files-*` (содержимое unchanged), fixture dir stays `graph-multi-file` → rename to `tree-multi-file` (update test paths). Verify: typecheck + unit + e2e (tests/e2e/tree). Commit `refactor: rename graph command to tree`.
- **T3** `node-id.ts` + `__tests__/node-id.test.ts` (~10 cases: escaping `~1/~0`; root/path/operation/path-level/component/OAS2/fallback/x-query; foreign component canonical id; foreign whole-file). Commit `feat: add pointer-to-node mapping for the tree structure view`.
- **T4** `types.ts` additive fields; `build-structure.ts` + `__tests__/build-structure.test.ts` (~12 cases listed in spec Testing section; harness per score pattern with injected `resolveRef`). Commit `feat: add internal-structure builder for the tree command`.
- **T5** stylish options refactor + adapt 2 print tests (summary now caller-provided string). Commit `refactor: make stylish summary and empty message caller-provided`.
- **T6** `match-affected-by.ts` + ~7 tests. Commit `feat: match affected-by inputs against tree nodes`.
- **T7** Handler rework (`--files` dispatch keeps today's path verbatim incl. summary text; default mode: single-API guard → buildStructure → matcher → filterAffected → summary → render) + yargs `files` boolean option + `--affected-by` description update. Verify: files-mode e2e snapshots UNCHANGED; manual smoke. Commit `feat: make document structure the default tree view behind --files fallback`.
- **T8** E2E: new `tests/e2e/tree/tree-single-file/openapi.yaml` (paths `/pets` GET+POST, `/pets/{petId}` GET, `/users` GET; `components.schemas`: `Pet→Address`, `PetInput→Pet`, `User→Address` (fan-in `↺`), `parameters/PetId` referenced at path level, unused `Orphan` (proves pruning)); tests: default stylish, json, `--affected-by '#/components/schemas/Address'`, `--affected-by Address`, `--affected-by schemas/Unknown` (warning), multi-file default mode, multi-file default `--affected-by components/schemas/Address.yaml` (file input → impacted operations); 4 files-mode tests kept. Commit `test: cover tree structure mode end to end`.
- **T9** `git mv docs/@v2/commands/graph.md docs/@v2/commands/tree.md` + rewrite per spec; sidebar move after `translate`; commands index line `- [\`tree\`](tree.md) Display the structure of an API description as a tree.`; rewrite `.changeset/graph-command.md`. Check `grep -rn "commands/graph" docs/`clean. Commit`docs: document the tree command and update the changeset`.
- **T10** `npm test` (known pre-existing failures excepted) + `grep -rni "redocly graph\|REDOCLY_CLI_GRAPH\|handleGraph\|GraphArgv" packages docs tests` clean + final whole-feature review.

## Risks

- YAML anchor-shared operation objects enumerate once (walker dedup) — accepted.
- `$ref`'d path-item walker ordering — early T4 test; ref-visitor spine creation is the fallback.
- Files-mode snapshot content diffs = regression signal (only dir names change).
