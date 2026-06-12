# `redocly graph` Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `redocly graph` command that prints the file-level `$ref` dependency graph of API descriptions as an ASCII tree (`stylish`), `json`, or `mermaid`, with an `--affected-by` filter that shows only the subgraph impacted by changes to given files.

**Architecture:** CLI-only (no core changes), mirroring the `stats` command: `BaseResolver` + `resolveDocument()` from `@redocly/openapi-core` produce a `ResolvedRefMap`; a pure `buildGraph()` converts ref maps into a `DependencyGraph` model; a pure `filterAffected()` computes the reverse closure; three pure renderers return strings printed via `logger.output()` (stdout stays clean — `logger.info/warn` go to stderr).

**Tech Stack:** TypeScript ESM (`.js` import suffixes), yargs, vitest (unit: `packages/cli/src/**/*.test.ts`; e2e: `tests/e2e/**`), Changesets.

**Spec:** `docs/superpowers/specs/2026-06-11-graph-command-design.md`

**Key codebase facts (verified):**

- `ResolvedRefMap = Map<string, ResolvedRef>`; key = `makeRefId(sourceAbsoluteRef, ref.$ref)` = `` `${sourceAbsoluteRef}::${$ref}` `` (`packages/core/src/utils/make-ref-id.ts`).
- `ResolvedRef` is a union: `{ resolved: true; node; document: Document; nodePointer; isRemote }` or `{ resolved: false; isRemote; document?: Document; error?; ... }`. The type itself is NOT exported from core — only `ResolvedRefMap` is; iterate the map to get values typed structurally.
- `isRemote === true` ⇔ the `$ref` target lives in a DIFFERENT file than the source (`resolve.ts:389-395`). Not http-specific. These are exactly the file→file edges.
- Successful target file = `resolvedRef.document.source.absoluteRef`. Failed file load = `document: undefined` + `error`; recover the attempted path via `resolver.resolveExternalRef(sourceAbsoluteRef, uriPartOf$ref)` (public method, `resolve.ts:101`).
- Root loading: `await externalRefResolver.resolveDocument(null, apiPath, true)` returns `Document | ResolveError | YamlParseError` (both errors extend `Error`).
- Root type derivation (same as `lint.ts`/`stats`): `detectSpec(parsed)` → `normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config)` → pass `types.Root` to `resolveDocument({ rootDocument, rootType, externalRefResolver })`.
- Public core exports used: `BaseResolver`, `resolveDocument`, `detectSpec`, `getTypes`, `normalizeTypes`, `Source`, `ResolveError`, `logger`, `isAbsoluteUrl`, `slash`, types `Document`, `ResolvedRefMap`.
- `logger.output()` → stdout; `logger.info/warn/error` → stderr. JSON/mermaid purity relies on using ONLY `logger.output` for graph content.
- `CommandArgv` (`packages/cli/src/types.ts:30-45`) is a closed union — `GraphArgv` must be added.
- `getFallbackApisOrExit(argsApis: string[] | undefined, config)` → `Promise<Entrypoint[]>` (`{ path, alias?, output? }`); with no args falls back to all APIs from `redocly.yaml`.
- Unit tests: vitest with globals (no `describe/it/expect` imports), files at `packages/cli/src/commands/<cmd>/__tests__/*.test.ts`. `@redocly/openapi-core` resolves to compiled `lib/` → run `npm run compile` before unit tests.
- E2E: `tests/e2e/graph/graph.test.ts` + fixture dirs, runs `node packages/cli/lib/index.js` via helpers `getParams`/`getCommandOutput`/`cleanupOutput`, snapshots via `toMatchFileSnapshot(join(testPath, 'snapshot.txt'))`. Update with `npm run e2e -- -u`.
- Resolution is async/parallel ⇒ map insertion order is nondeterministic. `buildGraph` MUST sort nodes/edges/refs for stable snapshots. Roots keep CLI/config order; stylish tree children are sorted.

## File Structure

```
packages/cli/src/commands/graph/
├── index.ts            # GraphArgv + handleGraph (orchestration only)
├── types.ts            # DependencyGraph, GraphNode, GraphEdge, GraphFormat
├── build-graph.ts      # pure: ref maps → DependencyGraph
├── filter-affected.ts  # pure: graph + changed node ids → induced subgraph
├── print/
│   ├── stylish.ts      # renderStylish(): ASCII trees + markers + summary
│   ├── json.ts         # renderJson()
│   └── mermaid.ts      # renderMermaid()
└── __tests__/
    ├── build-graph.test.ts
    ├── filter-affected.test.ts
    └── print.test.ts

packages/cli/src/types.ts          # add GraphArgv to CommandArgv union
packages/cli/src/index.ts          # yargs registration

tests/e2e/graph/
├── graph.test.ts
└── graph-multi-file/              # fixture + snapshot dirs (see Task 5)

docs/@v2/commands/graph.md         # command docs
docs/@v2/v2.sidebars.yaml          # sidebar entry
docs/@v2/commands/index.md         # commands list entry
.changeset/graph-command.md        # minor release note
```

---

### Task 0: Baseline compile

- [ ] **Step 0.1: Compile workspaces so `@redocly/openapi-core` resolves to fresh `lib/`**

Run: `npm run compile`
Expected: exits 0. (Re-run after any `packages/core` changes; not needed between pure-CLI edits because vitest transpiles CLI `src/` on the fly, but e2e ALWAYS needs a fresh compile of `packages/cli`.)

---

### Task 1: Graph model types + `buildGraph()`

**Files:**

- Create: `packages/cli/src/commands/graph/types.ts`
- Create: `packages/cli/src/commands/graph/build-graph.ts`
- Create: `packages/cli/src/commands/graph/__tests__/build-graph.test.ts`

- [ ] **Step 1.1: Create the model types**

`packages/cli/src/commands/graph/types.ts`:

