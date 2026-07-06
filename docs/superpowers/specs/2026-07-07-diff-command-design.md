# `redocly diff` — Design

- **Date:** 2026-07-07
- **Status:** Approved for implementation planning
- **Scope:** New **experimental** CLI command that compares two API descriptions and reports structural changes, with breaking-change classification for OpenAPI 3.x. The entire engine lives inside the CLI package; nothing is added to `@redocly/openapi-core`.

## 1. Goals

1. Compare two versions of an API description and report what was added, removed, and changed.
2. Structural diff works for **every** spec the CLI supports (OpenAPI 2/3.0/3.1/3.2, AsyncAPI 2/3, Arazzo, Overlay, OpenRPC) by reusing the existing type trees.
3. Classify changes as `breaking` / `warning` / `non-breaking` for OpenAPI 3.x.
4. Output formats: `stylish` (terminal, default), `json` (stable, versioned), `markdown` (PR comments), `html` (self-contained page).
5. CI gate: non-zero exit code via `--fail-on`.
6. Fit the repo's architecture: reuse `bundle`, `detectSpec`, type trees, `walkDocument`; rules follow the lint-rule idiom; no second rule framework.
7. **Isolation:** the whole diff engine ships inside `packages/cli` and consumes ONLY the existing public `@redocly/openapi-core` API — no new core exports, no core changes.
8. **Experimental status:** the command is marked `[experimental]` (same convention as `join`); output formats and rule ids may change while it stabilizes.

### Non-goals (v1)

- Git revisions as inputs (`HEAD~1:openapi.yaml`) — users run `git show` themselves.
- Rename/move detection (component renamed with identical content reads as removed+added).
- Breaking rules for non-OpenAPI specs (structural diff still works; everything is `non-breaking`).
- Rule severity configuration via `redocly.yaml` (rule ids are stable so this can be added later on the existing rules/severity model).
- ajv witness escalation (validating base examples against revision schemas to upgrade `warning` verdicts with evidence).
- Semantic normalization across minor versions (`nullable: true` vs `type: [..., 'null']`).

## 2. CLI

```
redocly diff <base> <revision>                   [experimental]
  --format   stylish | json | markdown | html    (default: stylish)
  --output -o <file>
  --fail-on  breaking | warning | none           (default: breaking)
  --config   <path>
```

- Each side is a `ref` string resolved by the existing infrastructure (`getFallbackApisOrExit`, `BaseResolver`): local file path, `http(s)://` URL, or an alias from the `apis:` block of `redocly.yaml`. Sides resolve independently (file vs URL is fine).
- **Version guard:** different major spec families (e.g. `oas2` vs `oas3`, `oas3` vs `async2`) → clear error. Same family, different minor (3.0 vs 3.1) → allowed, with a warning about known syntactic noise.
- Exit code: `--fail-on breaking` → 1 when `summary.breaking > 0`; `--fail-on warning` → 1 when `breaking + warning > 0`; `none` → always 0 (unless the command itself fails).

## 3. Pipeline

```
 [1] input   ×2    BaseResolver: file / URL / alias
 [2] bundle  ×2    existing bundle() + detectSpec(); EACH side uses ITS OWN type tree
 [3] collect ×2    walkDocument → Map<stablePointer, NodeEntry> + usage edges
 [4] compare       two passes over the union of keys → Change[]
 [5] classify      polarity engine + per-type rule registry → compat
 [6] report        4 serializers from one DiffResult; exit code
```

The whole engine (stages 3–5) lives in `packages/cli/src/commands/diff/engine/`; the command and serializers live in `packages/cli/src/commands/diff/`. `packages/core` is not modified — the engine consumes only the existing public `@redocly/openapi-core` API (`walkDocument`, `normalizeVisitors`, `normalizeTypes`, `detectSpec`, `getMajorSpecVersion`, `getTypes`, `isRef`, `isPlainObject`, `bundle`, `logger`, and their types).

## 4. Data contracts

