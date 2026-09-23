import { defaultDiffRules } from '../../config/diff-recommended.js';
import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';
import { handlersOf, initDiffRules, judgeChanges, matches } from '../detect.js';
import { oas3Rules } from '../rules/index.js';
import { oas3Spec } from '../specs/oas3.js';
import type { Change, DiffRule, Impact, Pair } from '../types.js';
import { pairsOfTree, treeOf, usageOfTree } from './tree.js';

const source = new Source('api.yaml', '');
const defaults: Record<string, Impact | 'off'> = defaultDiffRules;
const defaultImpact = (ruleId: string) => defaults[ruleId] ?? 'off';
const at = (pointer: string) => new Location(source, pointer);

const lonePair = (type: string, location: Location): Pair => {
  const key = location.pointer.slice(location.pointer.lastIndexOf('/') + 1);
  const node = { type, key, location, value: {}, parent: null, children: [] };
  return { base: node, revision: node, parent: null, children: [], occurrence: 1 };
};

// Nothing references anything: every direction comes from the node's own position.
const unlinked = { fromUsage: () => 'neutral' as const };

// What every finding passes through: which visitors run, what a report becomes, and how the
// same finding under two directions is kept once. The rules themselves are covered by tests/e2e/diff.
describe('detectBreakingChanges', () => {
  it('leaves a change no rule reports on patch with no verdicts', () => {
    const changes: Change[] = [
      {
        key: '#/info',
        kind: 'modified',
        property: 'title',
        pair: lonePair('Info', at('#/info')),
        base: { location: at('#/info/title'), value: 'a' },
        revision: { location: at('#/info/title'), value: 'b' },
      },
    ];

    const [change] = judgeChanges({
      changes,
      specVersion: 'oas3_1',
      spec: oas3Spec,
      ruleSets: [oas3Rules],
      impactOf: defaultImpact,
      ...unlinked,
    });

    expect(change.impact).toBe('patch');
    expect(change.verdicts).toEqual([]);
  });

  it('judges nothing for a specification without rules', () => {
    const changes: Change[] = [
      {
        key: '#/x',
        kind: 'removed',
        pair: lonePair('Operation', at('#/x')),
        base: { location: at('#/x'), value: {} },
      },
    ];

    const [change] = judgeChanges({
      changes,
      specVersion: 'async2',
      ruleSets: [oas3Rules],
      impactOf: defaultImpact,
      ...unlinked,
    });

    expect(change.impact).toBe('patch');
  });

  it('stamps the rule id on a report and defaults its location to the display side', () => {
    const changes: Change[] = [
      {
        key: '#/paths/~1x/delete',
        kind: 'removed',
        pair: lonePair('Operation', at('#/paths/~1x/delete')),
        base: { location: at('#/paths/~1x/delete'), value: {} },
      },
    ];

    const [change] = judgeChanges({
      changes,
      specVersion: 'oas3_1',
      spec: oas3Spec,
      ruleSets: [oas3Rules],
      impactOf: defaultImpact,
      ...unlinked,
    });

    expect(change.impact).toBe('major');
    expect(change.verdicts).toEqual([
      {
        ruleId: 'operation-removed',
        impact: 'major',
        message: 'Operation was removed.',
        location: at('#/paths/~1x/delete'),
      },
    ]);
  });

  it('visits a component used in a request and a response once per direction, keeping each finding once', () => {
    const entries = treeOf(`
      #/ Root
      #/paths Paths
      #/paths/~1x PathItem
      #/paths/~1x/get Operation
      #/paths/~1x/get/parameters ParameterList
      #/paths/~1x/get/parameters/{query:q} Parameter
      #/paths/~1x/get/parameters/{query:q}/schema Schema
      #/paths/~1x/get/responses Responses
      #/paths/~1x/get/responses/200 Response
      #/paths/~1x/get/responses/200/content MediaTypesMap
      #/paths/~1x/get/responses/200/content/application~1json MediaType
      #/paths/~1x/get/responses/200/content/application~1json/schema Schema
      #/components Components
      #/components/schemas NamedSchemas
      #/components/schemas/Shared Schema
    `);
    const fromUsage = usageOfTree(
      entries,
      [
        ['#/paths/~1x/get/parameters/{query:q}/schema', '#/components/schemas/Shared'],
        [
          '#/paths/~1x/get/responses/200/content/application~1json/schema',
          '#/components/schemas/Shared',
        ],
      ],
      oas3Spec
    );
    const changes: Change[] = [
      {
        key: '#/components/schemas/Shared',
        kind: 'modified',
        property: 'enum',
        pair: pairsOfTree(entries).get(entries.get('#/components/schemas/Shared')!)!,
        base: { location: at('#/components/schemas/Shared/enum'), value: ['a', 'b'] },
        revision: { location: at('#/components/schemas/Shared/enum'), value: ['a', 'c'] },
      },
    ];

    const [change] = judgeChanges({
      changes,
      specVersion: 'oas3_1',
      spec: oas3Spec,
      fromUsage,
      ruleSets: [oas3Rules],
      impactOf: defaultImpact,
    });

    expect(change.verdicts.map((verdict) => verdict.ruleId)).toEqual([
      'enum-values-added',
      'enum-values-removed',
    ]);
  });

  it('defaults an unjudged addition to minor and an unjudged modification to patch', () => {
    const changes: Change[] = [
      {
        key: '#/tags/{pets}',
        kind: 'added',
        pair: lonePair('Tag', at('#/tags/0')),
        revision: { location: at('#/tags/0'), value: {} },
      },
      {
        key: '#/info',
        kind: 'modified',
        property: 'title',
        pair: lonePair('Info', at('#/info')),
        base: { location: at('#/info/title'), value: 'a' },
        revision: { location: at('#/info/title'), value: 'b' },
      },
    ];

    const [added, modified] = judgeChanges({
      changes,
      specVersion: 'oas3_1',
      spec: oas3Spec,
      ruleSets: [oas3Rules],
      impactOf: defaultImpact,
      ...unlinked,
    });

    expect(added.impact).toBe('minor');
    expect(modified.impact).toBe('patch');
  });

  it('stamps the configured impact on a verdict and skips a rule set to off', () => {
    const changes: Change[] = [
      {
        key: '#/paths/~1x/delete',
        kind: 'removed',
        pair: lonePair('Operation', at('#/paths/~1x/delete')),
        base: { location: at('#/paths/~1x/delete'), value: {} },
      },
    ];

    const [minor] = judgeChanges({
      changes,
      specVersion: 'oas3_1',
      spec: oas3Spec,
      ruleSets: [oas3Rules],
      impactOf: (ruleId: string) => (ruleId === 'operation-removed' ? 'minor' : 'off'),
      ...unlinked,
    });
    const [off] = judgeChanges({
      changes,
      specVersion: 'oas3_1',
      spec: oas3Spec,
      ruleSets: [oas3Rules],
      impactOf: () => 'off' as const,
      ...unlinked,
    });

    expect(minor.impact).toBe('minor');
    expect(minor.verdicts[0].impact).toBe('minor');
    expect(off.impact).toBe('patch');
    expect(off.verdicts).toEqual([]);
  });
});