```typescript
export type GraphFormat = 'stylish' | 'json' | 'mermaid';

export type GraphNode = {
  /** Path relative to cwd; http(s) refs keep the full URL. */
  id: string;
  /** Entry-point API file. */
  root?: boolean;
  /** Node is an http(s) URL, not a local file. */
  external?: boolean;
  /** False: the file is referenced but could not be loaded. */
  resolved: boolean;
};

export type GraphEdge = {
  from: string;
  to: string;
  /** Distinct $ref strings used from `from` to `to`, sorted. */
  refs: string[];
};

export type DependencyGraph = {
  roots: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
};
```

- [ ] **Step 1.2: Write the failing tests**

`packages/cli/src/commands/graph/__tests__/build-graph.test.ts`:

```typescript
import { ResolveError, Source, type Document, type ResolvedRefMap } from '@redocly/openapi-core';
import * as path from 'node:path';

import { buildGraph } from '../build-graph.js';

const CWD = '/project';

/** Creates a minimal core Document for a given absolute path or URL. */
function makeDocument(absoluteRef: string): Document {
  return { source: new Source(absoluteRef, ''), parsed: {} };
}

/** Creates a successfully resolved cross-file ResolvedRefMap entry value. */
function resolvedEntry(targetAbsoluteRef: string, isRemote = true) {
  return {
    resolved: true as const,
    isRemote,
    node: {},
    nodePointer: '#/',
    document: makeDocument(targetAbsoluteRef),
  };
}

/** Resolves a $ref uri against the source file directory, like BaseResolver.resolveExternalRef. */
const resolveRef = (base: string, uri: string) => path.resolve(path.dirname(base), uri);

describe('buildGraph', () => {
  it('builds nodes and edges from cross-file refs, transitively', () => {
    const refMap: ResolvedRefMap = new Map([
      ['/project/openapi.yaml::paths/users.yaml', resolvedEntry('/project/paths/users.yaml')],
      [
        '/project/paths/users.yaml::../components/User.yaml',
        resolvedEntry('/project/components/User.yaml'),
      ],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/openapi.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph).toEqual({
      roots: ['openapi.yaml'],
      nodes: [
        { id: 'components/User.yaml', resolved: true },
        { id: 'openapi.yaml', root: true, resolved: true },
        { id: 'paths/users.yaml', resolved: true },
      ],
      edges: [
        { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
        {
          from: 'paths/users.yaml',
          to: 'components/User.yaml',
          refs: ['../components/User.yaml'],
        },
      ],
    });
  });

  it('skips same-file refs', () => {
    const refMap: ResolvedRefMap = new Map([
      [
        '/project/openapi.yaml::#/components/schemas/Pet',
        { ...resolvedEntry('/project/openapi.yaml'), isRemote: false },
      ],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/openapi.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph.nodes).toEqual([{ id: 'openapi.yaml', root: true, resolved: true }]);
    expect(graph.edges).toEqual([]);
  });

  it('dedupes edges across refs and across roots, collecting distinct sorted refs', () => {
    const entryY = resolvedEntry('/project/b.yaml');
    const entryX = resolvedEntry('/project/b.yaml');
    const refMapA: ResolvedRefMap = new Map([
      ['/project/a.yaml::b.yaml#/Y', entryY],
      ['/project/a.yaml::b.yaml#/X', entryX],
    ]);
    const refMapB: ResolvedRefMap = new Map([['/project/a.yaml::b.yaml#/X', entryX]]);

    const graph = buildGraph(
      [
        { rootDocument: makeDocument('/project/a.yaml'), refMap: refMapA },
        { rootDocument: makeDocument('/project/b.yaml'), refMap: refMapB },
      ],
      { cwd: CWD, resolveRef }
    );

    expect(graph.roots).toEqual(['a.yaml', 'b.yaml']);
    expect(graph.edges).toEqual([
      { from: 'a.yaml', to: 'b.yaml', refs: ['b.yaml#/X', 'b.yaml#/Y'] },
    ]);
    expect(graph.nodes).toEqual([
      { id: 'a.yaml', root: true, resolved: true },
      { id: 'b.yaml', root: true, resolved: true },
    ]);
  });

  it('represents unresolved refs as resolved:false nodes with an edge', () => {
    const refMap: ResolvedRefMap = new Map([
      [
        '/project/openapi.yaml::./missing.yaml#/Pet',
        {
          resolved: false as const,
          isRemote: true,
          document: undefined,
          error: new ResolveError(new Error('ENOENT')),
        },
      ],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/openapi.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph.nodes).toEqual([
      { id: 'missing.yaml', resolved: false },
      { id: 'openapi.yaml', root: true, resolved: true },
    ]);
    expect(graph.edges).toEqual([
      { from: 'openapi.yaml', to: 'missing.yaml', refs: ['./missing.yaml#/Pet'] },
    ]);
  });

  it('keeps http(s) targets as external URL nodes', () => {
    const refMap: ResolvedRefMap = new Map([
      [
        '/project/openapi.yaml::https://example.com/shared.yaml#/S',
        resolvedEntry('https://example.com/shared.yaml'),
      ],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/openapi.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph.nodes).toEqual([
      { id: 'https://example.com/shared.yaml', external: true, resolved: true },
      { id: 'openapi.yaml', root: true, resolved: true },
    ]);
  });

  it('handles cyclic file references', () => {
    const refMap: ResolvedRefMap = new Map([
      ['/project/a.yaml::b.yaml', resolvedEntry('/project/b.yaml')],
      ['/project/b.yaml::a.yaml', resolvedEntry('/project/a.yaml')],
    ]);

    const graph = buildGraph([{ rootDocument: makeDocument('/project/a.yaml'), refMap }], {
      cwd: CWD,
      resolveRef,
    });

    expect(graph.edges).toEqual([
      { from: 'a.yaml', to: 'b.yaml', refs: ['b.yaml'] },
      { from: 'b.yaml', to: 'a.yaml', refs: ['a.yaml'] },
    ]);
  });
});
```