```ts
interface NodeEntry {
  pointer: string; // stable matching key: …/parameters/{query:limit}
  realPointer: string; // actual JSON Pointer in THIS document: …/parameters/1
  parentPointer: string | null; // derived from the pointer STRING (not the walk stack)
  typeName: string; // from this side's type tree
  scalars: Record<string, unknown>; // shallow primitives (+ scalar arrays: enum, required)
  refs: Record<string, string>; // $ref-valued properties, recorded as attributes
  raw: unknown; // the raw node value — subtree payload for added/removed changes
}

type Compat = 'breaking' | 'warning' | 'non-breaking';
// warning = "potentially breaking; cannot be verified automatically"

interface ChangeSide {
  pointer: string; // real JSON Pointer in this document
  value?: unknown; // value / subtree on this side
}

interface Change {
  pointer: string; // ONE stable node pointer — the change's identity
  property?: string; // set for property-level changes
  kind: 'added' | 'removed' | 'changed';
  typeName: string;
  base?: ChangeSide; // absent for added
  revision?: ChangeSide; // absent for removed
  compat: Compat; // filled by the classifier
  ruleIds?: string[]; // all rules that produced a verdict (worst wins)
  message?: string; // message of the most severe verdict
}

interface DiffResult {
  version: '1'; // output schema version; stability is promised once the command leaves experimental
  specVersions: { base: string; revision: string };
  summary: { breaking: number; warning: number; nonBreaking: number };
  changes: Change[];
}
```

## 5. Collection (stage 3)

One generic visitor (`any.enter`) on the existing `walkDocument`, run once per side. All the "intelligence" of the system lives here:

