# `redocly diff` Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `redocly diff <base> <revision>` command that compares two API descriptions and reports added/removed/changed parts, with breaking-change classification for OpenAPI 3.x and stylish/json/markdown/html output.

**Architecture:** Each side is bundled and collected (via the existing `walkDocument` + type trees) into a flat `Map<stablePointer, NodeEntry>`; the two maps are compared with a dumb two-pass union iteration into flat `Change[]`; a classifier (polarity engine + lint-style rule registry, worst-verdict-wins) assigns `breaking | warning | non-breaking`. **The entire engine lives inside the CLI package (`packages/cli/src/commands/diff/engine/`) and consumes ONLY the public `@redocly/openapi-core` API — nothing is added or changed in `packages/core`. The command is experimental.** Spec: `docs/superpowers/specs/2026-07-07-diff-command-design.md`.

**Tech Stack:** TypeScript ESM, vitest, existing `@redocly/openapi-core` machinery (`bundle`, `walkDocument`, `normalizeTypes`, `detectSpec`), `colorette`, `@redocly/ajv` (tests only).

## Global Constraints

- **Node version:** the default shell node is v16 which cannot run the repo tooling. Before ANY `npm`, `npx`, or `git commit` command run: `export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"` (repo requires node >=20.19; pre-commit hooks fail on v16).
- **ESM:** every relative import inside `packages/` ends with `.js` (e.g. `import { compareMaps } from './compare.js'`).
- **Run a single unit test file:** `VITEST_SUITE=unit npx vitest run <path> --coverage.enabled=false` (coverage thresholds are global; disable for single-file runs).
- **Commits:** conventional commits (`feat:`, `test:`, `docs:`). Pre-commit runs oxlint + oxfmt via lint-staged automatically.
- **No new runtime dependencies.** `colorette` and `@redocly/ajv` are already dependencies.
- **Do NOT touch `packages/core`.** The engine imports everything from `@redocly/openapi-core`'s existing public API (`walkDocument`, `normalizeVisitors`, `normalizeTypes`, `detectSpec`, `getMajorSpecVersion`, `getTypes`, `isRef`, `isPlainObject`, `makeDocumentFromString`, `createConfig`, `bundle`, `logger`, and their types). If something seems missing from that API, find a public equivalent — do not add core exports. Reading core sources for debugging is fine; modifying them is not.
- **The command is experimental:** the yargs description carries the `[experimental]` suffix (same convention as `join` in `packages/cli/src/index.ts`), and the docs page states it.
- **Working directory:** repo root (the worktree root). All paths below are relative to it.

---

### Task 1: Core diff types and verdict helpers

**Files:**

- Create: `packages/cli/src/commands/diff/engine/types.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/types.test.ts`

**Interfaces:**

- Consumes: `SpecVersion` type from `@redocly/openapi-core`.
- Produces (used by every later task): `Compat`, `ChangeKind`, `NodeEntry`, `ChangeSide`, `Change`, `RawChange`, `DiffSummary`, `DiffResult`, `Verdict`, `Polarity`, `RuleContext`, `DiffRule`, `DiffRuleRegistry`, `compatRank(c: Compat): number`, `worstOf(a: Compat, b: Compat): Compat`, `breaking(message: string): Verdict`, `warning(message: string): Verdict`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/types.test.ts
import { worstOf, compatRank, breaking, warning } from '../types.js';