- [ ] **Step 1.3: Run the tests to verify they fail**

Run: `npm run unit -- packages/cli/src/commands/graph/__tests__/build-graph.test.ts`
Expected: FAIL — cannot find module `../build-graph.js`.

- [ ] **Step 1.4: Implement `buildGraph`**

`packages/cli/src/commands/graph/build-graph.ts`:

```typescript
import { isAbsoluteUrl, slash, type Document, type ResolvedRefMap } from '@redocly/openapi-core';
import * as path from 'node:path';

import type { DependencyGraph, GraphEdge, GraphNode } from './types.js';

/** Converts an absolute file path or URL into a stable node id (cwd-relative posix path; URLs as-is). */
function toNodeId(absoluteRef: string, cwd: string): string {
  return isAbsoluteUrl(absoluteRef) ? absoluteRef : slash(path.relative(cwd, absoluteRef));
}

/**
 * Builds the file-level dependency graph from the resolver's ref maps of one or more roots.
 * Only cross-file refs (isRemote) become edges; nodes/edges/refs are sorted for stable output.
 */
export function buildGraph(
  resolutions: Array<{ rootDocument: Document; refMap: ResolvedRefMap }>,
  options: { cwd: string; resolveRef: (base: string, uri: string) => string }
): DependencyGraph {
  const { cwd, resolveRef } = options;
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  /** Merges-or-creates a node, OR-ing its resolved/root/external flags. */
  const upsertNode = (id: string, resolved: boolean, root?: boolean) => {
    const node = nodes.get(id) ?? { id, resolved: false };
    if (resolved) node.resolved = true;
    if (root) node.root = true;
    if (isAbsoluteUrl(id)) node.external = true;
    nodes.set(id, node);
  };

  for (const { rootDocument, refMap } of resolutions) {
    upsertNode(toNodeId(rootDocument.source.absoluteRef, cwd), true, true);

    for (const [refId, resolvedRef] of refMap) {
      if (!resolvedRef.isRemote) continue;

      const separatorIndex = refId.indexOf('::');
      const sourceAbsolute = refId.slice(0, separatorIndex);
      const refString = refId.slice(separatorIndex + 2);
      const targetAbsolute =
        resolvedRef.document?.source.absoluteRef ??
        resolveRef(sourceAbsolute, refString.split('#')[0]);

      const from = toNodeId(sourceAbsolute, cwd);
      const to = toNodeId(targetAbsolute, cwd);
      upsertNode(from, true);
      upsertNode(to, resolvedRef.document !== undefined);

      const edgeKey = `${from} -> ${to}`;
      const edge = edges.get(edgeKey) ?? { from, to, refs: [] };
      if (!edge.refs.includes(refString)) {
        edge.refs.push(refString);
      }
      edges.set(edgeKey, edge);
    }
  }

  // Codepoint comparison (not localeCompare): deterministic across Node ICU builds → stable snapshots.
  const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

  return {
    roots: resolutions.map(({ rootDocument }) => toNodeId(rootDocument.source.absoluteRef, cwd)),
    nodes: [...nodes.values()].sort((a, b) => byString(a.id, b.id)),
    edges: [...edges.values()]
      .map((edge) => ({ ...edge, refs: [...edge.refs].sort() }))
      .sort((a, b) => byString(a.from, b.from) || byString(a.to, b.to)),
  };
}
```

Note on node shape: `root`/`external` are set only when true (optional props), so `toEqual` fixtures in Step 1.2 list them only where expected.

- [ ] **Step 1.5: Run the tests to verify they pass**

Run: `npm run unit -- packages/cli/src/commands/graph/__tests__/build-graph.test.ts`
Expected: 6 passed.

Also run: `npm run typecheck`
Expected: exit 0 (vitest does not typecheck — catch type errors now, not in Task 4).

- [ ] **Step 1.6: Commit**

```bash
git add packages/cli/src/commands/graph
git commit -m "feat: add dependency graph builder for graph command"
```

---

### Task 2: `filterAffected()`

**Files:**

- Create: `packages/cli/src/commands/graph/filter-affected.ts`
- Create: `packages/cli/src/commands/graph/__tests__/filter-affected.test.ts`

- [ ] **Step 2.1: Write the failing tests**

`packages/cli/src/commands/graph/__tests__/filter-affected.test.ts`:

```typescript
import { filterAffected } from '../filter-affected.js';

import type { DependencyGraph } from '../types.js';

const graph: DependencyGraph = {
  roots: ['openapi.yaml'],
  nodes: [
    { id: 'components/Address.yaml', resolved: true },
    { id: 'components/User.yaml', resolved: true },
    { id: 'openapi.yaml', root: true, resolved: true },
    { id: 'paths/pets.yaml', resolved: true },
    { id: 'paths/users.yaml', resolved: true },
  ],
  edges: [
    { from: 'components/User.yaml', to: 'components/Address.yaml', refs: ['Address.yaml'] },
    { from: 'openapi.yaml', to: 'paths/pets.yaml', refs: ['paths/pets.yaml'] },
    { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
    { from: 'paths/users.yaml', to: 'components/User.yaml', refs: ['../components/User.yaml'] },
  ],
};

describe('filterAffected', () => {
  it('returns the changed file plus all transitive dependents up to the root', () => {
    const affected = filterAffected(graph, ['components/Address.yaml']);

    expect(affected.nodes.map((node) => node.id)).toEqual([
      'components/Address.yaml',
      'components/User.yaml',
      'openapi.yaml',
      'paths/users.yaml',
    ]);
    expect(affected.roots).toEqual(['openapi.yaml']);
  });

  it('excludes edges leading to untouched branches', () => {
    const affected = filterAffected(graph, ['components/Address.yaml']);

    expect(affected.edges).toEqual([
      { from: 'components/User.yaml', to: 'components/Address.yaml', refs: ['Address.yaml'] },
      { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
      { from: 'paths/users.yaml', to: 'components/User.yaml', refs: ['../components/User.yaml'] },
    ]);
  });

  it('returns an empty graph when no changed ids are known', () => {
    expect(filterAffected(graph, [])).toEqual({ roots: [], nodes: [], edges: [] });
  });
});
```