1. **Stable pointers.** Array indexes are replaced by keys from a small **identity registry**: `Parameter → in+name`, `Server → url`, `Tag → name`, `SecurityRequirement → scheme names`. Key collision → deterministic `#2` suffix.
2. **Positional fallback.** Combinator lists (`allOf`/`oneOf`/`anyOf`) and unknown lists match by index. Rationale: an edit to a subschema (common) yields a clean nested diff; a reorder (rare) yields noise. No content-hash strategy in v1 — predictability over cleverness. The matching strategy is a per-list-type property of the registry, so a two-phase strategy can be added later without touching `compare`.
3. **`$ref` is a scalar.** External refs are inlined by `bundle`; internal refs are recorded in `refs` as node attributes and are **not** followed. Component content is diffed once, at its canonical `#/components/...` path. This also sidesteps `walkDocument`'s per-type deduplication (`seenNodesPerType`).
4. **Usage index.** While collecting, record edges "ref site → target" from both sides (union). Used by the classifier to derive polarity for components (transitively, cycle-safe).
5. **Dual pointers.** `realPointer` (this side's actual JSON Pointer) is stored next to the stable `pointer`.
6. **Own type tree per side.** A 3.0 document is collected with the 3.0 tree. Type names align across 3.x trees, so matching works; where trees genuinely diverge, removed+added is the honest answer.
7. `parentPointer` is derived by trimming the last segment of the stable pointer string. (The walk stack is wrong for the first visit of a component reached via a ref site.)

## 6. Compare (stage 4)

Dumb and mechanical — two passes over the union of keys, O(N+M):

```
Pass 1 (boundaries):  find removed-roots, added-roots,
                      and replaced nodes (present in both, typeName differs)
Pass 2 (emission):
  • removed/added root (parent present in BOTH maps) → one Change carrying the
    whole subtree as payload; descendants stay silent
  • any key with a boundary ancestor (walk up parentPointer, O(depth)) → silent
  • replaced → a removed+added pair at the same pointer; descendants suppressed
  • matched node → shallow diff of scalars ∪ refs → property-level 'changed'
```

No node statuses, no tree structure, no `modified` propagation: unchanged nodes emit nothing; serializers group by sorting on `pointer`.

For property-level changes (`property` set, kind `'changed'`) both `base` and `revision` sides are present — the node exists on both sides; `value` is `undefined` on the side where the property is absent (e.g. a property that first appears in the revision).

## 7. Classification (stage 5)

### 7.1 Polarity — computed once by the engine

The axis every compatibility judgment depends on: is the change on the **request** side (client → server) or **response** side (server → client)? Rules are mirrored (contravariance/covariance):

| Schema change            | in request | in response |
| ------------------------ | ---------- | ----------- |
| property became required | breaking   | safe        |
| property removed         | safe       | breaking    |
| type narrowed            | breaking   | safe        |
| enum shrunk              | breaking   | safe        |

```
segments contain 'responses'                 → response
segments contain 'parameters'|'requestBody'  → request
under callbacks / webhooks                   → neutral   (direction is inverted there;
                                               v1 honestly does not judge; the future fix
                                               is polarity inversion in this same function)
path under components                        → derived from the usage index (transitively):
                                               request | response | both | neutral (unused)
everything else (info, tags, servers…)       → neutral
```

`both` polarity: the change is judged under each polarity; the **worst verdict wins**.

### 7.2 Rules — lint-visitor idiom (Decision: variant B, see §13)

```ts
interface DiffRule {
  id: string; // stable — future config severity, docs catalog
  description: string;
  visit(change: Change, ctx: RuleContext): Verdict | undefined;
}

interface RuleContext {
  polarity: Polarity;
  specVersion: SpecVersion;
  base(pointer: string): NodeEntry | undefined; // look up neighboring nodes
  revision(pointer: string): NodeEntry | undefined;
}

// registry keyed by typeName — same mental model as lint visitors
export const oas3Rules: Record<string, DiffRule[]> = {
  Operation: [operationRemoved],
  Parameter: [parameterRemoved, parameterAddedRequired, parameterBecameRequired],
  Schema: [schemaTypeChanged, enumChanged, requiredChanged, propertyRemoved],
  Response: [responseRemoved],
  MediaType: [mediaTypeRemoved],
};
```

Example rule — guards are 1–2 lines because the registry already filtered by type:

```ts
export const parameterBecameRequired: DiffRule = {
  id: 'parameter-became-required',
  description: 'Marking an existing request parameter as required breaks clients that omit it',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'request') return;
    if (change.revision?.value === true) return breaking('Parameter became required');
  },
};
```

**Verdict policy: no first-match-wins.** The engine evaluates **all** rules registered for the change's type, collects every verdict, and keeps the most severe (`breaking > warning > non-breaking`). All firing `ruleIds` are attached. Registration order carries no semantics.

Anything no rule judges → `non-breaking` (safe default). No registry for a spec (AsyncAPI, Arazzo, …) → structural diff only.

Registries are per spec version; `oas3_1Rules` extends `oas3Rules` and overrides pointwise — same pattern as the type trees.

Shared **predicate helpers** (`narrowed`, `missingItems`, `becameTrue`, …) live in `predicates.ts` as pure, unit-tested functions reused by rules.

**Model scope:** rules judge **one change at a time** (with document context via `ctx.base()/revision()`). Correlation judgments across changes (rename detection, "removed here + added there") do not fit this model and are deliberately deferred to a future post-pass hook.

### 7.3 Starter rule set (initial, not exhaustive)

`operation-removed`, `path-removed`, `parameter-removed`, `parameter-added-required`, `parameter-became-required`, `schema-type-changed` (narrowed in request / widened in response), `enum-values-removed` (request), `enum-values-added` (response), `required-properties-added` (request), `required-properties-removed` (response), `property-removed` (response), `response-removed`, `media-type-removed`, `ref-target-changed` (→ `warning`: content equivalence cannot be verified by pointer-aligned comparison).

Note: there is deliberately no `parameter-in-changed` rule — the identity key is `in+name`, so a changed `in` surfaces as a removed+added pair, already judged breaking by `parameter-removed`.

The rule catalog (id + description) is generated into the docs — same honesty format as coverage tables.

## 8. Reporting (stage 6)

All four serializers consume one `DiffResult`:

- **stylish** (default): groups by shared pointer prefix, `colorette` colors, ordered breaking → warning → non-breaking, summary line.
- **json**: `DiffResult` as-is; the schema is versioned and validated in tests with the repo's existing ajv.
- **markdown**: a table suitable for PR comments.
- **html**: self-contained page (inline CSS/JS, no external requests), collapsible groups, filter by compat.

Large `before/after` payloads (e.g. `example` objects, whole subtrees) are truncated in human-oriented formats; `json` carries them in full.

## 9. Errors

- Different major spec families → immediate, explicit error.
- Invalid/missing inputs → existing `getFallbackApisOrExit` behavior.
- Unresolvable external refs → existing bundle/resolver errors, reported per side.

## 10. File layout

```
packages/cli/src/commands/diff/
  index.ts            # handleDiff: resolve sides, call the engine, serialize, exit code
  engine/             # self-contained; imports ONLY public @redocly/openapi-core API
    index.ts          # diffDocuments() orchestrator, DiffError
    types.ts          # NodeEntry, Change, DiffResult, Compat, DiffRule
    output-schema.ts  # versioned JSON Schema for the json format
    predicates.ts     # narrowed, missingItems, becameTrue, …
    node-identity.ts  # identity registry + positional fallback
    collect.ts        # generic visitor → Map + usage edges
    compare.ts        # two-pass comparison
    classify/
      index.ts        # engine: polarity + registry dispatch + worst-wins
      polarity.ts
      usage.ts        # usage index, transitive polarity for components
      oas3.ts         # rule registry
      oas3_1.ts       # extends oas3
      rules/          # rule modules (lint-rule idiom)
    __tests__/
  serializers/
    stylish.ts  json.ts  markdown.ts  html.ts
  __tests__/

docs/@v2/commands/diff.md
```

`packages/core` is not touched. Promotion of the engine into `@redocly/openapi-core` is a future step, taken only once the command leaves experimental status — the module is self-contained over core's public API, so the move is mechanical.

## 11. Implementation order (each step is a testable layer)

1. `types.ts` + `predicates.ts` + `node-identity.ts` — pure units.
2. `collect.ts` — fixtures: identity keys, collisions, refs-as-scalars, dual pointers, usage edges.
3. `compare.ts` — reorders, subtree collapse, **replaced fixture with a polymorphic node**.
4. `classify/` — polarity (incl. components via usage, `both`, callbacks→neutral), engine policy, starter rules.
5. CLI command + `stylish` + `json` → first end-to-end snapshot test.
6. `markdown` + `html` + `--fail-on` + docs page + changeset.

Testing: unit tests per layer and per rule (a rule test feeds a hand-built `Change`); e2e snapshot tests on fixture pairs for every format (repo's vitest snapshot pattern); ajv validation of `json` output against the published schema.

## 12. Known limitations (v1)

1. **Positioning:** "detects common breaking changes" with a documented rule catalog — not an exhaustive detector (oasdiff has hundreds of checks refined over years).
2. **Move blindness:** renaming a component = removed + added + `warning` on ref changes.
3. Reordering combinator subschemas produces noise (positional matching).
4. `readOnly`/`writeOnly` do not refine polarity; `both` is coarse (worst-of-both).
5. Reorder of identity-keyed lists is invisible; `servers` order is semantic → backlog: `orderSensitive` flag in the registry.
6. Cross-minor comparisons carry syntactic noise (`nullable` vs `type: [null]`).
7. Callbacks/webhooks are `neutral`: structural diff only, no polarity judgments.

## 13. Alternatives considered (decision log)

### Rule form (the classification layer)

- **(1) Flat matcher array** — functions parsing paths themselves (`segments.includes('parameters')`). Rejected: context logic duplicated and drifting across every matcher.
- **(2) Declarative matrix / DSL** — nested data table (`props.enum.shrunk.request`) + generic interpreter. Rejected: ~30% of real rules need escape-hatch functions anyway (leaky DSL), debugging goes through a meta-level, deep literals type poorly. Its valuable halves survive: predicates as a helper library; declarative _user-facing_ configuration returns later as YAML over stable rule ids (same pattern as lint's configurable rules/assertions).
- **(3) Selector + verdict** — `on: {type, kind, property, polarity}` + judgment function; engine pre-filters. Viable, best at 100+ rules; rejected _for v1_: introduces matching semantics new to this repo (conflict policy, selector freeze discipline) — overhead paid before the scale exists. **Migration from B is mechanical** (guards → selector); the trigger is recorded: "rules > ~50 or guard boilerplate hurts".
- **(4) B: lint-visitor idiom — CHOSEN.** `{id, description, visit}` objects in `Record<typeName, DiffRule[]>`. Matches how every lint rule in this repo is already written; structural ids/descriptions; per-rule unit tests; worst-wins policy removes ordering semantics.
- **(5) One classifier module per spec (switch)** — simplest possible; rejected: ids become scattered string literals, docs catalog must be maintained by hand, single file becomes a merge-conflict magnet as rules grow.
- **(6) Set-theoretic schema comparison** (Atlassian `json-schema-diff` / `openapi-diff`) — theoretically ideal (schemas as sets of accepted documents; breaking = removed set in requests / added set in responses — which independently validates our polarity model). Rejected with evidence: keyword coverage collapses under the set algebra (their own tables: no `enum`, no `pattern`, no `format`; `servers`/`security`/`callbacks` not compared at all) and both projects are dormant. Their three-way classification and two-sided entity details (source/destination location+value) independently validate our `Compat` and `ChangeSide` designs.
- **(7) Variance annotations inside the type trees** — would couple diff semantics into the shared core that lint/bundle/docs depend on. Rejected.

### Comparison engine

- **Diff tree with node statuses** (added/removed/modified/replaced/unchanged + bottom-up propagation) — rejected as over-engineering: `unchanged` exists only to be pruned, `modified` propagation is recomputable by sorting pointers, `replaced` reduces to a removed+added pair. Flat maps + two-pass iteration deliver the same output with one data structure.
- **"Collect only breaking-relevant data, mismatch = error"** — rejected: breaking-ness is directional (an added endpoint is a mismatch but safe), the full diff report is a product requirement, and the "what is breaking-relevant" filter is the same domain knowledge relocated into a worse place.
- **Generic diff libraries** (`fast-json-patch`, `deep-diff`, `microdiff`) — rejected: positional on arrays (kills identity matching), no `typeName` attribution (kills rule dispatch), no `$ref` policy. They would replace the easy 50 lines and none of the hard parts.
- **walkDocument reuse vs custom lockstep traversal** — walkDocument CHOSEN: it already handles ref resolution, `ResolveTypeFn` polymorphism, `directResolveAs`, extensions; a custom traversal would duplicate and drift.

### Other decisions

- **Bundle then compare effective contract** (vs keeping files separate): chosen for reliability and infra reuse; internal refs are still compared component-wise via refs-as-scalars.
- **`warning` as a third compat level**: honest bucket for "cannot verify automatically" (ref retargets). Mirrors industry practice (oasdiff WARN, Atlassian `unclassified`).
- **ajv**: not usable for the core compare (validates instances against schemas, not schemas against schemas). Used in v1 only to validate our own JSON output schema in tests. Witness escalation (validating base examples against revision schemas to upgrade warnings with evidence) → future work.
- **Git refs input** → deferred; **rule severity via redocly.yaml** → deferred (ids are stable, lands on the existing rules/severity model — one rule system in the product).
- **Engine location: CLI package vs openapi-core — CLI CHOSEN.** The command is experimental; keeping the engine inside `packages/cli` avoids expanding core's public API surface before the model stabilizes. The engine consumes only core's public API, so promoting it into core later is a mechanical move, not a rewrite.

## 14. Future work

Deprecation/sunset semantics (removal of a deprecated-past-sunset operation is not breaking) · ignore/approval mechanism for legalizing known changes · endpoint-attribution view derived from the usage index ("affected operations") · extensible-enum semantics for response enums · rename detection via content matching · recursive subtree comparison for ref retargets (re-key both prefixes, reuse `compare()`) · ajv witness escalation with counterexample messages · polarity inversion for callbacks/webhooks · `orderSensitive` lists · cross-minor semantic normalization · git revision inputs · selector-form rules refactor at scale · YAML-configurable severities over stable rule ids · promotion of the engine into `@redocly/openapi-core` once the command leaves experimental status.