// The tree the walker was probed with: a nested key must pick the members of a `properties`
// map and nothing that merely sits somewhere below one.
const schemaTree = treeOf(`
  #/ Root
  #/components Components
  #/components/schemas NamedSchemas
  #/components/schemas/Pet Schema
  #/components/schemas/Pet/properties SchemaProperties
  #/components/schemas/Pet/properties/name Schema
  #/components/schemas/Pet/properties/owner Schema
  #/components/schemas/Pet/properties/owner/oneOf OneOf
  #/components/schemas/Pet/properties/owner/oneOf/0 Schema
  #/components/schemas/Pet/properties/owner/oneOf/0/properties SchemaProperties
  #/components/schemas/Pet/properties/owner/oneOf/0/properties/login Schema
  #/components/schemas/Pet/properties/tags Schema
  #/components/schemas/Pet/properties/tags/items Schema
`);
const schemaPairs = pairsOfTree(schemaTree);
const pairAt = (key: string) => schemaPairs.get(schemaTree.get(key)!)!;

describe('matches', () => {
  it('matches the members of a properties map, at any depth, and nothing below a member', () => {
    const matched = [...schemaTree.keys()].filter((key) =>
      matches(['SchemaProperties', 'Schema'], pairAt(key))
    );

    expect(matched).toEqual([
      '#/components/schemas/Pet/properties/name',
      '#/components/schemas/Pet/properties/owner',
      '#/components/schemas/Pet/properties/owner/oneOf/0/properties/login',
      '#/components/schemas/Pet/properties/tags',
    ]);
  });

  it('matches the alternatives of a oneOf and a flat key matches every node of the type', () => {
    expect(
      matches(['OneOf', 'Schema'], pairAt('#/components/schemas/Pet/properties/owner/oneOf/0'))
    ).toBe(true);
    expect(
      matches(
        ['OneOf', 'Schema'],
        pairAt('#/components/schemas/Pet/properties/owner/oneOf/0/properties/login')
      )
    ).toBe(false);
    expect(matches(['Schema'], pairAt('#/components/schemas/Pet/properties/tags/items'))).toBe(
      true
    );
    expect(matches([], pairAt('#/'))).toBe(true);
  });
});

describe('handlersOf', () => {
  it('flattens nested keys to type paths, enter to the container itself and any to the empty path', () => {
    const visit = () => {};
    const handlers = handlersOf(
      { any: visit, Schema: visit, SchemaProperties: { enter: visit, Schema: visit } },
      [],
      'my-rule'
    );

    expect(handlers.map(({ path }) => path)).toEqual([
      [],
      ['Schema'],
      ['SchemaProperties'],
      ['SchemaProperties', 'Schema'],
    ]);
  });

  it('rejects leave and skip, which a diff rule has no use for', () => {
    expect(() => handlersOf({ Schema: { leave: () => {} } }, [], 'my-rule')).toThrow(
      "Diff rule 'my-rule' uses 'leave'"
    );
  });
});

describe('initDiffRules', () => {
  it('instantiates one visitor per rule under the rule id', () => {
    const rule: DiffRule = () => ({ Schema() {} });

    expect(
      initDiffRules([{ 'my-rule': rule }], () => 'major').map(({ id, impact, handlers }) => [
        id,
        impact,
        handlers.map(({ path }) => path),
      ])
    ).toEqual([['my-rule', 'major', [['Schema']]]]);
  });
});