- [ ] **Step 2.2: Run the tests to verify they fail**

Run: `npm run unit -- packages/cli/src/commands/graph/__tests__/filter-affected.test.ts`
Expected: FAIL — cannot find module `../filter-affected.js`.

- [ ] **Step 2.3: Implement `filterAffected`**

`packages/cli/src/commands/graph/filter-affected.ts`:

```typescript
import type { DependencyGraph } from './types.js';

/**
 * Returns the induced subgraph affected by changes to the given files:
 * the changed nodes plus every transitive dependent (reverse closure up to the roots).
 * `changedIds` must already be node ids of the graph (cwd-relative paths).
 */
export function filterAffected(graph: DependencyGraph, changedIds: string[]): DependencyGraph {
  const dependentsByTarget = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const dependents = dependentsByTarget.get(edge.to) ?? [];
    dependents.push(edge.from);
    dependentsByTarget.set(edge.to, dependents);
  }

  const affected = new Set(changedIds);
  const queue = [...affected];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of dependentsByTarget.get(current) ?? []) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return {
    roots: graph.roots.filter((root) => affected.has(root)),
    nodes: graph.nodes.filter((node) => affected.has(node.id)),
    edges: graph.edges.filter((edge) => affected.has(edge.from) && affected.has(edge.to)),
  };
}
```

- [ ] **Step 2.4: Run the tests to verify they pass**

Run: `npm run unit -- packages/cli/src/commands/graph/__tests__/filter-affected.test.ts`
Expected: 3 passed.

Also run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 2.5: Commit**

```bash
git add packages/cli/src/commands/graph/filter-affected.ts packages/cli/src/commands/graph/__tests__/filter-affected.test.ts
git commit -m "feat: add affected-files filter for graph command"
```

---

### Task 3: Renderers (`stylish`, `json`, `mermaid`)

**Files:**

- Create: `packages/cli/src/commands/graph/print/stylish.ts`
- Create: `packages/cli/src/commands/graph/print/json.ts`
- Create: `packages/cli/src/commands/graph/print/mermaid.ts`
- Create: `packages/cli/src/commands/graph/__tests__/print.test.ts`

Renderers are pure (`graph → string`); the handler prints via `logger.output()`. No `console.log` anywhere (e2e is snapshot-based).

- [ ] **Step 3.1: Write the failing tests**

`packages/cli/src/commands/graph/__tests__/print.test.ts`:

```typescript
import { renderJson } from '../print/json.js';
import { renderMermaid } from '../print/mermaid.js';
import { renderStylish } from '../print/stylish.js';

import type { DependencyGraph } from '../types.js';

const graph: DependencyGraph = {
  roots: ['openapi.yaml'],
  nodes: [
    { id: 'components/Pet.yaml', resolved: true },
    { id: 'components/User.yaml', resolved: true },
    { id: 'components/missing.yaml', resolved: false },
    { id: 'https://example.com/shared.yaml', external: true, resolved: true },
    { id: 'openapi.yaml', root: true, resolved: true },
    { id: 'paths/pets.yaml', resolved: true },
    { id: 'paths/users.yaml', resolved: true },
  ],
  edges: [
    { from: 'components/User.yaml', to: 'components/Pet.yaml', refs: ['Pet.yaml'] },
    { from: 'components/User.yaml', to: 'components/missing.yaml', refs: ['missing.yaml'] },
    {
      from: 'components/User.yaml',
      to: 'https://example.com/shared.yaml',
      refs: ['https://example.com/shared.yaml#/Address'],
    },
    { from: 'openapi.yaml', to: 'paths/pets.yaml', refs: ['paths/pets.yaml'] },
    { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
    { from: 'paths/pets.yaml', to: 'components/Pet.yaml', refs: ['../components/Pet.yaml'] },
    { from: 'paths/users.yaml', to: 'components/User.yaml', refs: ['../components/User.yaml'] },
  ],
};

describe('renderStylish', () => {
  it('renders a tree with repeat, broken-ref, and external markers', () => {
    expect(renderStylish(graph)).toMatchInlineSnapshot();
  });

  it('marks changed files and appends a summary in affected mode', () => {
    const affected: DependencyGraph = {
      roots: ['openapi.yaml'],
      nodes: [
        { id: 'components/Pet.yaml', resolved: true },
        { id: 'components/User.yaml', resolved: true },
        { id: 'openapi.yaml', root: true, resolved: true },
        { id: 'paths/pets.yaml', resolved: true },
        { id: 'paths/users.yaml', resolved: true },
      ],
      edges: [
        { from: 'components/User.yaml', to: 'components/Pet.yaml', refs: ['Pet.yaml'] },
        { from: 'openapi.yaml', to: 'paths/pets.yaml', refs: ['paths/pets.yaml'] },
        { from: 'openapi.yaml', to: 'paths/users.yaml', refs: ['paths/users.yaml'] },
        { from: 'paths/pets.yaml', to: 'components/Pet.yaml', refs: ['../components/Pet.yaml'] },
        { from: 'paths/users.yaml', to: 'components/User.yaml', refs: ['../components/User.yaml'] },
      ],
    };

    expect(
      renderStylish(affected, { changed: ['components/Pet.yaml'], totalNodeCount: 7 })
    ).toMatchInlineSnapshot();
  });

  it('reports when nothing is affected', () => {
    expect(
      renderStylish({ roots: [], nodes: [], edges: [] }, { changed: [], totalNodeCount: 7 })
    ).toMatchInlineSnapshot(`"No files affected."`);
  });
});

describe('renderJson', () => {
  it('serializes the graph model as-is', () => {
    const parsed = JSON.parse(renderJson(graph));
    expect(parsed.roots).toEqual(['openapi.yaml']);
    expect(parsed.nodes).toHaveLength(7);
    expect(parsed.edges).toHaveLength(7);
  });
});

describe('renderMermaid', () => {
  it('renders a flowchart with stable ids and a root class', () => {
    expect(renderMermaid(graph)).toMatchInlineSnapshot();
  });
});
```