describe('diff types helpers', () => {
  it('ranks compat levels', () => {
    expect(compatRank('breaking')).toBeGreaterThan(compatRank('warning'));
    expect(compatRank('warning')).toBeGreaterThan(compatRank('non-breaking'));
  });

  it('picks the worst compat', () => {
    expect(worstOf('non-breaking', 'breaking')).toBe('breaking');
    expect(worstOf('warning', 'non-breaking')).toBe('warning');
    expect(worstOf('warning', 'warning')).toBe('warning');
  });

  it('builds verdicts', () => {
    expect(breaking('boom')).toEqual({ compat: 'breaking', message: 'boom' });
    expect(warning('hmm')).toEqual({ compat: 'warning', message: 'hmm' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/types.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../types.js`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/engine/types.ts
import type { SpecVersion } from '@redocly/openapi-core';

export type Compat = 'breaking' | 'warning' | 'non-breaking';

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface NodeEntry {
  pointer: string; // stable matching key, e.g. '#/paths/~1pets/get/parameters/{query:limit}'
  realPointer: string; // actual JSON Pointer in THIS document, e.g. '#/paths/~1pets/get/parameters/1'
  parentPointer: string | null; // stable pointer of the parent node
  typeName: string; // from this side's type tree
  scalars: Record<string, unknown>; // shallow primitives and arrays of primitives (enum, required, ...)
  refs: Record<string, string>; // $ref-valued properties, recorded as attributes (not followed)
  raw: unknown; // the raw node value — payload for added/removed changes
}

export interface ChangeSide {
  pointer: string; // real JSON Pointer in this document
  value?: unknown;
}

export interface Change {
  pointer: string; // stable node pointer — the change's identity
  property?: string; // set for property-level changes
  kind: ChangeKind;
  typeName: string;
  base?: ChangeSide; // absent for added
  revision?: ChangeSide; // absent for removed
  compat: Compat;
  ruleIds?: string[]; // all rules that produced a verdict (worst wins)
  message?: string; // message of the most severe verdict
}

// What compare() emits — classification fields are filled later by classify().
export type RawChange = Omit<Change, 'compat' | 'ruleIds' | 'message'>;

export interface DiffSummary {
  breaking: number;
  warning: number;
  nonBreaking: number;
}

export interface DiffResult {
  version: '1';
  specVersions: { base: SpecVersion; revision: SpecVersion };
  summary: DiffSummary;
  changes: Change[];
}

export interface Verdict {
  compat: Compat;
  message: string;
}

export type Polarity = 'request' | 'response' | 'both' | 'neutral';

export interface RuleContext {
  polarity: Polarity;
  specVersion: SpecVersion;
  base: (pointer: string) => NodeEntry | undefined;
  revision: (pointer: string) => NodeEntry | undefined;
}

export interface DiffRule {
  id: string;
  description: string;
  visit(change: RawChange, ctx: RuleContext): Verdict | undefined;
}

export type DiffRuleRegistry = Record<string, DiffRule[]>;

const COMPAT_RANK: Record<Compat, number> = { breaking: 2, warning: 1, 'non-breaking': 0 };

export function compatRank(compat: Compat): number {
  return COMPAT_RANK[compat];
}

export function worstOf(a: Compat, b: Compat): Compat {
  return compatRank(a) >= compatRank(b) ? a : b;
}

export function breaking(message: string): Verdict {
  return { compat: 'breaking', message };
}

export function warning(message: string): Verdict {
  return { compat: 'warning', message };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/types.test.ts --coverage.enabled=false`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff/engine/types.ts packages/cli/src/commands/diff/engine/__tests__/types.test.ts
git commit -m "feat(cli): add diff data model and verdict helpers"
```

---

### Task 2: Predicates library

**Files:**

- Create: `packages/cli/src/commands/diff/engine/predicates.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/predicates.test.ts`

**Interfaces:**

- Produces: `isScalar(v): boolean`, `isScalarArray(v): boolean`, `scalarEquals(a, b): boolean`, `missingItems(before, after): unknown[]`, `addedItems(before, after): unknown[]`, `becameTrue(before, after): boolean`, `isTypeNarrowed(before, after): boolean`, `isTypeWidened(before, after): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/predicates.test.ts
import {
  isScalar,
  isScalarArray,
  scalarEquals,
  missingItems,
  addedItems,
  becameTrue,
  isTypeNarrowed,
  isTypeWidened,
} from '../predicates.js';

describe('diff predicates', () => {
  it('detects scalars and scalar arrays', () => {
    expect(isScalar('a')).toBe(true);
    expect(isScalar(1)).toBe(true);
    expect(isScalar(null)).toBe(true);
    expect(isScalar({})).toBe(false);
    expect(isScalarArray(['a', 1, true])).toBe(true);
    expect(isScalarArray([{ a: 1 }])).toBe(false);
    expect(isScalarArray('a')).toBe(false);
  });

  it('compares scalars and scalar arrays', () => {
    expect(scalarEquals('a', 'a')).toBe(true);
    expect(scalarEquals(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(scalarEquals(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(scalarEquals(undefined, undefined)).toBe(true);
    expect(scalarEquals(1, '1')).toBe(false);
  });

  it('computes missing and added items', () => {
    expect(missingItems(['a', 'b', 'c'], ['a', 'b'])).toEqual(['c']);
    expect(missingItems(['a'], ['a', 'b'])).toEqual([]);
    expect(missingItems(undefined, ['a'])).toEqual([]);
    expect(addedItems(['a'], ['a', 'b'])).toEqual(['b']);
    expect(addedItems(['a'], undefined)).toEqual([]);
  });

  it('detects becameTrue', () => {
    expect(becameTrue(undefined, true)).toBe(true);
    expect(becameTrue(false, true)).toBe(true);
    expect(becameTrue(true, true)).toBe(false);
    expect(becameTrue(true, false)).toBe(false);
  });

  it('classifies type narrowing and widening', () => {
    // integer → number widens the accepted set
    expect(isTypeNarrowed('integer', 'number')).toBe(false);
    expect(isTypeWidened('integer', 'number')).toBe(true);
    // number → integer narrows it
    expect(isTypeNarrowed('number', 'integer')).toBe(true);
    expect(isTypeWidened('number', 'integer')).toBe(false);
    // string → number is incompatible both ways
    expect(isTypeNarrowed('string', 'number')).toBe(true);
    expect(isTypeWidened('string', 'number')).toBe(true);
    // same type — neither
    expect(isTypeNarrowed('string', 'string')).toBe(false);
    expect(isTypeWidened('string', 'string')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/predicates.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../predicates.js`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/engine/predicates.ts

export function isScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

export function isScalarArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isScalar);
}

export function scalarEquals(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => scalarEquals(item, b[i]));
  }
  return a === b;
}

export function missingItems(before: unknown, after: unknown): unknown[] {
  if (!Array.isArray(before)) return [];
  const afterItems = Array.isArray(after) ? after : [];
  return before.filter((item) => !afterItems.includes(item));
}

export function addedItems(before: unknown, after: unknown): unknown[] {
  return missingItems(after, before);
}

export function becameTrue(before: unknown, after: unknown): boolean {
  return before !== true && after === true;
}

// integer → number is the only widening pair among JSON Schema primitive types.
const WIDENING_PAIRS: Record<string, string[]> = { integer: ['number'] };

export function isTypeNarrowed(before: unknown, after: unknown): boolean {
  if (before === after) return false;
  if (typeof before !== 'string' || typeof after !== 'string') return true; // conservative
  return !(WIDENING_PAIRS[before] ?? []).includes(after);
}

export function isTypeWidened(before: unknown, after: unknown): boolean {
  if (before === after) return false;
  if (typeof before !== 'string' || typeof after !== 'string') return true; // conservative
  return !(WIDENING_PAIRS[after] ?? []).includes(before);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/predicates.test.ts --coverage.enabled=false`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff/engine/predicates.ts packages/cli/src/commands/diff/engine/__tests__/predicates.test.ts
git commit -m "feat(cli): add diff predicate helpers"
```

---

### Task 3: Identity registry

**Files:**

- Create: `packages/cli/src/commands/diff/engine/node-identity.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/node-identity.test.ts`

**Interfaces:**

- Consumes: `isPlainObject` from `@redocly/openapi-core`.
- Produces: `getIdentityKey(typeName: string, value: unknown): string | undefined` — returns a stable list-item segment like `{query:limit}`, or `undefined` for positional fallback. Pointer-special characters inside keys are escaped (`~` → `~0`, `/` → `~1`).

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/node-identity.test.ts
import { getIdentityKey } from '../node-identity.js';

describe('getIdentityKey', () => {
  it('keys Parameter by in+name', () => {
    expect(getIdentityKey('Parameter', { in: 'query', name: 'limit' })).toBe('{query:limit}');
  });

  it('keys Server by url with pointer escaping', () => {
    expect(getIdentityKey('Server', { url: 'https://api.example.com/v1' })).toBe(
      '{https:~1~1api.example.com~1v1}'
    );
  });

  it('keys Tag by name', () => {
    expect(getIdentityKey('Tag', { name: 'pets' })).toBe('{pets}');
  });

  it('keys SecurityRequirement by sorted scheme names', () => {
    expect(getIdentityKey('SecurityRequirement', { oauth: [], apiKey: [] })).toBe('{apiKey+oauth}');
  });

  it('returns undefined for unknown types and malformed values (positional fallback)', () => {
    expect(getIdentityKey('Schema', { type: 'string' })).toBeUndefined();
    expect(getIdentityKey('Parameter', { name: 'limit' })).toBeUndefined(); // no `in`
    expect(getIdentityKey('Parameter', 'not-an-object')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/node-identity.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../node-identity.js`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/engine/node-identity.ts
import { isPlainObject } from '@redocly/openapi-core';

// JSON Pointer escaping for identity-key content: keys become pointer segments.
function esc(value: string): string {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}

type IdentityKeyFn = (value: Record<string, unknown>) => string | undefined;

// Identity keys for list items that have a natural identity.
// Everything else falls back to positional matching (see spec §5.2).
const IDENTITY_KEYS: Record<string, IdentityKeyFn> = {
  Parameter: (v) =>
    typeof v.in === 'string' && typeof v.name === 'string'
      ? `{${esc(v.in)}:${esc(v.name)}}`
      : undefined,
  Server: (v) => (typeof v.url === 'string' ? `{${esc(v.url)}}` : undefined),
  Tag: (v) => (typeof v.name === 'string' ? `{${esc(v.name)}}` : undefined),
  SecurityRequirement: (v) => `{${Object.keys(v).sort().map(esc).join('+')}}`,
};

export function getIdentityKey(typeName: string, value: unknown): string | undefined {
  const keyFn = IDENTITY_KEYS[typeName];
  if (!keyFn || !isPlainObject(value)) return undefined;
  return keyFn(value as Record<string, unknown>);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/node-identity.test.ts --coverage.enabled=false`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff/engine/node-identity.ts packages/cli/src/commands/diff/engine/__tests__/node-identity.test.ts
git commit -m "feat(cli): add diff list-item identity registry"
```

---

### Task 4: Collection — document → flat map

**Files:**

- Create: `packages/cli/src/commands/diff/engine/collect.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/collect.test.ts`

**Interfaces:**

- Consumes: `walkDocument`, `normalizeVisitors`, `isRef`, `isPlainObject` and types `WalkContext`, `UserContext`, `Document`, `NormalizedNodeType`, `Config`, `SpecVersion` — all from `@redocly/openapi-core`; `getIdentityKey` (Task 3); `isScalar`, `isScalarArray` (Task 2); `NodeEntry` (Task 1).
- Produces: `collectDocumentMap(opts: { document: Document; types: Record<string, NormalizedNodeType>; specVersion: SpecVersion; config: Config }): CollectedDocument` where `CollectedDocument = { entries: Map<string, NodeEntry>; usageEdges: Array<{ site: string; target: string }> }`.

**Key behaviors under test:** identity keys replace array indexes in stable pointers; real pointers preserved; `$ref` recorded as attribute and NOT followed (empty `resolvedRefMap`); components collected at canonical paths; scalar arrays (`enum`, `required`) snapshotted; identity collision gets `#2` suffix; `parentPointer` derived from the pointer string.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/collect.test.ts
import {
  createConfig,
  detectSpec,
  getTypes,
  makeDocumentFromString,
  normalizeTypes,
} from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { collectDocumentMap } from '../collect.js';

async function collect(yaml: string) {
  const document = makeDocumentFromString(yaml, '');
  const config = await createConfig({});
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config);
  return collectDocumentMap({ document, types, specVersion, config });
}

describe('collectDocumentMap', () => {
  it('collects nodes with identity-keyed stable pointers and real pointers', async () => {
    const { entries } = await collect(outdent`
      openapi: 3.1.0
      info: { title: Test, version: '1.0' }
      paths:
        /pets:
          get:
            parameters:
              - name: filter
                in: query
                schema: { type: string }
              - name: limit
                in: query
                required: true
                schema: { type: integer }
            responses:
              '200': { description: OK }
    `);

    const limit = entries.get('#/paths/~1pets/get/parameters/{query:limit}');
    expect(limit).toBeDefined();
    expect(limit!.typeName).toBe('Parameter');
    expect(limit!.realPointer).toBe('#/paths/~1pets/get/parameters/1');
    expect(limit!.parentPointer).toBe('#/paths/~1pets/get/parameters');
    expect(limit!.scalars).toMatchObject({ name: 'limit', in: 'query', required: true });

    // nested schema is its own entry under the stable parent
    const schema = entries.get('#/paths/~1pets/get/parameters/{query:limit}/schema');
    expect(schema).toBeDefined();
    expect(schema!.typeName).toBe('Schema');
    expect(schema!.scalars).toMatchObject({ type: 'integer' });
  });

  it('records $ref values as attributes and does not follow them', async () => {
    const { entries, usageEdges } = await collect(outdent`
      openapi: 3.1.0
      info: { title: Test, version: '1.0' }
      paths:
        /pets:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Pet'
      components:
        schemas:
          Pet:
            type: object
            properties:
              name: { type: string }
    `);

    const mediaType = entries.get('#/paths/~1pets/get/responses/200/content/application~1json');
    expect(mediaType).toBeDefined();
    expect(mediaType!.refs).toEqual({ schema: '#/components/schemas/Pet' });

    // the component is collected once, at its canonical path
    const pet = entries.get('#/components/schemas/Pet');
    expect(pet).toBeDefined();
    expect(pet!.typeName).toBe('Schema');
    expect(entries.get('#/components/schemas/Pet/properties/name')).toBeDefined();

    // usage edge recorded
    expect(usageEdges).toContainEqual({
      site: '#/paths/~1pets/get/responses/200/content/application~1json/schema',
      target: '#/components/schemas/Pet',
    });
  });

  it('snapshots scalar arrays like enum and required', async () => {
    const { entries } = await collect(outdent`
      openapi: 3.1.0
      info: { title: Test, version: '1.0' }
      paths: {}
      components:
        schemas:
          Size:
            type: string
            enum: [s, m, l]
          Pet:
            type: object
            required: [name]
            properties:
              name: { type: string }
    `);

    expect(entries.get('#/components/schemas/Size')!.scalars.enum).toEqual(['s', 'm', 'l']);
    expect(entries.get('#/components/schemas/Pet')!.scalars.required).toEqual(['name']);
  });

  it('suffixes colliding identity keys deterministically', async () => {
    const { entries } = await collect(outdent`
      openapi: 3.1.0
      info: { title: Test, version: '1.0' }
      paths:
        /pets:
          get:
            parameters:
              - name: dup
                in: query
              - name: dup
                in: query
            responses:
              '200': { description: OK }
    `);

    expect(entries.has('#/paths/~1pets/get/parameters/{query:dup}')).toBe(true);
    expect(entries.has('#/paths/~1pets/get/parameters/{query:dup}#2')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/collect.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../collect.js`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/engine/collect.ts
import { isPlainObject, isRef, normalizeVisitors, walkDocument } from '@redocly/openapi-core';

import { getIdentityKey } from './node-identity.js';
import { isScalar, isScalarArray } from './predicates.js';

import type {
  Config,
  Document,
  NormalizedNodeType,
  SpecVersion,
  UserContext,
  WalkContext,
} from '@redocly/openapi-core';
import type { NodeEntry } from './types.js';

export interface CollectedDocument {
  entries: Map<string, NodeEntry>;
  usageEdges: Array<{ site: string; target: string }>;
}

export function collectDocumentMap(opts: {
  document: Document;
  types: Record<string, NormalizedNodeType>;
  specVersion: SpecVersion;
  config: Config;
}): CollectedDocument {
  const { document, types, specVersion, config } = opts;
  const entries = new Map<string, NodeEntry>();
  const usageEdges: Array<{ site: string; target: string }> = [];
  // realPointer → stablePointer, filled top-down (walk is pre-order)
  const stableByReal = new Map<string, string>();
  const collisionCounts = new Map<string, number>();

  const visitor = {
    any: {
      enter(node: unknown, ctx: UserContext) {
        if (!isPlainObject(node) && !Array.isArray(node)) return;

        const realPointer = ctx.location.pointer;
        const { parentReal, segment } = splitPointer(realPointer);
        const stableParent =
          parentReal === null ? null : (stableByReal.get(parentReal) ?? parentReal);

        let stableSegment = segment;
        if (Array.isArray(ctx.parent)) {
          const identity = getIdentityKey(ctx.type.name, node);
          if (identity !== undefined) stableSegment = identity;
        }

        let pointer =
          stableParent === null
            ? realPointer
            : stableParent === '#/'
              ? `#/${stableSegment}`
              : `${stableParent}/${stableSegment}`;

        if (entries.has(pointer)) {
          const next = (collisionCounts.get(pointer) ?? 1) + 1;
          collisionCounts.set(pointer, next);
          pointer = `${pointer}#${next}`;
        }
        stableByReal.set(realPointer, pointer);

        const scalars: Record<string, unknown> = {};
        const refs: Record<string, string> = {};
        if (isPlainObject(node)) {
          for (const [prop, value] of Object.entries(node)) {
            if (isRef(value)) {
              refs[prop] = value.$ref;
              usageEdges.push({ site: `${pointer}/${prop}`, target: value.$ref });
            } else if (isScalar(value) || isScalarArray(value)) {
              scalars[prop] = value;
            }
          }
        }

        entries.set(pointer, {
          pointer,
          realPointer,
          parentPointer: stableParent,
          typeName: ctx.type.name,
          scalars,
          refs,
          raw: node,
        });
      },
    },
  };

  const normalizedVisitors = normalizeVisitors(
    [{ severity: 'warn', ruleId: 'diff-collect', visitor }],
    types
  );
  const ctx: WalkContext = { problems: [], specVersion, config, visitorsData: {} };

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors,
    // Empty map: $ref nodes fail to resolve and are NOT traversed —
    // refs are recorded as node attributes above ($ref-as-scalar, spec §5.3).
    resolvedRefMap: new Map(),
    ctx,
  });

  return { entries, usageEdges };
}

function splitPointer(pointer: string): { parentReal: string | null; segment: string } {
  if (pointer === '#/' || pointer === '#') {
    return { parentReal: null, segment: pointer };
  }
  const idx = pointer.lastIndexOf('/');
  const parentReal = idx <= 1 ? '#/' : pointer.slice(0, idx);
  return { parentReal, segment: pointer.slice(idx + 1) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/collect.test.ts --coverage.enabled=false`
Expected: PASS (4 tests).

**If the walk throws or skips on the empty `resolvedRefMap`:** inspect `packages/core/src/walk.ts` `resolve()` closure — it must return `{ node: undefined, location: undefined }` for unresolved refs. If it throws instead, wrap the ref lookup result handling in `collect.ts` is NOT the fix; instead pass a `ResolvedRefMap` from `resolveDocument` and add a guard in the visitor: skip any entry whose `realPointer` was already recorded (dedupe by first visit). Re-run the test — the ref must still appear in `refs` and `#/components/schemas/Pet` must exist exactly once.

- [ ] **Step 5: Run the full diff test suite and typecheck**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff --coverage.enabled=false && npm run typecheck`
Expected: all tests PASS; no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/diff/engine/collect.ts packages/cli/src/commands/diff/engine/__tests__/collect.test.ts
git commit -m "feat(cli): collect documents into flat stable-pointer maps for diff"
```

---

### Task 5: Compare — two maps → RawChange[]

**Files:**

- Create: `packages/cli/src/commands/diff/engine/compare.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/compare.test.ts`

**Interfaces:**

- Consumes: `NodeEntry`, `RawChange` (Task 1); `scalarEquals` (Task 2).
- Produces: `compareMaps(base: Map<string, NodeEntry>, revision: Map<string, NodeEntry>): RawChange[]`.

**Key behaviors under test:** matched nodes → property-level `changed`; added/removed subtree collapses to one change at its root; descendants of a boundary stay silent; `replaced` (typeName differs) emits a removed+added pair and suppresses descendants; unchanged emits nothing; output ordered by pointer.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/compare.test.ts
import { compareMaps } from '../compare.js';

import type { NodeEntry } from '../types.js';

function entry(partial: Partial<NodeEntry> & { pointer: string }): NodeEntry {
  return {
    realPointer: partial.pointer,
    parentPointer: null,
    typeName: 'Schema',
    scalars: {},
    refs: {},
    raw: {},
    ...partial,
  };
}

function toMap(entries: NodeEntry[]): Map<string, NodeEntry> {
  return new Map(entries.map((e) => [e.pointer, e]));
}

describe('compareMaps', () => {
  it('emits property-level changes for matched nodes', () => {
    const base = toMap([entry({ pointer: '#/a', scalars: { type: 'integer', description: 'x' } })]);
    const revision = toMap([
      entry({ pointer: '#/a', scalars: { type: 'number', description: 'x', format: 'float' } }),
    ]);

    const changes = compareMaps(base, revision);
    expect(changes).toEqual([
      {
        pointer: '#/a',
        property: 'format',
        kind: 'changed',
        typeName: 'Schema',
        base: { pointer: '#/a/format', value: undefined },
        revision: { pointer: '#/a/format', value: 'float' },
      },
      {
        pointer: '#/a',
        property: 'type',
        kind: 'changed',
        typeName: 'Schema',
        base: { pointer: '#/a/type', value: 'integer' },
        revision: { pointer: '#/a/type', value: 'number' },
      },
    ]);
  });

  it('collapses a removed subtree into one change at its root', () => {
    const shared = entry({ pointer: '#/paths', typeName: 'PathsMap' });
    const base = toMap([
      shared,
      entry({
        pointer: '#/paths/~1pets',
        parentPointer: '#/paths',
        typeName: 'PathItem',
        raw: { get: {} },
      }),
      entry({
        pointer: '#/paths/~1pets/get',
        parentPointer: '#/paths/~1pets',
        typeName: 'Operation',
      }),
    ]);
    const revision = toMap([shared]);

    const changes = compareMaps(base, revision);
    expect(changes).toEqual([
      {
        pointer: '#/paths/~1pets',
        kind: 'removed',
        typeName: 'PathItem',
        base: { pointer: '#/paths/~1pets', value: { get: {} } },
      },
    ]);
  });

  it('treats typeName mismatch as a removed+added pair and suppresses descendants', () => {
    const base = toMap([
      entry({ pointer: '#/x', typeName: 'Schema', raw: { type: 'object' } }),
      entry({
        pointer: '#/x/properties/a',
        parentPointer: '#/x',
        scalars: { type: 'string' },
      }),
    ]);
    const revision = toMap([
      entry({ pointer: '#/x', typeName: 'Example', raw: { value: 1 } }),
      entry({
        pointer: '#/x/properties/a',
        parentPointer: '#/x',
        scalars: { type: 'number' },
      }),
    ]);

    const changes = compareMaps(base, revision);
    expect(changes).toEqual([
      {
        pointer: '#/x',
        kind: 'removed',
        typeName: 'Schema',
        base: { pointer: '#/x', value: { type: 'object' } },
      },
      {
        pointer: '#/x',
        kind: 'added',
        typeName: 'Example',
        revision: { pointer: '#/x', value: { value: 1 } },
      },
    ]);
  });

  it('emits nothing when maps are identical', () => {
    const entries = [entry({ pointer: '#/a', scalars: { type: 'string' } })];
    expect(compareMaps(toMap(entries), toMap(entries))).toEqual([]);
  });

  it('compares ref attributes like scalars', () => {
    const base = toMap([entry({ pointer: '#/m', refs: { schema: '#/components/schemas/A' } })]);
    const revision = toMap([entry({ pointer: '#/m', refs: { schema: '#/components/schemas/B' } })]);

    const changes = compareMaps(base, revision);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      pointer: '#/m',
      property: 'schema',
      kind: 'changed',
      base: { value: '#/components/schemas/A' },
      revision: { value: '#/components/schemas/B' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/compare.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../compare.js`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/engine/compare.ts
import { scalarEquals } from './predicates.js';

import type { NodeEntry, RawChange } from './types.js';

export function compareMaps(
  base: Map<string, NodeEntry>,
  revision: Map<string, NodeEntry>
): RawChange[] {
  const changes: RawChange[] = [];
  const keys = new Set([...base.keys(), ...revision.keys()]);

  // Pass 1: boundary nodes — added roots, removed roots, replaced (typeName differs).
  const boundaries = new Set<string>();
  for (const key of keys) {
    const a = base.get(key);
    const b = revision.get(key);
    if (!a || !b || a.typeName !== b.typeName) {
      boundaries.add(key);
    }
  }

  const getEntry = (key: string) => base.get(key) ?? revision.get(key);

  const hasBoundaryAncestor = (key: string): boolean => {
    let parent = getEntry(key)?.parentPointer ?? null;
    while (parent !== null) {
      if (boundaries.has(parent)) return true;
      parent = getEntry(parent)?.parentPointer ?? null;
    }
    return false;
  };

  // Pass 2: emission, in deterministic pointer order.
  for (const key of [...keys].sort()) {
    if (hasBoundaryAncestor(key)) continue; // implied by a reported ancestor
    const a = base.get(key);
    const b = revision.get(key);

    if (a && !b) {
      changes.push({
        pointer: key,
        kind: 'removed',
        typeName: a.typeName,
        base: { pointer: a.realPointer, value: a.raw },
      });
    } else if (!a && b) {
      changes.push({
        pointer: key,
        kind: 'added',
        typeName: b.typeName,
        revision: { pointer: b.realPointer, value: b.raw },
      });
    } else if (a && b && a.typeName !== b.typeName) {
      // replaced → a removed+added pair at the same pointer
      changes.push({
        pointer: key,
        kind: 'removed',
        typeName: a.typeName,
        base: { pointer: a.realPointer, value: a.raw },
      });
      changes.push({
        pointer: key,
        kind: 'added',
        typeName: b.typeName,
        revision: { pointer: b.realPointer, value: b.raw },
      });
    } else if (a && b) {
      const props = new Set([
        ...Object.keys(a.scalars),
        ...Object.keys(a.refs),
        ...Object.keys(b.scalars),
        ...Object.keys(b.refs),
      ]);
      for (const property of [...props].sort()) {
        const before = property in a.refs ? a.refs[property] : a.scalars[property];
        const after = property in b.refs ? b.refs[property] : b.scalars[property];
        if (!scalarEquals(before, after)) {
          changes.push({
            pointer: key,
            property,
            kind: 'changed',
            typeName: a.typeName,
            base: { pointer: `${a.realPointer}/${property}`, value: before },
            revision: { pointer: `${b.realPointer}/${property}`, value: after },
          });
        }
      }
    }
  }

  return changes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/compare.test.ts --coverage.enabled=false`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff/engine/compare.ts packages/cli/src/commands/diff/engine/__tests__/compare.test.ts
git commit -m "feat(cli): add two-pass flat map comparison for diff"
```

---

### Task 6: Usage index and polarity

**Files:**

- Create: `packages/cli/src/commands/diff/engine/classify/usage.ts`
- Create: `packages/cli/src/commands/diff/engine/classify/polarity.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/polarity.test.ts`

**Interfaces:**

- Consumes: `Polarity` (Task 1).
- Produces:
  - `usage.ts`: `class UsageIndex { constructor(edges: Array<{ site: string; target: string }>); polarityOf(componentPointer: string, resolveSitePolarity: (site: string) => Polarity): Polarity }`, `getComponentRoot(pointer: string): string | undefined`, `mergePolarity(a: Polarity, b: Polarity): Polarity`.
  - `polarity.ts`: `getPolarity(pointer: string, usage: UsageIndex): Polarity`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/polarity.test.ts
import { getPolarity } from '../classify/polarity.js';
import { UsageIndex, getComponentRoot, mergePolarity } from '../classify/usage.js';

describe('getComponentRoot', () => {
  it('extracts the component root', () => {
    expect(getComponentRoot('#/components/schemas/Pet/properties/name')).toBe(
      '#/components/schemas/Pet'
    );
    expect(getComponentRoot('#/paths/~1pets/get')).toBeUndefined();
  });
});

describe('mergePolarity', () => {
  it('merges polarities', () => {
    expect(mergePolarity('neutral', 'request')).toBe('request');
    expect(mergePolarity('request', 'request')).toBe('request');
    expect(mergePolarity('request', 'response')).toBe('both');
    expect(mergePolarity('both', 'response')).toBe('both');
  });
});

describe('getPolarity', () => {
  const emptyUsage = new UsageIndex([]);

  it('derives polarity from pointer segments', () => {
    expect(getPolarity('#/paths/~1p/get/responses/200/description', emptyUsage)).toBe('response');
    expect(getPolarity('#/paths/~1p/get/parameters/{query:limit}/schema', emptyUsage)).toBe(
      'request'
    );
    expect(getPolarity('#/paths/~1p/post/requestBody/content/application~1json', emptyUsage)).toBe(
      'request'
    );
    expect(getPolarity('#/info/title', emptyUsage)).toBe('neutral');
    expect(getPolarity('#/tags/{pets}', emptyUsage)).toBe('neutral');
  });

  it('treats callbacks and webhooks as neutral (inverted direction, not judged in v1)', () => {
    expect(
      getPolarity('#/paths/~1p/post/callbacks/onEvent/~1cb/post/requestBody', emptyUsage)
    ).toBe('neutral');
    expect(getPolarity('#/webhooks/newPet/post/parameters/{query:x}', emptyUsage)).toBe('neutral');
  });

  it('derives component polarity from usage sites', () => {
    const usage = new UsageIndex([
      {
        site: '#/paths/~1pets/get/responses/200/content/application~1json/schema',
        target: '#/components/schemas/Pet',
      },
    ]);
    expect(getPolarity('#/components/schemas/Pet/properties/name', usage)).toBe('response');
  });

  it('derives both when a component is used on both sides', () => {
    const usage = new UsageIndex([
      {
        site: '#/paths/~1pets/get/responses/200/content/a~1b/schema',
        target: '#/components/schemas/Pet',
      },
      {
        site: '#/paths/~1pets/post/requestBody/content/a~1b/schema',
        target: '#/components/schemas/Pet',
      },
    ]);
    expect(getPolarity('#/components/schemas/Pet', usage)).toBe('both');
  });

  it('resolves transitive usage through other components, cycle-safe', () => {
    const usage = new UsageIndex([
      {
        site: '#/paths/~1pets/get/responses/200/content/a~1b/schema',
        target: '#/components/schemas/Pet',
      },
      {
        site: '#/components/schemas/Pet/properties/address',
        target: '#/components/schemas/Address',
      },
      // cycle:
      { site: '#/components/schemas/Address/properties/pet', target: '#/components/schemas/Pet' },
    ]);
    expect(getPolarity('#/components/schemas/Address', usage)).toBe('response');
  });

  it('returns neutral for unused components', () => {
    expect(getPolarity('#/components/schemas/Orphan', emptyUsage)).toBe('neutral');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/polarity.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../classify/polarity.js`.

- [ ] **Step 3: Write the implementation (both files)**

```ts
// packages/cli/src/commands/diff/engine/classify/usage.ts
import type { Polarity } from '../types.js';

export function getComponentRoot(pointer: string): string | undefined {
  const match = pointer.match(/^(#\/components\/[^/]+\/[^/]+)/);
  return match?.[1];
}

export function mergePolarity(a: Polarity, b: Polarity): Polarity {
  if (a === b) return a;
  if (a === 'neutral') return b;
  if (b === 'neutral') return a;
  return 'both';
}

export class UsageIndex {
  private sitesByTarget = new Map<string, Set<string>>();

  constructor(edges: Array<{ site: string; target: string }>) {
    for (const { site, target } of edges) {
      const root = getComponentRoot(target) ?? target;
      if (!this.sitesByTarget.has(root)) this.sitesByTarget.set(root, new Set());
      this.sitesByTarget.get(root)!.add(site);
    }
  }

  polarityOf(componentPointer: string, resolveSitePolarity: (site: string) => Polarity): Polarity {
    const seen = new Set<string>();
    const visit = (pointer: string): Polarity => {
      if (seen.has(pointer)) return 'neutral'; // cycle guard
      seen.add(pointer);
      let result: Polarity = 'neutral';
      for (const site of this.sitesByTarget.get(pointer) ?? []) {
        // a ref site inside another component chains to that component's own usage
        const siteComponentRoot = getComponentRoot(site);
        const sitePolarity = siteComponentRoot
          ? visit(siteComponentRoot)
          : resolveSitePolarity(site);
        result = mergePolarity(result, sitePolarity);
        if (result === 'both') return 'both';
      }
      return result;
    };
    return visit(getComponentRoot(componentPointer) ?? componentPointer);
  }
}
```

```ts
// packages/cli/src/commands/diff/engine/classify/polarity.ts
import { getComponentRoot, type UsageIndex } from './usage.js';

import type { Polarity } from '../types.js';

// Stable pointers are '#/'-prefixed with '/'-separated segments; identity keys never
// contain a raw '/' (escaped in node-identity.ts), so plain splitting is safe.
function segmentsOf(pointer: string): string[] {
  return pointer.replace(/^#\//, '').split('/');
}

export function getPolarity(pointer: string, usage: UsageIndex): Polarity {
  const segments = segmentsOf(pointer);
  if (segments.includes('callbacks') || segments.includes('webhooks')) return 'neutral';
  if (segments[0] === 'components') {
    const root = getComponentRoot(pointer);
    if (!root) return 'neutral';
    return usage.polarityOf(root, getSitePolarity);
  }
  return getSitePolarity(pointer);
}

function getSitePolarity(pointer: string): Polarity {
  const segments = segmentsOf(pointer);
  if (segments.includes('callbacks') || segments.includes('webhooks')) return 'neutral';
  if (segments.includes('responses')) return 'response';
  if (segments.includes('parameters') || segments.includes('requestBody')) return 'request';
  return 'neutral';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/polarity.test.ts --coverage.enabled=false`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff/engine/classify/usage.ts packages/cli/src/commands/diff/engine/classify/polarity.ts packages/cli/src/commands/diff/engine/__tests__/polarity.test.ts
git commit -m "feat(cli): add diff polarity engine with component usage index"
```

---

### Task 7: Classification engine + first rules (operation, path)

**Files:**

- Create: `packages/cli/src/commands/diff/engine/classify/index.ts`
- Create: `packages/cli/src/commands/diff/engine/classify/rules/operation-rules.ts`
- Create: `packages/cli/src/commands/diff/engine/classify/oas3.ts`
- Create: `packages/cli/src/commands/diff/engine/classify/oas3_1.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/classify.test.ts`

**Interfaces:**

- Consumes: Tasks 1, 6 outputs.
- Produces:
  - `classify/index.ts`: `classifyChanges(opts: { changes: RawChange[]; specVersion: SpecVersion; base: Map<string, NodeEntry>; revision: Map<string, NodeEntry>; usage: UsageIndex }): Change[]`.
  - `operation-rules.ts`: `operationRemoved: DiffRule`, `pathRemoved: DiffRule`.
  - `oas3.ts`: `oas3Rules: DiffRuleRegistry`; `oas3_1.ts`: `oas3_1Rules: DiffRuleRegistry`.

**Engine policy (spec §7.2):** evaluate ALL rules registered for the change's type; polarity `both` expands to `request` and `response` passes; the most severe verdict wins; all firing rule ids attached (deduped, sorted); default `non-breaking`; unknown spec version → structural only.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/classify.test.ts
import { classifyChanges } from '../classify/index.js';
import { UsageIndex } from '../classify/usage.js';

import type { NodeEntry, RawChange } from '../types.js';

const emptyMaps = {
  base: new Map<string, NodeEntry>(),
  revision: new Map<string, NodeEntry>(),
  usage: new UsageIndex([]),
};

describe('classifyChanges', () => {
  it('classifies operation removal as breaking', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/paths/~1pets/get',
        kind: 'removed',
        typeName: 'Operation',
        base: { pointer: '#/paths/~1pets/get', value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_1', ...emptyMaps });
    expect(change.compat).toBe('breaking');
    expect(change.ruleIds).toEqual(['operation-removed']);
    expect(change.message).toBeDefined();
  });

  it('classifies path removal as breaking', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/paths/~1pets',
        kind: 'removed',
        typeName: 'PathItem',
        base: { pointer: '#/paths/~1pets', value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_0', ...emptyMaps });
    expect(change.compat).toBe('breaking');
    expect(change.ruleIds).toEqual(['path-removed']);
  });

  it('defaults to non-breaking when no rule judges the change', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/info',
        property: 'title',
        kind: 'changed',
        typeName: 'Info',
        base: { pointer: '#/info/title', value: 'a' },
        revision: { pointer: '#/info/title', value: 'b' },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_1', ...emptyMaps });
    expect(change.compat).toBe('non-breaking');
    expect(change.ruleIds).toBeUndefined();
  });

  it('returns structural-only (non-breaking) for specs without a registry', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/x',
        kind: 'removed',
        typeName: 'Operation',
        base: { pointer: '#/x', value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'async2', ...emptyMaps });
    expect(change.compat).toBe('non-breaking');
  });

  it('added operations are non-breaking', () => {
    const changes: RawChange[] = [
      {
        pointer: '#/paths/~1pets/post',
        kind: 'added',
        typeName: 'Operation',
        revision: { pointer: '#/paths/~1pets/post', value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_1', ...emptyMaps });
    expect(change.compat).toBe('non-breaking');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/classify.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../classify/index.js`.

- [ ] **Step 3: Write the implementation (four files)**

```ts
// packages/cli/src/commands/diff/engine/classify/rules/operation-rules.ts
import { breaking } from '../../types.js';

import type { DiffRule } from '../../types.js';

export const operationRemoved: DiffRule = {
  id: 'operation-removed',
  description: 'Removing an operation breaks all of its consumers.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('Operation was removed.');
  },
};

export const pathRemoved: DiffRule = {
  id: 'path-removed',
  description: 'Removing a path breaks all consumers of its operations.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('Path was removed.');
  },
};
```

```ts
// packages/cli/src/commands/diff/engine/classify/oas3.ts
import { operationRemoved, pathRemoved } from './rules/operation-rules.js';

import type { DiffRuleRegistry } from '../types.js';

export const oas3Rules: DiffRuleRegistry = {
  Operation: [operationRemoved],
  PathItem: [pathRemoved],
};
```

```ts
// packages/cli/src/commands/diff/engine/classify/oas3_1.ts
import { oas3Rules } from './oas3.js';

import type { DiffRuleRegistry } from '../types.js';

// Inherits oas3 rules; override or extend pointwise when 3.1-specific rules appear.
export const oas3_1Rules: DiffRuleRegistry = { ...oas3Rules };
```

```ts
// packages/cli/src/commands/diff/engine/classify/index.ts
import { compatRank } from '../types.js';
import { getPolarity } from './polarity.js';
import { oas3Rules } from './oas3.js';
import { oas3_1Rules } from './oas3_1.js';

import type { SpecVersion } from '@redocly/openapi-core';
import type {
  Change,
  DiffRuleRegistry,
  NodeEntry,
  Polarity,
  RawChange,
  Verdict,
} from '../types.js';
import type { UsageIndex } from './usage.js';

const REGISTRIES: Partial<Record<SpecVersion, DiffRuleRegistry>> = {
  oas3_0: oas3Rules,
  oas3_1: oas3_1Rules,
  oas3_2: oas3_1Rules,
};

function expandPolarity(polarity: Polarity): Polarity[] {
  return polarity === 'both' ? ['request', 'response'] : [polarity];
}

export function classifyChanges(opts: {
  changes: RawChange[];
  specVersion: SpecVersion;
  base: Map<string, NodeEntry>;
  revision: Map<string, NodeEntry>;
  usage: UsageIndex;
}): Change[] {
  const { changes, specVersion, base, revision, usage } = opts;
  const registry = REGISTRIES[specVersion] ?? {};

  return changes.map((change) => {
    const rules = registry[change.typeName] ?? [];
    const ruleIds: string[] = [];
    let winner: Verdict | undefined;

    for (const polarity of expandPolarity(getPolarity(change.pointer, usage))) {
      const ctx = {
        polarity,
        specVersion,
        base: (pointer: string) => base.get(pointer),
        revision: (pointer: string) => revision.get(pointer),
      };
      for (const rule of rules) {
        const verdict = rule.visit(change, ctx);
        if (!verdict) continue;
        if (!ruleIds.includes(rule.id)) ruleIds.push(rule.id);
        if (!winner || compatRank(verdict.compat) > compatRank(winner.compat)) {
          winner = verdict; // worst verdict wins; registration order carries no semantics
        }
      }
    }

    return {
      ...change,
      compat: winner?.compat ?? 'non-breaking',
      ...(ruleIds.length ? { ruleIds: ruleIds.sort() } : {}),
      ...(winner ? { message: winner.message } : {}),
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/classify.test.ts --coverage.enabled=false`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff/engine/classify packages/cli/src/commands/diff/engine/__tests__/classify.test.ts
git commit -m "feat(cli): add diff classification engine with worst-verdict policy"
```

---

### Task 8: Parameter, response, and media-type rules

**Files:**

- Create: `packages/cli/src/commands/diff/engine/classify/rules/parameter-rules.ts`
- Create: `packages/cli/src/commands/diff/engine/classify/rules/response-rules.ts`
- Modify: `packages/cli/src/commands/diff/engine/classify/oas3.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/rules-parameter-response.test.ts`

**Interfaces:**

- Produces: `parameterRemoved`, `parameterAddedRequired`, `parameterBecameRequired` (in `parameter-rules.ts`); `responseRemoved`, `mediaTypeRemoved` (in `response-rules.ts`) — all `DiffRule`.

**Note (spec §7.3 deviation):** `parameter-in-changed` is intentionally NOT implemented: the identity key is `in+name`, so a changed `in` produces a removed+added pair, already judged breaking by `parameter-removed`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/rules-parameter-response.test.ts
import {
  parameterAddedRequired,
  parameterBecameRequired,
  parameterRemoved,
} from '../classify/rules/parameter-rules.js';
import { mediaTypeRemoved, responseRemoved } from '../classify/rules/response-rules.js';

import type { RawChange, RuleContext } from '../types.js';

function ctx(polarity: RuleContext['polarity']): RuleContext {
  return { polarity, specVersion: 'oas3_1', base: () => undefined, revision: () => undefined };
}

describe('parameter rules', () => {
  it('parameter-removed: breaking in request, silent in response context', () => {
    const change: RawChange = {
      pointer: '#/paths/~1p/get/parameters/{query:limit}',
      kind: 'removed',
      typeName: 'Parameter',
      base: { pointer: '#/paths/~1p/get/parameters/0', value: { name: 'limit', in: 'query' } },
    };
    expect(parameterRemoved.visit(change, ctx('request'))?.compat).toBe('breaking');
    expect(parameterRemoved.visit(change, ctx('response'))).toBeUndefined();
  });

  it('parameter-added-required: breaking only when the new parameter is required', () => {
    const added = (required?: boolean): RawChange => ({
      pointer: '#/paths/~1p/get/parameters/{query:limit}',
      kind: 'added',
      typeName: 'Parameter',
      revision: {
        pointer: '#/paths/~1p/get/parameters/0',
        value: { name: 'limit', in: 'query', ...(required === undefined ? {} : { required }) },
      },
    });
    expect(parameterAddedRequired.visit(added(true), ctx('request'))?.compat).toBe('breaking');
    expect(parameterAddedRequired.visit(added(false), ctx('request'))).toBeUndefined();
    expect(parameterAddedRequired.visit(added(), ctx('request'))).toBeUndefined();
  });

  it('parameter-became-required: breaking when required flips to true in request', () => {
    const change: RawChange = {
      pointer: '#/paths/~1p/get/parameters/{query:limit}',
      property: 'required',
      kind: 'changed',
      typeName: 'Parameter',
      base: { pointer: '#/paths/~1p/get/parameters/0/required', value: undefined },
      revision: { pointer: '#/paths/~1p/get/parameters/0/required', value: true },
    };
    expect(parameterBecameRequired.visit(change, ctx('request'))?.compat).toBe('breaking');
    expect(parameterBecameRequired.visit(change, ctx('response'))).toBeUndefined();

    const relaxed: RawChange = {
      ...change,
      base: { pointer: change.base!.pointer, value: true },
      revision: { pointer: change.revision!.pointer, value: false },
    };
    expect(parameterBecameRequired.visit(relaxed, ctx('request'))).toBeUndefined();
  });
});

describe('response rules', () => {
  it('response-removed is breaking', () => {
    const change: RawChange = {
      pointer: '#/paths/~1p/get/responses/200',
      kind: 'removed',
      typeName: 'Response',
      base: { pointer: '#/paths/~1p/get/responses/200', value: { description: 'OK' } },
    };
    expect(responseRemoved.visit(change, ctx('response'))?.compat).toBe('breaking');
  });

  it('media-type-removed is breaking in any polarity', () => {
    const change: RawChange = {
      pointer: '#/paths/~1p/get/responses/200/content/application~1json',
      kind: 'removed',
      typeName: 'MediaType',
      base: { pointer: '#/paths/~1p/get/responses/200/content/application~1json', value: {} },
    };
    expect(mediaTypeRemoved.visit(change, ctx('response'))?.compat).toBe('breaking');
    expect(mediaTypeRemoved.visit(change, ctx('request'))?.compat).toBe('breaking');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/rules-parameter-response.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve rule modules.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/engine/classify/rules/parameter-rules.ts
import { isPlainObject } from '@redocly/openapi-core';

import { becameTrue } from '../../predicates.js';
import { breaking } from '../../types.js';

import type { DiffRule } from '../../types.js';

export const parameterRemoved: DiffRule = {
  id: 'parameter-removed',
  description: 'Removing a request parameter breaks clients that send it.',
  visit(change, ctx) {
    if (change.kind !== 'removed' || ctx.polarity !== 'request') return;
    return breaking('Parameter was removed.');
  },
};

export const parameterAddedRequired: DiffRule = {
  id: 'parameter-added-required',
  description: 'Adding a new required parameter breaks clients that do not send it.',
  visit(change, ctx) {
    if (change.kind !== 'added' || ctx.polarity !== 'request') return;
    const value = change.revision?.value;
    if (isPlainObject(value) && value.required === true) {
      return breaking('A new required parameter was added.');
    }
  },
};

export const parameterBecameRequired: DiffRule = {
  id: 'parameter-became-required',
  description: 'Marking an existing request parameter as required breaks clients that omit it.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'request') return;
    if (becameTrue(change.base?.value, change.revision?.value)) {
      return breaking('Parameter became required.');
    }
  },
};
```

```ts
// packages/cli/src/commands/diff/engine/classify/rules/response-rules.ts
import { breaking } from '../../types.js';

import type { DiffRule } from '../../types.js';

export const responseRemoved: DiffRule = {
  id: 'response-removed',
  description: 'Removing a response breaks clients that handle it.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('Response was removed.');
  },
};

export const mediaTypeRemoved: DiffRule = {
  id: 'media-type-removed',
  description: 'Removing a media type breaks clients that produce or consume it.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('Media type was removed.');
  },
};
```

Update the registry:

```ts
// packages/cli/src/commands/diff/engine/classify/oas3.ts
import { operationRemoved, pathRemoved } from './rules/operation-rules.js';
import {
  parameterAddedRequired,
  parameterBecameRequired,
  parameterRemoved,
} from './rules/parameter-rules.js';
import { mediaTypeRemoved, responseRemoved } from './rules/response-rules.js';

import type { DiffRuleRegistry } from '../types.js';

export const oas3Rules: DiffRuleRegistry = {
  Operation: [operationRemoved],
  PathItem: [pathRemoved],
  Parameter: [parameterRemoved, parameterAddedRequired, parameterBecameRequired],
  Response: [responseRemoved],
  MediaType: [mediaTypeRemoved],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/rules-parameter-response.test.ts packages/cli/src/commands/diff/engine/__tests__/classify.test.ts --coverage.enabled=false`
Expected: PASS (both files — the classify engine tests must still pass).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff/engine/classify packages/cli/src/commands/diff/engine/__tests__/rules-parameter-response.test.ts
git commit -m "feat(cli): add diff parameter and response breaking rules"
```

---

### Task 9: Schema rules and ref-target rule

**Files:**

- Create: `packages/cli/src/commands/diff/engine/classify/rules/schema-rules.ts`
- Create: `packages/cli/src/commands/diff/engine/classify/rules/ref-rules.ts`
- Modify: `packages/cli/src/commands/diff/engine/classify/oas3.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/rules-schema.test.ts`

**Interfaces:**

- Produces: `schemaTypeChanged`, `enumValuesRemoved`, `enumValuesAdded`, `requiredPropertiesAdded`, `requiredPropertiesRemoved`, `propertyRemovedFromResponse` (in `schema-rules.ts`); `refTargetChanged` (in `ref-rules.ts`) — all `DiffRule`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/rules-schema.test.ts
import { refTargetChanged } from '../classify/rules/ref-rules.js';
import {
  enumValuesAdded,
  enumValuesRemoved,
  propertyRemovedFromResponse,
  requiredPropertiesAdded,
  requiredPropertiesRemoved,
  schemaTypeChanged,
} from '../classify/rules/schema-rules.js';

import type { NodeEntry, RawChange, RuleContext } from '../types.js';

function ctx(
  polarity: RuleContext['polarity'],
  maps: { base?: Map<string, NodeEntry>; revision?: Map<string, NodeEntry> } = {}
): RuleContext {
  return {
    polarity,
    specVersion: 'oas3_1',
    base: (p) => maps.base?.get(p),
    revision: (p) => maps.revision?.get(p),
  };
}

function propChange(property: string, before: unknown, after: unknown): RawChange {
  return {
    pointer: '#/components/schemas/Pet',
    property,
    kind: 'changed',
    typeName: 'Schema',
    base: { pointer: `#/components/schemas/Pet/${property}`, value: before },
    revision: { pointer: `#/components/schemas/Pet/${property}`, value: after },
  };
}

describe('schema rules', () => {
  it('schema-type-changed: narrowing breaks requests, widening breaks responses', () => {
    const narrowed = propChange('type', 'number', 'integer');
    expect(schemaTypeChanged.visit(narrowed, ctx('request'))?.compat).toBe('breaking');
    expect(schemaTypeChanged.visit(narrowed, ctx('response'))).toBeUndefined();

    const widened = propChange('type', 'integer', 'number');
    expect(schemaTypeChanged.visit(widened, ctx('request'))).toBeUndefined();
    expect(schemaTypeChanged.visit(widened, ctx('response'))?.compat).toBe('breaking');
  });

  it('enum rules are polarity-mirrored', () => {
    const shrunk = propChange('enum', ['a', 'b'], ['a']);
    expect(enumValuesRemoved.visit(shrunk, ctx('request'))?.compat).toBe('breaking');
    expect(enumValuesRemoved.visit(shrunk, ctx('response'))).toBeUndefined();

    const grew = propChange('enum', ['a'], ['a', 'b']);
    expect(enumValuesAdded.visit(grew, ctx('response'))?.compat).toBe('breaking');
    expect(enumValuesAdded.visit(grew, ctx('request'))).toBeUndefined();
  });

  it('required rules are polarity-mirrored', () => {
    const grew = propChange('required', ['a'], ['a', 'b']);
    expect(requiredPropertiesAdded.visit(grew, ctx('request'))?.compat).toBe('breaking');
    expect(requiredPropertiesAdded.visit(grew, ctx('response'))).toBeUndefined();

    const shrunk = propChange('required', ['a', 'b'], ['a']);
    expect(requiredPropertiesRemoved.visit(shrunk, ctx('response'))?.compat).toBe('breaking');
    expect(requiredPropertiesRemoved.visit(shrunk, ctx('request'))).toBeUndefined();
  });

  it('property-removed-from-response fires only for schema-property nodes in response', () => {
    const change: RawChange = {
      pointer: '#/components/schemas/Pet/properties/name',
      kind: 'removed',
      typeName: 'Schema',
      base: { pointer: '#/components/schemas/Pet/properties/name', value: { type: 'string' } },
    };
    expect(propertyRemovedFromResponse.visit(change, ctx('response'))?.compat).toBe('breaking');
    expect(propertyRemovedFromResponse.visit(change, ctx('request'))).toBeUndefined();

    const notAProperty: RawChange = {
      pointer: '#/components/schemas/Pet/oneOf/0',
      kind: 'removed',
      typeName: 'Schema',
      base: { pointer: '#/components/schemas/Pet/oneOf/0', value: {} },
    };
    expect(propertyRemovedFromResponse.visit(notAProperty, ctx('response'))).toBeUndefined();
  });
});

describe('ref-target-changed', () => {
  it('warns when a ref-valued property is retargeted', () => {
    const pointer = '#/paths/~1p/get/responses/200/content/application~1json';
    const base = new Map<string, NodeEntry>([
      [
        pointer,
        {
          pointer,
          realPointer: pointer,
          parentPointer: null,
          typeName: 'MediaType',
          scalars: {},
          refs: { schema: '#/components/schemas/Pet' },
          raw: {},
        },
      ],
    ]);
    const change: RawChange = {
      pointer,
      property: 'schema',
      kind: 'changed',
      typeName: 'MediaType',
      base: { pointer: `${pointer}/schema`, value: '#/components/schemas/Pet' },
      revision: { pointer: `${pointer}/schema`, value: '#/components/schemas/PetV2' },
    };
    expect(refTargetChanged.visit(change, ctx('response', { base }))?.compat).toBe('warning');
  });

  it('stays silent for ordinary string property changes', () => {
    const change: RawChange = {
      pointer: '#/info',
      property: 'title',
      kind: 'changed',
      typeName: 'Info',
      base: { pointer: '#/info/title', value: 'a' },
      revision: { pointer: '#/info/title', value: 'b' },
    };
    expect(refTargetChanged.visit(change, ctx('neutral'))).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/rules-schema.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve rule modules.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/engine/classify/rules/schema-rules.ts
import { addedItems, isTypeNarrowed, isTypeWidened, missingItems } from '../../predicates.js';
import { breaking } from '../../types.js';

import type { DiffRule } from '../../types.js';

export const schemaTypeChanged: DiffRule = {
  id: 'schema-type-changed',
  description:
    'Narrowing a type restricts what clients may send; widening restricts what they can rely on receiving.',
  visit(change, ctx) {
    if (change.property !== 'type') return;
    const before = change.base?.value;
    const after = change.revision?.value;
    if (ctx.polarity === 'request' && isTypeNarrowed(before, after)) {
      return breaking(`Schema type changed from '${before}' to '${after}'.`);
    }
    if (ctx.polarity === 'response' && isTypeWidened(before, after)) {
      return breaking(`Schema type changed from '${before}' to '${after}'.`);
    }
  },
};

export const enumValuesRemoved: DiffRule = {
  id: 'enum-values-removed',
  description: 'Removing enum values restricts what clients may send.',
  visit(change, ctx) {
    if (change.property !== 'enum' || ctx.polarity !== 'request') return;
    const removed = missingItems(change.base?.value, change.revision?.value);
    if (removed.length) {
      return breaking(`Enum values removed: ${removed.join(', ')}.`);
    }
  },
};

export const enumValuesAdded: DiffRule = {
  id: 'enum-values-added',
  description: 'Adding enum values to response data may send clients values they never handled.',
  visit(change, ctx) {
    if (change.property !== 'enum' || ctx.polarity !== 'response') return;
    const added = addedItems(change.base?.value, change.revision?.value);
    if (added.length) {
      return breaking(`Enum values added: ${added.join(', ')}.`);
    }
  },
};

export const requiredPropertiesAdded: DiffRule = {
  id: 'required-properties-added',
  description: 'Requiring new request properties breaks clients that do not send them.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'request') return;
    const added = addedItems(change.base?.value, change.revision?.value);
    if (added.length) {
      return breaking(`Properties became required: ${added.join(', ')}.`);
    }
  },
};

export const requiredPropertiesRemoved: DiffRule = {
  id: 'required-properties-removed',
  description: 'Un-requiring response properties breaks clients that rely on their presence.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'response') return;
    const removed = missingItems(change.base?.value, change.revision?.value);
    if (removed.length) {
      return breaking(`Properties are no longer required: ${removed.join(', ')}.`);
    }
  },
};

export const propertyRemovedFromResponse: DiffRule = {
  id: 'property-removed-from-response',
  description: 'Removing a response property breaks clients that read it.',
  visit(change, ctx) {
    if (change.kind !== 'removed' || ctx.polarity !== 'response') return;
    const segments = change.pointer.split('/');
    if (segments[segments.length - 2] !== 'properties') return;
    return breaking('Schema property was removed.');
  },
};
```

```ts
// packages/cli/src/commands/diff/engine/classify/rules/ref-rules.ts
import { warning } from '../../types.js';

import type { DiffRule } from '../../types.js';

// Pointer-aligned comparison cannot verify whether two different targets are
// content-equivalent (spec §7.3, §13) — honest verdict is a warning.
export const refTargetChanged: DiffRule = {
  id: 'ref-target-changed',
  description:
    'A $ref now points to a different target; content equivalence cannot be verified automatically.',
  visit(change, ctx) {
    if (change.kind !== 'changed' || !change.property) return;
    const wasRef = change.property in (ctx.base(change.pointer)?.refs ?? {});
    const isRefNow = change.property in (ctx.revision(change.pointer)?.refs ?? {});
    if (!wasRef && !isRefNow) return;
    return warning(
      `Reference target changed from '${change.base?.value}' to '${change.revision?.value}' — review manually.`
    );
  },
};
```

Update the registry (`refTargetChanged` is registered for every type that commonly owns refs):

```ts
// packages/cli/src/commands/diff/engine/classify/oas3.ts
import { operationRemoved, pathRemoved } from './rules/operation-rules.js';
import {
  parameterAddedRequired,
  parameterBecameRequired,
  parameterRemoved,
} from './rules/parameter-rules.js';
import { refTargetChanged } from './rules/ref-rules.js';
import { mediaTypeRemoved, responseRemoved } from './rules/response-rules.js';
import {
  enumValuesAdded,
  enumValuesRemoved,
  propertyRemovedFromResponse,
  requiredPropertiesAdded,
  requiredPropertiesRemoved,
  schemaTypeChanged,
} from './rules/schema-rules.js';

import type { DiffRuleRegistry } from '../types.js';

export const oas3Rules: DiffRuleRegistry = {
  Operation: [operationRemoved],
  PathItem: [pathRemoved, refTargetChanged],
  Parameter: [parameterRemoved, parameterAddedRequired, parameterBecameRequired, refTargetChanged],
  Response: [responseRemoved, refTargetChanged],
  MediaType: [mediaTypeRemoved, refTargetChanged],
  RequestBody: [refTargetChanged],
  Schema: [
    schemaTypeChanged,
    enumValuesRemoved,
    enumValuesAdded,
    requiredPropertiesAdded,
    requiredPropertiesRemoved,
    propertyRemovedFromResponse,
    refTargetChanged,
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff --coverage.enabled=false`
Expected: PASS — all diff tests, including earlier tasks'.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff/engine/classify packages/cli/src/commands/diff/engine/__tests__/rules-schema.test.ts
git commit -m "feat(cli): add diff schema and ref-target breaking rules"
```

---

### Task 10: Orchestrator `diffDocuments` + output schema

**Files:**

- Create: `packages/cli/src/commands/diff/engine/index.ts`
- Create: `packages/cli/src/commands/diff/engine/output-schema.ts`
- Test: `packages/cli/src/commands/diff/engine/__tests__/diff-documents.test.ts`

**Interfaces:**

- Consumes: everything above; `detectSpec`, `getMajorSpecVersion`, `getTypes`, `normalizeTypes` from `@redocly/openapi-core`. The `@redocly/ajv` import in the test resolves via workspace hoisting (it is a dependency of `@redocly/openapi-core`) — test-only, not a new dependency.
- Produces (all exported from the engine, imported by the command via relative paths — nothing is added to `@redocly/openapi-core`):
  - `diffDocuments(opts: { base: Document; revision: Document; config: Config }): DiffResult` (synchronous — bundling is the caller's job).
  - `class DiffError extends Error` — thrown on major-family mismatch.
  - `DIFF_OUTPUT_SCHEMA` — JSON Schema for `DiffResult`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/engine/__tests__/diff-documents.test.ts
import Ajv from '@redocly/ajv/dist/2020.js';
import { createConfig, makeDocumentFromString } from '@redocly/openapi-core';
import { outdent } from 'outdent';

import { DiffError, diffDocuments } from '../index.js';
import { DIFF_OUTPUT_SCHEMA } from '../output-schema.js';

const BASE = outdent`
  openapi: 3.1.0
  info: { title: Test, version: '1.0' }
  paths:
    /pets:
      get:
        parameters:
          - name: limit
            in: query
            schema: { type: integer }
          - name: filter
            in: query
            schema: { type: string }
        responses:
          '200': { description: OK }
`;

const REVISION = outdent`
  openapi: 3.1.0
  info: { title: Test, version: '1.0' }
  paths:
    /pets:
      get:
        parameters:
          - name: filter
            in: query
            schema: { type: string }
          - name: limit
            in: query
            required: true
            schema: { type: number }
        responses:
          '200': { description: List of pets }
`;

describe('diffDocuments', () => {
  it('produces the running example from the design spec', async () => {
    const config = await createConfig({});
    const result = diffDocuments({
      base: makeDocumentFromString(BASE, ''),
      revision: makeDocumentFromString(REVISION, ''),
      config,
    });

    expect(result.version).toBe('1');
    expect(result.specVersions).toEqual({ base: 'oas3_1', revision: 'oas3_1' });

    // reordering parameters produces NO changes; three real changes remain
    const byKey = (c: { pointer: string; property?: string }) =>
      `${c.pointer}${c.property ? '::' + c.property : ''}`;
    const keys = result.changes.map(byKey).sort();
    expect(keys).toEqual([
      '#/paths/~1pets/get/parameters/{query:limit}::required',
      '#/paths/~1pets/get/parameters/{query:limit}/schema::type',
      '#/paths/~1pets/get/responses/200::description',
    ]);

    const becameRequired = result.changes.find((c) => c.property === 'required')!;
    expect(becameRequired.compat).toBe('breaking');
    expect(becameRequired.ruleIds).toEqual(['parameter-became-required']);
    expect(becameRequired.base?.pointer).toBe('#/paths/~1pets/get/parameters/0/required');
    expect(becameRequired.revision?.pointer).toBe('#/paths/~1pets/get/parameters/1/required');

    // integer → number in request is a widening — non-breaking
    const typeChanged = result.changes.find((c) => c.property === 'type')!;
    expect(typeChanged.compat).toBe('non-breaking');

    const description = result.changes.find((c) => c.property === 'description')!;
    expect(description.compat).toBe('non-breaking');

    expect(result.summary).toEqual({ breaking: 1, warning: 0, nonBreaking: 2 });
  });

  it('validates against the published output schema', async () => {
    const config = await createConfig({});
    const result = diffDocuments({
      base: makeDocumentFromString(BASE, ''),
      revision: makeDocumentFromString(REVISION, ''),
      config,
    });

    const ajv = new Ajv({ strict: false });
    const validate = ajv.compile(DIFF_OUTPUT_SCHEMA);
    expect(validate(result)).toBe(true);
  });

  it('throws DiffError for different spec families', async () => {
    const config = await createConfig({});
    const oas2 = makeDocumentFromString(
      outdent`
        swagger: '2.0'
        info: { title: Test, version: '1.0' }
        paths: {}
      `,
      ''
    );
    expect(() =>
      diffDocuments({ base: oas2, revision: makeDocumentFromString(REVISION, ''), config })
    ).toThrow(DiffError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/engine/__tests__/diff-documents.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve `../index.js` / `../output-schema.js`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/engine/index.ts
import { detectSpec, getMajorSpecVersion, getTypes, normalizeTypes } from '@redocly/openapi-core';

import { classifyChanges } from './classify/index.js';
import { UsageIndex } from './classify/usage.js';
import { collectDocumentMap } from './collect.js';
import { compareMaps } from './compare.js';

import type { Config, Document, SpecVersion } from '@redocly/openapi-core';
import type { DiffResult, DiffSummary } from './types.js';

export class DiffError extends Error {}

export function diffDocuments(opts: {
  base: Document;
  revision: Document;
  config: Config;
}): DiffResult {
  const { base, revision, config } = opts;

  const baseVersion = detectSpec(base.parsed);
  const revisionVersion = detectSpec(revision.parsed);
  if (getMajorSpecVersion(baseVersion) !== getMajorSpecVersion(revisionVersion)) {
    throw new DiffError(
      `Cannot compare different specification families: '${baseVersion}' vs '${revisionVersion}'.`
    );
  }

  // Each side is collected with ITS OWN type tree (spec §5.6).
  const collect = (document: Document, specVersion: SpecVersion) =>
    collectDocumentMap({
      document,
      types: normalizeTypes(config.extendTypes(getTypes(specVersion), specVersion), config),
      specVersion,
      config,
    });

  const baseCollected = collect(base, baseVersion);
  const revisionCollected = collect(revision, revisionVersion);

  const rawChanges = compareMaps(baseCollected.entries, revisionCollected.entries);
  const usage = new UsageIndex([...baseCollected.usageEdges, ...revisionCollected.usageEdges]);

  const changes = classifyChanges({
    changes: rawChanges,
    specVersion: revisionVersion,
    base: baseCollected.entries,
    revision: revisionCollected.entries,
    usage,
  });

  const summary = changes.reduce<DiffSummary>(
    (acc, change) => {
      if (change.compat === 'breaking') acc.breaking++;
      else if (change.compat === 'warning') acc.warning++;
      else acc.nonBreaking++;
      return acc;
    },
    { breaking: 0, warning: 0, nonBreaking: 0 }
  );

  return {
    version: '1',
    specVersions: { base: baseVersion, revision: revisionVersion },
    summary,
    changes,
  };
}
```

```ts
// packages/cli/src/commands/diff/engine/output-schema.ts

const changeSideSchema = {
  type: 'object',
  properties: {
    pointer: { type: 'string' },
    value: {}, // any JSON value
  },
  required: ['pointer'],
  additionalProperties: false,
} as const;

// JSON Schema for the versioned `json` output format (spec §8).
export const DIFF_OUTPUT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  properties: {
    version: { const: '1' },
    specVersions: {
      type: 'object',
      properties: { base: { type: 'string' }, revision: { type: 'string' } },
      required: ['base', 'revision'],
      additionalProperties: false,
    },
    summary: {
      type: 'object',
      properties: {
        breaking: { type: 'integer', minimum: 0 },
        warning: { type: 'integer', minimum: 0 },
        nonBreaking: { type: 'integer', minimum: 0 },
      },
      required: ['breaking', 'warning', 'nonBreaking'],
      additionalProperties: false,
    },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pointer: { type: 'string' },
          property: { type: 'string' },
          kind: { enum: ['added', 'removed', 'changed'] },
          typeName: { type: 'string' },
          base: changeSideSchema,
          revision: changeSideSchema,
          compat: { enum: ['breaking', 'warning', 'non-breaking'] },
          ruleIds: { type: 'array', items: { type: 'string' } },
          message: { type: 'string' },
        },
        required: ['pointer', 'kind', 'typeName', 'compat'],
        additionalProperties: false,
      },
    },
  },
  required: ['version', 'specVersions', 'summary', 'changes'],
  additionalProperties: false,
} as const;
```

- [ ] **Step 4: Run test to verify it passes, then typecheck**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff --coverage.enabled=false && npm run typecheck`
Expected: all diff tests PASS; no type errors.

**If the parameter reorder produces phantom changes:** debug `collect.ts` stable pointers first (`entries.keys()`), not `compare.ts` — the comparison is deliberately dumb.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff
git commit -m "feat(cli): add diffDocuments orchestrator with versioned output schema"
```

---

### Task 11: CLI command with stylish and json serializers

**Files:**

- Create: `packages/cli/src/commands/diff/index.ts`
- Create: `packages/cli/src/commands/diff/serializers/stylish.ts`
- Create: `packages/cli/src/commands/diff/serializers/json.ts`
- Modify: `packages/cli/src/index.ts` (register the command next to the `stats` registration)
- Test: `packages/cli/src/commands/diff/__tests__/serializers.test.ts`

**Interfaces:**

- Consumes: `bundle`, `logger` from `@redocly/openapi-core`; `diffDocuments`, `DiffError` from `./engine/index.js` (Task 10); `DiffResult` type from `./engine/types.js`; `getFallbackApisOrExit` from `../../utils/miscellaneous.js`; `AbortFlowError`, `exitWithError` from `../../utils/error.js`; `CommandArgs` from `../../wrapper.js`; `VerifyConfigOptions` from `../../types.js`.
- Produces: `handleDiff(args: CommandArgs<DiffArgv>): Promise<void>`, `DiffArgv`; serializers `stylishDiff(result: DiffResult): string`, `jsonDiff(result: DiffResult): string`.

- [ ] **Step 1: Write the failing serializer test**

```ts
// packages/cli/src/commands/diff/__tests__/serializers.test.ts
import { jsonDiff } from '../serializers/json.js';
import { stylishDiff } from '../serializers/stylish.js';

import type { DiffResult } from '../engine/types.js';

const RESULT: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 1, warning: 1, nonBreaking: 1 },
  changes: [
    {
      pointer: '#/paths/~1pets/get/responses/200',
      property: 'description',
      kind: 'changed',
      typeName: 'Response',
      base: { pointer: '#/paths/~1pets/get/responses/200/description', value: 'OK' },
      revision: { pointer: '#/paths/~1pets/get/responses/200/description', value: 'Pets' },
      compat: 'non-breaking',
    },
    {
      pointer: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'changed',
      typeName: 'Parameter',
      base: { pointer: '#/paths/~1pets/get/parameters/0/required', value: undefined },
      revision: { pointer: '#/paths/~1pets/get/parameters/0/required', value: true },
      compat: 'breaking',
      ruleIds: ['parameter-became-required'],
      message: 'Parameter became required.',
    },
    {
      pointer: '#/paths/~1pets/get/requestBody/content/application~1json',
      property: 'schema',
      kind: 'changed',
      typeName: 'MediaType',
      base: {
        pointer: '#/paths/~1pets/get/requestBody/content/application~1json/schema',
        value: '#/components/schemas/A',
      },
      revision: {
        pointer: '#/paths/~1pets/get/requestBody/content/application~1json/schema',
        value: '#/components/schemas/B',
      },
      compat: 'warning',
      ruleIds: ['ref-target-changed'],
      message: 'Reference target changed.',
    },
  ],
};

describe('stylishDiff', () => {
  it('orders by severity and renders a summary', () => {
    const output = stylishDiff(RESULT);
    const breakingIndex = output.indexOf('parameter-became-required');
    const warningIndex = output.indexOf('ref-target-changed');
    const nonBreakingIndex = output.indexOf('description');
    expect(breakingIndex).toBeGreaterThan(-1);
    expect(breakingIndex).toBeLessThan(warningIndex);
    expect(warningIndex).toBeLessThan(nonBreakingIndex);
    expect(output).toContain('1 breaking');
    expect(output).toContain('1 warning');
    expect(output).toContain('1 non-breaking');
  });
});

describe('jsonDiff', () => {
  it('round-trips the DiffResult', () => {
    expect(JSON.parse(jsonDiff(RESULT))).toEqual(JSON.parse(JSON.stringify(RESULT)));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/__tests__/serializers.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve serializer modules.

- [ ] **Step 3: Write the serializers**

```ts
// packages/cli/src/commands/diff/serializers/json.ts
import type { DiffResult } from '../engine/types.js';

export function jsonDiff(result: DiffResult): string {
  return JSON.stringify(result, null, 2);
}
```

```ts
// packages/cli/src/commands/diff/serializers/stylish.ts
import { bold, gray, green, red, yellow } from 'colorette';

import type { Change, Compat, DiffResult } from '../engine/types.js';

const SEVERITY_ORDER: Compat[] = ['breaking', 'warning', 'non-breaking'];

const ICONS: Record<Compat, string> = {
  breaking: red('✖ breaking    '),
  warning: yellow('⚠ warning     '),
  'non-breaking': green('✔ non-breaking'),
};

function label(change: Change): string {
  return change.property ? `${change.pointer} · ${change.property}` : change.pointer;
}

export function stylishDiff(result: DiffResult): string {
  const lines: string[] = [];
  const sorted = [...result.changes].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.compat) - SEVERITY_ORDER.indexOf(b.compat) ||
      a.pointer.localeCompare(b.pointer)
  );

  for (const change of sorted) {
    const rule = change.ruleIds?.length ? gray(` (${change.ruleIds.join(', ')})`) : '';
    const message = change.message ? gray(` — ${change.message}`) : '';
    lines.push(`${ICONS[change.compat]}  ${bold(change.kind)}  ${label(change)}${message}${rule}`);
  }

  const { breaking, warning, nonBreaking } = result.summary;
  lines.push(
    '',
    `${red(`${breaking} breaking`)}, ${yellow(`${warning} warning`)}, ${green(
      `${nonBreaking} non-breaking`
    )}.`
  );
  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/__tests__/serializers.test.ts --coverage.enabled=false`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the command handler**

```ts
// packages/cli/src/commands/diff/index.ts
import { writeFileSync } from 'node:fs';

import { bundle, logger } from '@redocly/openapi-core';

import { AbortFlowError, exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { DiffError, diffDocuments } from './engine/index.js';
import { jsonDiff } from './serializers/json.js';
import { stylishDiff } from './serializers/stylish.js';

import type { VerifyConfigOptions } from '../../types.js';
import type { CommandArgs } from '../../wrapper.js';
import type { DiffResult } from './engine/types.js';

export type DiffOutputFormat = 'stylish' | 'json' | 'markdown' | 'html';
export type DiffFailOn = 'breaking' | 'warning' | 'none';

export type DiffArgv = {
  base: string;
  revision: string;
  format: DiffOutputFormat;
  output?: string;
  'fail-on': DiffFailOn;
} & VerifyConfigOptions;

const SERIALIZERS: Record<DiffOutputFormat, (result: DiffResult) => string> = {
  stylish: stylishDiff,
  json: jsonDiff,
  // markdown and html are added in the next task:
  markdown: jsonDiff,
  html: jsonDiff,
};

export async function handleDiff({ argv, config, collectSpecData }: CommandArgs<DiffArgv>) {
  const [{ path: basePath }] = await getFallbackApisOrExit([argv.base], config);
  const [{ path: revisionPath }] = await getFallbackApisOrExit([argv.revision], config);

  const { bundle: baseDocument } = await bundle({ config, ref: basePath });
  const { bundle: revisionDocument } = await bundle({ config, ref: revisionPath });
  collectSpecData?.(revisionDocument.parsed);

  let result: DiffResult;
  try {
    result = diffDocuments({ base: baseDocument, revision: revisionDocument, config });
  } catch (error) {
    if (error instanceof DiffError) {
      return exitWithError(error.message);
    }
    throw error;
  }

  const output = SERIALIZERS[argv.format](result);
  if (argv.output) {
    writeFileSync(argv.output, output);
  } else {
    logger.output(output + '\n');
  }

  const failOn = argv['fail-on'];
  const failed =
    failOn === 'breaking'
      ? result.summary.breaking > 0
      : failOn === 'warning'
        ? result.summary.breaking + result.summary.warning > 0
        : false;
  if (failed) {
    throw new AbortFlowError(
      `Diff failed: ${result.summary.breaking} breaking, ${result.summary.warning} warning change(s) found.`
    );
  }
}
```

**Note:** `logger` is exported from `@redocly/openapi-core` (`packages/core/src/index.ts:129`) and `logger.output(...)` is the stdout channel the `bundle` command uses to print bundled documents (`packages/cli/src/commands/bundle.ts:105`) — verified.

- [ ] **Step 6: Register the command**

In `packages/cli/src/index.ts`, add next to the other imports:

```ts
import { handleDiff, type DiffArgv } from './commands/diff/index.js';
```

Add this `.command(...)` block adjacent to the `stats` registration (same level of the yargs chain):

```ts
  .command(
    'diff <base> <revision>',
    'Compare two API descriptions and detect breaking changes [experimental].',
    (yargs) =>
      yargs
        .env('REDOCLY_CLI_DIFF')
        .positional('base', { type: 'string', demandOption: true })
        .positional('revision', { type: 'string', demandOption: true })
        .option({
          config: { description: 'Path to the config file.', type: 'string' },
          'lint-config': {
            description: 'Severity level for config file linting.',
            choices: ['warn', 'error', 'off'] as ReadonlyArray<RuleSeverity>,
            default: 'warn' as RuleSeverity,
          },
          format: {
            description: 'Use a specific output format.',
            choices: ['stylish', 'json', 'markdown', 'html'] as ReadonlyArray<
              'stylish' | 'json' | 'markdown' | 'html'
            >,
            default: 'stylish' as const,
          },
          output: {
            description: 'Write the diff report to a file.',
            type: 'string',
            alias: 'o',
          },
          'fail-on': {
            description: 'Exit with a non-zero code when changes of this level are found.',
            choices: ['breaking', 'warning', 'none'] as ReadonlyArray<
              'breaking' | 'warning' | 'none'
            >,
            default: 'breaking' as const,
          },
        }),
    (argv) => {
      commandWrapper(handleDiff)(argv);
    }
  )
```

This mirrors exactly how the `stats` registration invokes `commandWrapper(handleStats)(argv)`. If TypeScript complains about the argv type, compare with the `stats` block in the same file and align the option typings (`as ReadonlyArray<...>` / `as const` casts) the same way.

- [ ] **Step 7: Typecheck and run CLI tests**

Run: `npm run typecheck && VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff --coverage.enabled=false`
Expected: no type errors; serializer tests PASS.

- [ ] **Step 8: Smoke-run the command manually**

```bash
cat > /tmp/diff-base.yaml <<'EOF'
openapi: 3.1.0
info: { title: T, version: '1.0' }
paths:
  /pets:
    get:
      responses:
        '200': { description: OK }
EOF
cat > /tmp/diff-rev.yaml <<'EOF'
openapi: 3.1.0
info: { title: T, version: '1.0' }
paths:
  /pets:
    get:
      responses:
        '200': { description: Pets }
EOF
npm run cli -- diff /tmp/diff-base.yaml /tmp/diff-rev.yaml; echo "exit=$?"
npm run cli -- diff /tmp/diff-base.yaml /tmp/diff-base.yaml --format json; echo "exit=$?"
```

Expected: first run prints one non-breaking change + summary, `exit=0`; second prints `"changes": []` JSON, `exit=0`.

- [ ] **Step 9: Commit**

```bash
git add packages/cli/src/commands/diff packages/cli/src/index.ts
git commit -m "feat(cli): add diff command with stylish and json formats"
```

---

### Task 12: Markdown and HTML serializers

**Files:**

- Create: `packages/cli/src/commands/diff/serializers/markdown.ts`
- Create: `packages/cli/src/commands/diff/serializers/html.ts`
- Modify: `packages/cli/src/commands/diff/index.ts` (wire real serializers into `SERIALIZERS`)
- Test: `packages/cli/src/commands/diff/__tests__/serializers-rich.test.ts`

**Interfaces:**

- Produces: `markdownDiff(result: DiffResult): string`, `htmlDiff(result: DiffResult): string`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/cli/src/commands/diff/__tests__/serializers-rich.test.ts
import { htmlDiff } from '../serializers/html.js';
import { markdownDiff } from '../serializers/markdown.js';

import type { DiffResult } from '../engine/types.js';

const RESULT: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 1, warning: 0, nonBreaking: 0 },
  changes: [
    {
      pointer: '#/paths/~1pets/get',
      kind: 'removed',
      typeName: 'Operation',
      base: { pointer: '#/paths/~1pets/get', value: { summary: '<script>x</script>' } },
      compat: 'breaking',
      ruleIds: ['operation-removed'],
      message: 'Operation was removed.',
    },
  ],
};

describe('markdownDiff', () => {
  it('renders a summary and a table row per change', () => {
    const output = markdownDiff(RESULT);
    expect(output).toContain('| Impact | Change | Location | Details |');
    expect(output).toContain('operation-removed');
    expect(output).toContain('`#/paths/~1pets/get`');
    expect(output).toContain('**1** breaking');
  });
});

describe('htmlDiff', () => {
  it('renders a self-contained page with escaped values', () => {
    const output = htmlDiff(RESULT);
    expect(output).toContain('<style>');
    expect(output).toContain('API diff');
    expect(output).toContain('operation-removed');
    // payload content must be escaped:
    expect(output).not.toContain('<script>x</script>');
    expect(output).toContain('&lt;script&gt;');
    // no external resources (self-contained page):
    expect(output).not.toMatch(/src="http|href="http/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff/__tests__/serializers-rich.test.ts --coverage.enabled=false`
Expected: FAIL — cannot resolve serializer modules.

- [ ] **Step 3: Write the implementation**

```ts
// packages/cli/src/commands/diff/serializers/markdown.ts
import type { Change, DiffResult } from '../engine/types.js';

const IMPACT_LABEL: Record<Change['compat'], string> = {
  breaking: '🔴 breaking',
  warning: '🟠 warning',
  'non-breaking': '🟢 non-breaking',
};

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function markdownDiff(result: DiffResult): string {
  const { breaking, warning, nonBreaking } = result.summary;
  const lines = [
    '## API diff',
    '',
    `**${breaking}** breaking · **${warning}** warning · **${nonBreaking}** non-breaking`,
    '',
    '| Impact | Change | Location | Details |',
    '| --- | --- | --- | --- |',
  ];

  for (const change of result.changes) {
    const location = change.property ? `${change.pointer} · ${change.property}` : change.pointer;
    const details = [change.message, change.ruleIds?.map((id) => `\`${id}\``).join(', ')]
      .filter(Boolean)
      .join(' ');
    lines.push(
      `| ${IMPACT_LABEL[change.compat]} | ${change.kind} | \`${escapeCell(location)}\` | ${escapeCell(
        details
      )} |`
    );
  }

  return lines.join('\n');
}
```

```ts
// packages/cli/src/commands/diff/serializers/html.ts
import type { Change, DiffResult } from '../engine/types.js';

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const IMPACT_CLASS: Record<Change['compat'], string> = {
  breaking: 'breaking',
  warning: 'warning',
  'non-breaking': 'ok',
};

function renderChange(change: Change): string {
  const location = change.property ? `${change.pointer} · ${change.property}` : change.pointer;
  const payload = {
    ...(change.base ? { base: change.base } : {}),
    ...(change.revision ? { revision: change.revision } : {}),
  };
  return `
    <details class="change ${IMPACT_CLASS[change.compat]}">
      <summary>
        <span class="badge">${escapeHtml(change.compat)}</span>
        <code>${escapeHtml(change.kind)}</code>
        <code class="loc">${escapeHtml(location)}</code>
        ${change.message ? `<span class="msg">${escapeHtml(change.message)}</span>` : ''}
        ${change.ruleIds ? `<span class="rules">${escapeHtml(change.ruleIds.join(', '))}</span>` : ''}
      </summary>
      <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
    </details>`;
}

export function htmlDiff(result: DiffResult): string {
  const { breaking, warning, nonBreaking } = result.summary;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>API diff</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 2rem auto; max-width: 60rem; padding: 0 1rem; color: #1f2933; }
  h1 { font-size: 1.4rem; }
  .summary span { margin-right: 1rem; font-weight: 600; }
  .change { border: 1px solid #e0e4e8; border-radius: 6px; margin: .5rem 0; padding: .25rem .75rem; }
  .change summary { cursor: pointer; display: flex; gap: .6rem; align-items: baseline; flex-wrap: wrap; }
  .badge { border-radius: 4px; padding: 0 .5rem; font-size: .8rem; color: #fff; }
  .breaking .badge { background: #c0392b; }
  .warning .badge { background: #d68910; }
  .ok .badge { background: #1e8449; }
  .msg { color: #52606d; }
  .rules { color: #9aa5b1; font-size: .85rem; }
  pre { background: #f5f7fa; padding: .75rem; border-radius: 6px; overflow-x: auto; }
  code.loc { word-break: break-all; }
</style>
</head>
<body>
<h1>API diff</h1>
<p class="summary">
  <span style="color:#c0392b">${breaking} breaking</span>
  <span style="color:#d68910">${warning} warning</span>
  <span style="color:#1e8449">${nonBreaking} non-breaking</span>
  <span style="color:#9aa5b1">${escapeHtml(result.specVersions.base)} → ${escapeHtml(
    result.specVersions.revision
  )}</span>
</p>
${result.changes.map(renderChange).join('\n')}
</body>
</html>`;
}
```

Wire them in `packages/cli/src/commands/diff/index.ts` — replace the `SERIALIZERS` constant and add imports:

```ts
import { htmlDiff } from './serializers/html.js';
import { markdownDiff } from './serializers/markdown.js';

const SERIALIZERS: Record<DiffOutputFormat, (result: DiffResult) => string> = {
  stylish: stylishDiff,
  json: jsonDiff,
  markdown: markdownDiff,
  html: htmlDiff,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff --coverage.enabled=false && npm run typecheck`
Expected: all serializer tests PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/diff
git commit -m "feat(cli): add markdown and html diff formats"
```

---

### Task 13: E2E snapshot tests, docs page, changeset

**Files:**

- Create: `tests/e2e/diff/breaking-changes/base.yaml`
- Create: `tests/e2e/diff/breaking-changes/revision.yaml`
- Create: `tests/e2e/diff/diff.test.ts`
- Create: `docs/@v2/commands/diff.md`
- Create: `.changeset/diff-command.md`

- [ ] **Step 1: Create the e2e fixtures**

```yaml
# tests/e2e/diff/breaking-changes/base.yaml
openapi: 3.1.0
info:
  title: Diff E2E
  version: '1.0'
paths:
  /pets:
    get:
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
    delete:
      responses:
        '204':
          description: Deleted
components:
  schemas:
    Pet:
      type: object
      required: [name]
      properties:
        name:
          type: string
        tag:
          type: string
```

```yaml
# tests/e2e/diff/breaking-changes/revision.yaml
openapi: 3.1.0
info:
  title: Diff E2E
  version: '2.0'
paths:
  /pets:
    get:
      parameters:
        - name: limit
          in: query
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet:
      type: object
      required: [name]
      properties:
        name:
          type: string
```

- [ ] **Step 2: Write the e2e test**

```ts
// tests/e2e/diff/diff.test.ts
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCommandOutput, getParams, cleanupOutput } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('diff', () => {
  const testPath = join(__dirname, 'breaking-changes');

  test('stylish output', async () => {
    const args = getParams(indexEntryPoint, ['diff', 'base.yaml', 'revision.yaml']);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'stylish-snapshot.txt'));
  });

  test('json output', async () => {
    const args = getParams(indexEntryPoint, [
      'diff',
      'base.yaml',
      'revision.yaml',
      '--format=json',
    ]);
    const result = getCommandOutput(args, { testPath });
    await expect(cleanupOutput(result)).toMatchFileSnapshot(join(testPath, 'json-snapshot.txt'));
  });

  test('exits 1 on breaking changes with default fail-on', () => {
    const result = spawnSync('node', [indexEntryPoint, 'diff', 'base.yaml', 'revision.yaml'], {
      encoding: 'utf-8',
      cwd: testPath,
      env: { ...process.env, NO_COLOR: 'TRUE' },
    });
    expect(result.status).toBe(1);
  });

  test('exits 0 with --fail-on=none', () => {
    const result = spawnSync(
      'node',
      [indexEntryPoint, 'diff', 'base.yaml', 'revision.yaml', '--fail-on=none'],
      { encoding: 'utf-8', cwd: testPath, env: { ...process.env, NO_COLOR: 'TRUE' } }
    );
    expect(result.status).toBe(0);
  });

  test('exits 0 when comparing a file to itself', () => {
    const result = spawnSync('node', [indexEntryPoint, 'diff', 'base.yaml', 'base.yaml'], {
      encoding: 'utf-8',
      cwd: testPath,
      env: { ...process.env, NO_COLOR: 'TRUE' },
    });
    expect(result.status).toBe(0);
  });
});
```

- [ ] **Step 3: Compile the CLI and run the e2e tests (snapshots are created on first run)**

Run: `npm run compile && VITEST_SUITE=e2e npx vitest run tests/e2e/diff`
Expected: 5 tests PASS; `stylish-snapshot.txt` and `json-snapshot.txt` created in `tests/e2e/diff/breaking-changes/`.

**Review the created snapshots before committing.** The stylish snapshot must show (a) the removed `delete` operation as breaking, (b) `limit` became required as breaking, (c) removal of the `tag` property of the response-only `Pet` schema as breaking (`property-removed-from-response` — this exercises the usage index), (d) the `info.version` change as non-breaking. If any expectation is off, debug the corresponding engine layer first (collect → compare → classify), not the snapshot.

- [ ] **Step 4: Write the docs page**

Open `docs/@v2/commands/stats.md` first and mirror its front-matter/heading conventions exactly (including how admonitions/notes are written in this docs set). Content for `docs/@v2/commands/diff.md`:

````markdown
# diff

The `diff` command is **experimental**: its output formats and rule ids may change in future releases.

Compares two API descriptions and reports what was added, removed, and changed. For OpenAPI 3.x, changes are classified as breaking, warning, or non-breaking.

## Usage

```bash
redocly diff <base> <revision>
redocly diff v1/openapi.yaml v2/openapi.yaml
redocly diff https://example.com/openapi.yaml openapi.yaml --format=json
redocly diff main@v1 main@v2 --fail-on=warning
```
````

## Options

| Option        | Type    | Description                                                                                                                           |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| base          | string  | **REQUIRED.** Path, URL, or config alias of the base (older) API description.                                                         |
| revision      | string  | **REQUIRED.** Path, URL, or config alias of the revision (newer) API description.                                                     |
| --config      | string  | Specify path to the [configuration file](../configuration/index.md).                                                                  |
| --fail-on     | string  | Exit with code `1` when changes at this level are found. Possible values: `breaking`, `warning`, `none`. Default value is `breaking`. |
| --format      | string  | Format for the output. Possible values: `stylish`, `json`, `markdown`, `html`. Default value is `stylish`.                            |
| --help        | boolean | Show help.                                                                                                                            |
| --lint-config | string  | Severity level for config file linting. Possible values: `warn`, `error`, `off`. Default value is `warn`.                             |
| --output, -o  | string  | Write the report to a file instead of stdout.                                                                                         |
| --version     | boolean | Show version number.                                                                                                                  |

## How it works

- Both descriptions are bundled, so external `$ref`s are resolved before comparison.
- List items with a natural identity (for example, parameters keyed by `in` + `name`) are matched by identity, so reordering them is not reported as a change.
- Changes to shared components are reported once, at the component location; whether a component change is breaking is derived from where the component is used (requests, responses, or both).
- Changes the tool detects but cannot judge automatically (for example, a `$ref` that now points to a different target) are reported as `warning`.
- Structural comparison works for all supported specification types; breaking-change classification applies to OpenAPI 3.x.

The `diff` command detects common breaking changes; it is not an exhaustive detector. Comparing documents of different specification families (for example, OpenAPI 2.0 vs OpenAPI 3.1) is not supported.

## Breaking change rules

| Rule id                          | Description                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `operation-removed`              | Removing an operation breaks all of its consumers.                                                                       |
| `path-removed`                   | Removing a path breaks all consumers of its operations.                                                                  |
| `parameter-removed`              | Removing a request parameter breaks clients that send it.                                                                |
| `parameter-added-required`       | Adding a new required parameter breaks clients that do not send it.                                                      |
| `parameter-became-required`      | Marking an existing request parameter as required breaks clients that omit it.                                           |
| `schema-type-changed`            | Narrowing a type restricts what clients may send; widening restricts what they can rely on receiving.                    |
| `enum-values-removed`            | Removing enum values restricts what clients may send.                                                                    |
| `enum-values-added`              | Adding enum values to response data may send clients values they never handled.                                          |
| `required-properties-added`      | Requiring new request properties breaks clients that do not send them.                                                   |
| `required-properties-removed`    | Un-requiring response properties breaks clients that rely on their presence.                                             |
| `property-removed-from-response` | Removing a response property breaks clients that read it.                                                                |
| `response-removed`               | Removing a response breaks clients that handle it.                                                                       |
| `media-type-removed`             | Removing a media type breaks clients that produce or consume it.                                                         |
| `ref-target-changed`             | A `$ref` now points to a different target; content equivalence cannot be verified automatically (reported as `warning`). |

## Examples

### Fail a CI pipeline on breaking changes

```bash
redocly diff main-openapi.yaml pr-openapi.yaml
# exit code 1 when breaking changes are found
```

### Generate an HTML report

```bash
redocly diff v1.yaml v2.yaml --format=html -o diff-report.html
```

````

- [ ] **Step 5: Add the docs page to the sidebar if commands are listed there**

Run: `grep -n "stats" docs/sidebars.yaml`
If command pages are listed in `docs/sidebars.yaml`, add a `diff` entry next to the `stats` entry, mirroring its format exactly. If `stats` is not listed there, skip this step.

- [ ] **Step 6: Create the changeset**

Only `@redocly/cli` is bumped — `packages/core` is untouched. Content of `.changeset/diff-command.md` (the file starts directly with the `---` front matter):

```markdown
---
'@redocly/cli': minor
---

Added the experimental `diff` command that compares two API descriptions and reports added, removed, and changed parts, with breaking-change classification for OpenAPI 3.x. Supports `stylish`, `json`, `markdown`, and `html` output formats and a `--fail-on` CI gate.
````

- [ ] **Step 7: Run the full verification**

Run: `npm run typecheck && VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff --coverage.enabled=false && VITEST_SUITE=e2e npx vitest run tests/e2e/diff`
Expected: everything PASSES.

- [ ] **Step 8: Commit**

```bash
git add tests/e2e/diff docs/@v2/commands/diff.md .changeset/diff-command.md
git commit -m "test(cli): add diff e2e snapshots, docs page, and changeset"
```

---

## Final verification (after all tasks)

1. `npm run typecheck` — clean.
2. `VITEST_SUITE=unit npx vitest run packages/cli/src/commands/diff --coverage.enabled=false` — all green.
3. `npm run compile && VITEST_SUITE=e2e npx vitest run tests/e2e/diff` — all green.
4. Manual sanity: `npm run cli -- diff tests/e2e/diff/breaking-changes/base.yaml tests/e2e/diff/breaking-changes/revision.yaml --format html -o /tmp/report.html` and open `/tmp/report.html`.
5. Confirm the spec's §12 limitations are documented in `docs/@v2/commands/diff.md` (rename blindness, coverage positioning, experimental status).
6. **Isolation check:** `git diff main --name-only | grep '^packages/core'` must print NOTHING — `packages/core` is untouched.