(Empty `toMatchInlineSnapshot()` calls are filled automatically on the first passing run — see Step 3.4.)

- [ ] **Step 3.2: Run the tests to verify they fail**

Run: `npm run unit -- packages/cli/src/commands/graph/__tests__/print.test.ts`
Expected: FAIL — cannot find module `../print/json.js`.

- [ ] **Step 3.3: Implement the three renderers**

`packages/cli/src/commands/graph/print/json.ts`:

```typescript
import type { DependencyGraph } from '../types.js';

/** Serializes the dependency graph as pretty-printed JSON. */
export function renderJson(graph: DependencyGraph): string {
  return JSON.stringify(graph, null, 2);
}
```

`packages/cli/src/commands/graph/print/mermaid.ts`:

```typescript
import type { DependencyGraph } from '../types.js';

/** Renders the dependency graph as a Mermaid flowchart definition. */
export function renderMermaid(graph: DependencyGraph): string {
  const mermaidIds = new Map(graph.nodes.map((node, index) => [node.id, `n${index}`]));
  const escapeLabel = (label: string) => label.replace(/"/g, '#quot;');
  const lines = ['flowchart LR'];

  for (const node of graph.nodes) {
    lines.push(
      `  ${mermaidIds.get(node.id)}["${escapeLabel(node.id)}"]${node.root ? ':::root' : ''}`
    );
  }
  for (const edge of graph.edges) {
    lines.push(`  ${mermaidIds.get(edge.from)} --> ${mermaidIds.get(edge.to)}`);
  }
  if (graph.nodes.some((node) => node.root)) {
    lines.push('  classDef root font-weight:bold');
  }

  return lines.join('\n');
}
```

`packages/cli/src/commands/graph/print/stylish.ts`:

```typescript
import type { DependencyGraph } from '../types.js';

export type StylishOptions = {
  /** Node ids queried via --affected-by that exist in the graph. */
  changed?: string[];
  /** Node count of the unfiltered graph; enables the affected summary line. */
  totalNodeCount?: number;
};

/**
 * Renders one ASCII tree per root. A node already expanded in the current tree
 * is printed with `↺` and not expanded again (handles cycles and fan-in).
 */
export function renderStylish(graph: DependencyGraph, options: StylishOptions = {}): string {
  if (graph.nodes.length === 0) {
    return 'No files affected.';
  }

  const childrenByNode = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const children = childrenByNode.get(edge.from) ?? [];
    children.push(edge.to);
    childrenByNode.set(edge.from, children);
  }
  for (const children of childrenByNode.values()) {
    children.sort();
  }

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const changed = new Set(options.changed ?? []);
  const lines: string[] = [];

  const label = (id: string, isRepeat: boolean): string => {
    const node = nodesById.get(id);
    let text = id;
    if (node?.external) text += ' (external)';
    if (node && !node.resolved) text += ' ✗ not found';
    if (isRepeat) text += ' ↺';
    if (changed.has(id)) text += ' ← changed';
    return text;
  };

  const renderSubtree = (id: string, prefix: string, printed: Set<string>) => {
    const children = childrenByNode.get(id) ?? [];
    children.forEach((child, index) => {
      const isLast = index === children.length - 1;
      const isRepeat = printed.has(child);
      lines.push(`${prefix}${isLast ? '└── ' : '├── '}${label(child, isRepeat)}`);
      if (!isRepeat) {
        printed.add(child);
        renderSubtree(child, `${prefix}${isLast ? '    ' : '│   '}`, printed);
      }
    });
  };

  graph.roots.forEach((root, index) => {
    if (index > 0) lines.push('');
    lines.push(label(root, false));
    renderSubtree(root, '', new Set([root]));
  });

  if (options.totalNodeCount !== undefined) {
    lines.push('');
    lines.push(
      `${graph.nodes.length} of ${options.totalNodeCount} files affected · affected roots: ${
        graph.roots.join(', ') || 'none'
      }`
    );
  }

  return lines.join('\n');
}
```

- [ ] **Step 3.4: Run the tests, let vitest fill the inline snapshots, then review them**

Run: `npm run unit -- packages/cli/src/commands/graph/__tests__/print.test.ts -u`
Expected: 5 passed; empty `toMatchInlineSnapshot()` calls now contain the rendered output.

Manually verify the filled snapshots look exactly like this (tree shape, markers, summary):

```
openapi.yaml
├── paths/pets.yaml
│   └── components/Pet.yaml
└── paths/users.yaml
    └── components/User.yaml
        ├── components/Pet.yaml ↺
        ├── components/missing.yaml ✗ not found
        └── https://example.com/shared.yaml (external)
```

and for affected mode (`components/Pet.yaml` queried):

```
openapi.yaml
├── paths/pets.yaml
│   └── components/Pet.yaml ← changed
└── paths/users.yaml
    └── components/User.yaml
        └── components/Pet.yaml ↺ ← changed

5 of 7 files affected · affected roots: openapi.yaml
```

and mermaid (node order follows graph.nodes order):

```
flowchart LR
  n0["components/Pet.yaml"]
  n1["components/User.yaml"]
  n2["components/missing.yaml"]
  n3["https://example.com/shared.yaml"]
  n4["openapi.yaml"]:::root
  n5["paths/pets.yaml"]
  n6["paths/users.yaml"]
  n1 --> n0
  n1 --> n2
  n1 --> n3
  n4 --> n5
  n4 --> n6
  n5 --> n0
  n6 --> n1
  classDef root font-weight:bold
```

If the output differs from the spec's intent (wrong markers, missing summary), fix the renderer, not the snapshot.

- [ ] **Step 3.5: Run all graph unit tests together**

Run: `npm run unit -- packages/cli/src/commands/graph`
Expected: build-graph (6) + filter-affected (3) + print (5) all pass.

Also run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3.6: Commit**

```bash
git add packages/cli/src/commands/graph
git commit -m "feat: add graph command output renderers"
```

---

### Task 4: Handler + CLI registration

**Files:**

- Create: `packages/cli/src/commands/graph/index.ts`
- Modify: `packages/cli/src/types.ts` (CommandArgv union, imports at top)
- Modify: `packages/cli/src/index.ts` (import + `.command()` block)

- [ ] **Step 4.1: Implement the handler**

`packages/cli/src/commands/graph/index.ts`:

```typescript
import {
  BaseResolver,
  detectSpec,
  getTypes,
  logger,
  normalizeTypes,
  resolveDocument,
  type Document,
  type ResolvedRefMap,
} from '@redocly/openapi-core';
import * as path from 'node:path';

import type { VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { buildGraph } from './build-graph.js';
import { filterAffected } from './filter-affected.js';
import { renderJson } from './print/json.js';
import { renderMermaid } from './print/mermaid.js';
import { renderStylish, type StylishOptions } from './print/stylish.js';
import type { GraphFormat } from './types.js';

export type GraphArgv = {
  apis?: string[];
  format: GraphFormat;
  'affected-by'?: string[];
} & VerifyConfigOptions;

/** Resolves the given API descriptions and prints their file-level $ref dependency graph. */
export async function handleGraph({ argv, config, collectSpecData }: CommandArgs<GraphArgv>) {
  const apis = await getFallbackApisOrExit(argv.apis, config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const cwd = process.cwd();

  const resolutions: Array<{ rootDocument: Document; refMap: ResolvedRefMap }> = [];
  for (const { path: apiPath } of apis) {
    const rootDocument = await externalRefResolver.resolveDocument(null, apiPath, true);
    if (rootDocument instanceof Error) {
      return exitWithError(`Failed to load ${apiPath}: ${rootDocument.message}`);
    }
    collectSpecData?.(rootDocument.parsed);
    const specVersion = detectSpec(rootDocument.parsed);
    const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
    const refMap = await resolveDocument({
      rootDocument: rootDocument as Document,
      rootType: types.Root,
      externalRefResolver,
    });
    resolutions.push({ rootDocument: rootDocument as Document, refMap });
  }

  const graph = buildGraph(resolutions, {
    cwd,
    resolveRef: (base, uri) => externalRefResolver.resolveExternalRef(base, uri),
  });

  let printedGraph = graph;
  let stylishOptions: StylishOptions = {};
  if (argv['affected-by']) {
    const changedIds = argv['affected-by'].map((file) =>
      path.relative(cwd, path.resolve(cwd, file))
    );
    const knownIds = new Set(graph.nodes.map((node) => node.id));
    for (const id of changedIds) {
      if (!knownIds.has(id)) {
        logger.warn(`${id} is not referenced by any of the processed APIs.\n`);
      }
    }
    const knownChanged = changedIds.filter((id) => knownIds.has(id));
    printedGraph = filterAffected(graph, knownChanged);
    stylishOptions = { changed: knownChanged, totalNodeCount: graph.nodes.length };
  }

  switch (argv.format) {
    case 'json':
      logger.output(renderJson(printedGraph) + '\n');
      break;
    case 'mermaid':
      logger.output(renderMermaid(printedGraph) + '\n');
      break;
    default:
      logger.output(renderStylish(printedGraph, stylishOptions) + '\n');
  }
}
```

- [ ] **Step 4.2: Add `GraphArgv` to the `CommandArgv` union**

In `packages/cli/src/types.ts`, add the import after the `GenerateArazzoCommandArgv` import (line 7):

```typescript
import type { GraphArgv } from './commands/graph/index.js';
```

and extend the union (after `| StatsArgv`):

```typescript
export type CommandArgv = StatsArgv | GraphArgv | SplitArgv;
```

(rest of the union unchanged).

- [ ] **Step 4.3: Register the command in yargs**

In `packages/cli/src/index.ts`:

Add the import after `import { handleGenerateArazzo, ... } from './commands/generate-arazzo.js';`:

```typescript
import { handleGraph } from './commands/graph/index.js';
import type { GraphFormat } from './commands/graph/types.js';
```

Insert this `.command()` block immediately after the existing `stats` command block (after its closing `)` around line 76):

```typescript
  .command(
    'graph [apis...]',
    'Show the $ref dependency graph of API description files.',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_GRAPH')
        .positional('apis', { array: true, type: 'string' })
        .option({
          config: { description: 'Path to the config file.', type: 'string' },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
          format: {
            description: 'Use a specific output format.',
            choices: ['stylish', 'json', 'mermaid'] as ReadonlyArray<GraphFormat>,
            default: 'stylish' as GraphFormat,
          },
          'affected-by': {
            description:
              'Show only the part of the graph affected by changes to the given files.',
            array: true,
            type: 'string',
            requiresArg: true,
          },
        }),
    (argv) => {
      commandWrapper(handleGraph)(argv);
    }
  )
```

- [ ] **Step 4.4: Typecheck and compile**

Run: `npm run typecheck && npm run compile`
Expected: both exit 0. If `rootDocument instanceof Error` narrowing complains (`ResolveError`/`YamlParseError` are `Error` subclasses), keep the `as Document` casts as written above — they mirror `lint.ts`.

- [ ] **Step 4.5: Smoke-run the wired command**

(Single-file spec: the graph is just the root node — this only verifies registration, resolution, and clean output. Multi-file behavior is covered by Task 1 unit tests and Task 5 e2e.)

Run: `npm run cli -- graph tests/e2e/join/multiple-tags-in-same-files/foo.yaml 2>/dev/null`
Expected: stdout is exactly one tree line `tests/e2e/join/multiple-tags-in-same-files/foo.yaml` (no stack trace).

Run: `npm run cli -- graph tests/e2e/join/multiple-tags-in-same-files/foo.yaml --format=json 2>/dev/null`
Expected: valid JSON with `roots`, `nodes`, `edges` keys and nothing else on stdout.

- [ ] **Step 4.6: Run the full unit suite**

Run: `npm run unit`
Expected: all suites pass (graph tests included, nothing else broken).

- [ ] **Step 4.7: Commit**

```bash
git add packages/cli/src/commands/graph packages/cli/src/types.ts packages/cli/src/index.ts
git commit -m "feat: register graph command in CLI"
```

---

### Task 5: E2E tests with a multi-file fixture

**Files:**

- Create: `tests/e2e/graph/graph.test.ts`
- Create: `tests/e2e/graph/graph-multi-file/openapi.yaml`
- Create: `tests/e2e/graph/graph-multi-file/paths/pets.yaml`
- Create: `tests/e2e/graph/graph-multi-file/paths/users.yaml`
- Create: `tests/e2e/graph/graph-multi-file/components/schemas/Pet.yaml`
- Create: `tests/e2e/graph/graph-multi-file/components/schemas/User.yaml`
- Create: `tests/e2e/graph/graph-multi-file/components/schemas/Address.yaml`
- Generated: `snapshot.txt` in `graph-stylish/`, `graph-json/`, `graph-affected-by/` (see Step 5.3 — the three test dirs share one fixture via relative path)

Fixture exercises: nesting (root → paths → schemas), fan-in (`Pet.yaml` referenced from `pets.yaml` and `User.yaml` → `↺` marker), affected-branch pruning (`Address.yaml` only affects the users branch).

- [ ] **Step 5.1: Create the fixture files**

`tests/e2e/graph/graph-multi-file/openapi.yaml`:

```yaml
openapi: 3.0.0
info:
  title: Graph fixture
  version: 1.0.0
paths:
  /pets:
    $ref: paths/pets.yaml
  /users:
    $ref: paths/users.yaml
```

`tests/e2e/graph/graph-multi-file/paths/pets.yaml`:

```yaml
get:
  summary: List pets
  responses:
    '200':
      description: OK
      content:
        application/json:
          schema:
            $ref: ../components/schemas/Pet.yaml
```

`tests/e2e/graph/graph-multi-file/paths/users.yaml`:

```yaml
get:
  summary: List users
  responses:
    '200':
      description: OK
      content:
        application/json:
          schema:
            $ref: ../components/schemas/User.yaml
```

`tests/e2e/graph/graph-multi-file/components/schemas/Pet.yaml`:

```yaml
type: object
properties:
  name:
    type: string
```

`tests/e2e/graph/graph-multi-file/components/schemas/User.yaml`:

```yaml
type: object
properties:
  address:
    $ref: Address.yaml
  pet:
    $ref: Pet.yaml
```

`tests/e2e/graph/graph-multi-file/components/schemas/Address.yaml`:

```yaml
type: object
properties:
  city:
    type: string
```

- [ ] **Step 5.2: Write the e2e test**

`tests/e2e/graph/graph.test.ts` (imports mirror `tests/e2e/stats/stats.test.ts` exactly — ESM, so `__dirname` is derived via `fileURLToPath`; `describe/test/expect` are vitest globals, no import):

```typescript
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('graph', () => {
  const folderPath = __dirname;
  const fixturePath = join(folderPath, 'graph-multi-file');

  test('graph should print a stylish tree', async () => {
    const args = getParams(indexEntryPoint, ['graph', 'openapi.yaml']);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'graph-stylish', 'snapshot.txt')
    );
  });

  test('graph should print pure JSON', async () => {
    const args = getParams(indexEntryPoint, ['graph', 'openapi.yaml', '--format=json']);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'graph-json', 'snapshot.txt')
    );
  });

  test('graph should print only the affected subgraph', async () => {
    const args = getParams(indexEntryPoint, [
      'graph',
      'openapi.yaml',
      '--affected-by',
      'components/schemas/Address.yaml',
    ]);
    const result = getCommandOutput(args, { testPath: fixturePath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(
      join(folderPath, 'graph-affected-by', 'snapshot.txt')
    );
  });
});
```

- [ ] **Step 5.3: Compile and generate snapshots**

Run: `npm run compile && npm run e2e -- tests/e2e/graph/graph.test.ts -u`
Expected: 3 passed, three `snapshot.txt` files created.

- [ ] **Step 5.4: Review the generated snapshots against the spec**

`graph-stylish/snapshot.txt` must contain exactly this tree (children sorted; `Pet.yaml` expanded once, repeated with `↺`):

```
openapi.yaml
├── paths/pets.yaml
│   └── components/schemas/Pet.yaml
└── paths/users.yaml
    └── components/schemas/User.yaml
        ├── components/schemas/Address.yaml
        └── components/schemas/Pet.yaml ↺
```

`graph-json/snapshot.txt` must be valid JSON only (6 nodes, 6 edges, `"roots": ["openapi.yaml"]`, edge objects carry `refs` arrays).

`graph-affected-by/snapshot.txt` must show only the users branch plus the summary:

```
openapi.yaml
└── paths/users.yaml
    └── components/schemas/User.yaml
        └── components/schemas/Address.yaml ← changed

4 of 6 files affected · affected roots: openapi.yaml
```

If a snapshot deviates (e.g. unsorted children, missing marker), fix the source, re-run with `-u`, and re-review.

- [ ] **Step 5.5: Run the whole e2e suite**

Run: `npm run e2e`
Expected: all pass (no other suites affected).

- [ ] **Step 5.6: Commit**

```bash
git add tests/e2e/graph
git commit -m "test: add graph command e2e tests"
```

---

### Task 6: Docs, sidebar, commands index, changeset

**Files:**

- Create: `docs/@v2/commands/graph.md`
- Modify: `docs/@v2/v2.sidebars.yaml` (Commands group, alphabetical: between `generate-arazzo` and `join`)
- Modify: `docs/@v2/commands/index.md` (API management commands list, between `bundle` and `join`)
- Create: `.changeset/graph-command.md`

- [ ] **Step 6.1: Write the command docs page**

`docs/@v2/commands/graph.md` (structure mirrors `stats.md`: title, Introduction, Usage, Options table, Examples):

````markdown
# `graph`

## Introduction

The `graph` command prints the file-level dependency graph of an API description: which files reference which other files through `$ref`. It works with multi-file OpenAPI, AsyncAPI, and Arazzo descriptions.

Use it to:

- get a quick `tree`-style overview of a multi-file API description;
- find out which files are affected by a change to a shared file (`--affected-by`) — for example, in CI or automated code review;
- feed exact file relationships to tooling as JSON or render them as a Mermaid diagram.

## Usage

```bash
redocly graph
redocly graph <apis...>
redocly graph <apis...> [--format=<value>] [--affected-by=<file>] [--config=<path>]
```
````

If you don't pass any API to the command, it processes all APIs defined in your Redocly configuration file and prints one merged graph.

## Options

| Option        | Type     | Description                                                                                                                                                                                                              |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| apis          | [string] | Paths to API description files. Defaults to all APIs from the Redocly configuration file.                                                                                                                                |
| --affected-by | [string] | Show only the part of the graph affected by changes to the given files: the files themselves plus everything that references them. Repeat the option to pass several files: `--affected-by a.yaml --affected-by b.yaml`. |
| --config      | string   | Specify the path to the [Redocly configuration file](../configuration/index.md).                                                                                                                                         |
| --format      | string   | Output format: `stylish` (default, tree view), `json`, or `mermaid`.                                                                                                                                                     |
| --help        | boolean  | Show help.                                                                                                                                                                                                               |
| --lint-config | string   | Specify the severity level for the configuration file. <br/> **Possible values:** `warn`, `error`, `off`. Default value is `warn`.                                                                                       |
| --version     | boolean  | Show version number.                                                                                                                                                                                                     |

## Examples

### Print the dependency tree

```bash
redocly graph openapi.yaml
```

```
openapi.yaml
├── paths/pets.yaml
│   └── components/schemas/Pet.yaml
└── paths/users.yaml
    └── components/schemas/User.yaml
        ├── components/schemas/Address.yaml
        └── components/schemas/Pet.yaml ↺
```

The `↺` marker means the file was already expanded earlier in the tree, so its references are not repeated. Files that cannot be resolved are marked with `✗ not found`, and references to URLs are marked with `(external)`.

### Find files affected by a change

Pass one or more changed files to `--affected-by` to see only the impacted part of the graph — useful in CI and automated review to decide what needs attention without reading every file:

```bash
redocly graph openapi.yaml --affected-by components/schemas/Address.yaml
```

```
openapi.yaml
└── paths/users.yaml
    └── components/schemas/User.yaml
        └── components/schemas/Address.yaml ← changed

4 of 6 files affected · affected roots: openapi.yaml
```

If a file in `--affected-by` is not referenced by any processed API, the command prints a warning to stderr and exits with code `0` — "nothing depends on this file" is a valid answer.

### Machine-readable output

```bash
redocly graph openapi.yaml --format=json
```

Prints the graph as JSON with `roots`, `nodes` (including `resolved` and `external` flags), and `edges` (including the exact `$ref` strings). Only the JSON is written to stdout, so the output is safe to pipe.

```bash
redocly graph openapi.yaml --format=mermaid
```

Prints a [Mermaid](https://mermaid.js.org/) `flowchart` definition. GitHub renders Mermaid code blocks in Markdown automatically, so you can paste the output into a pull request comment or documentation page to get a diagram.

````

- [ ] **Step 6.2: Add the sidebar entry**

In `docs/@v2/v2.sidebars.yaml`, inside the `Commands` group items, insert between `generate-arazzo` and `join`:

```yaml
    - label: graph
      page: commands/graph.md
````

- [ ] **Step 6.3: Add the commands index entry**

In `docs/@v2/commands/index.md`, in the `API management commands:` list, insert between the `bundle` and `join` lines:

```markdown
- [`graph`](graph.md) Show the `$ref` dependency graph of API description files.
```

- [ ] **Step 6.4: Create the changeset**

`.changeset/graph-command.md`:

```markdown
---
'@redocly/cli': minor
---

Added the `graph` command that prints the file-level `$ref` dependency graph of API descriptions as a tree (`stylish`), `json`, or `mermaid` output. The `--affected-by` option filters the graph to the files impacted by changes to the given files.
```

- [ ] **Step 6.5: Full verification**

Run: `npm test`
Expected: compile, typecheck, unit, and e2e all pass.

- [ ] **Step 6.6: Commit**

```bash
git add docs/@v2/commands/graph.md docs/@v2/v2.sidebars.yaml docs/@v2/commands/index.md .changeset/graph-command.md
git commit -m "docs: document graph command and add changeset"
```

---

## Rollback

Every task is an isolated commit on `feat/graph-command`; revert any of them with `git revert <sha>`. The feature adds one new command and touches shared files only additively (`types.ts` union member, `index.ts` command block, docs lists), so reverting the branch removes the feature completely.

## Out of Scope (per spec)

- Core package changes, DOT/Graphviz output, component-level nodes, validation behavior (broken refs stay non-fatal).
