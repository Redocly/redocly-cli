import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';
import { detectBreakingChanges, initDiffRules } from '../detect.js';
import { recommendedDiffRules } from '../rules/index.js';
import type { Change, DiffRule } from '../types.js';
import { UsageIndex } from '../usage.js';
import { treeOf } from './tree.js';

const source = new Source('api.yaml', '');
const at = (pointer: string) => new Location(source, pointer);

const emptyMaps = {
  base: new Map(),
  revision: new Map(),
  usage: new UsageIndex([], () => undefined),
};

// What every finding passes through: which visitors run, what a report becomes, and how the
// same finding under two directions is kept once. The rules themselves are covered by tests/e2e/diff.
describe('detectBreakingChanges', () => {
  it('leaves a change no rule reports on patch with no verdicts', () => {
    const changes: Change[] = [
      {
        key: '#/info',
        kind: 'modified',
        property: 'title',
        typeName: 'Info',
        base: { location: at('#/info/title'), value: 'a' },
        revision: { location: at('#/info/title'), value: 'b' },
      },
    ];

    const [change] = detectBreakingChanges({
      changes,
      specVersion: 'oas3_1',
      ruleMap: recommendedDiffRules,
      ...emptyMaps,
    });

    expect(change.impact).toBe('patch');
    expect(change.verdicts).toEqual([]);
  });

  it('judges nothing for a specification without rules', () => {
    const changes: Change[] = [
      {
        key: '#/x',
        kind: 'removed',
        typeName: 'Operation',
        base: { location: at('#/x'), value: {} },
      },
    ];

    const [change] = detectBreakingChanges({
      changes,
      specVersion: 'async2',
      ruleMap: recommendedDiffRules,
      ...emptyMaps,
    });

    expect(change.impact).toBe('patch');
  });

  it('stamps the rule id on a report and defaults its location to the display side', () => {
    const changes: Change[] = [
      {
        key: '#/paths/~1x/delete',
        kind: 'removed',
        typeName: 'Operation',
        base: { location: at('#/paths/~1x/delete'), value: {} },
      },
    ];

    const [change] = detectBreakingChanges({
      changes,
      specVersion: 'oas3_1',
      ruleMap: recommendedDiffRules,
      ...emptyMaps,
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
    const lookup = (key: string) => entries.get(key);
    const usage = new UsageIndex(
      [
        {
          site: '#/paths/~1x/get/parameters/{query:q}/schema',
          target: '#/components/schemas/Shared',
        },
        {
          site: '#/paths/~1x/get/responses/200/content/application~1json/schema',
          target: '#/components/schemas/Shared',
        },
      ],
      lookup
    );
    const changes: Change[] = [
      {
        key: '#/components/schemas/Shared',
        kind: 'modified',
        property: 'enum',
        typeName: 'Schema',
        base: { location: at('#/components/schemas/Shared/enum'), value: ['a', 'b'] },
        revision: { location: at('#/components/schemas/Shared/enum'), value: ['a', 'c'] },
      },
    ];

    const [change] = detectBreakingChanges({
      changes,
      specVersion: 'oas3_1',
      base: entries,
      revision: entries,
      usage,
      ruleMap: recommendedDiffRules,
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
        typeName: 'Tag',
        revision: { location: at('#/tags/0'), value: {} },
      },
      {
        key: '#/info',
        kind: 'modified',
        property: 'title',
        typeName: 'Info',
        base: { location: at('#/info/title'), value: 'a' },
        revision: { location: at('#/info/title'), value: 'b' },
      },
    ];

    const [added, modified] = detectBreakingChanges({
      changes,
      specVersion: 'oas3_1',
      ruleMap: recommendedDiffRules,
      ...emptyMaps,
    });

    expect(added.impact).toBe('minor');
    expect(modified.impact).toBe('patch');
  });

  it('stamps the configured impact on a verdict and skips a rule set to off', () => {
    const changes: Change[] = [
      {
        key: '#/paths/~1x/delete',
        kind: 'removed',
        typeName: 'Operation',
        base: { location: at('#/paths/~1x/delete'), value: {} },
      },
    ];

    const [minor] = detectBreakingChanges({
      changes,
      specVersion: 'oas3_1',
      ruleMap: { 'operation-removed': 'minor' },
      ...emptyMaps,
    });
    const [off] = detectBreakingChanges({
      changes,
      specVersion: 'oas3_1',
      ruleMap: { 'operation-removed': 'off' },
      ...emptyMaps,
    });

    expect(minor.impact).toBe('minor');
    expect(minor.verdicts[0].impact).toBe('minor');
    expect(off.impact).toBe('patch');
    expect(off.verdicts).toEqual([]);
  });
});

describe('initDiffRules', () => {
  it('instantiates one visitor per rule under the rule id', () => {
    const rule: DiffRule = () => ({ Schema() {} });

    expect(
      initDiffRules({ 'my-rule': rule }, { 'my-rule': 'major' }).map(({ id, impact, visitor }) => [
        id,
        impact,
        Object.keys(visitor),
      ])
    ).toEqual([['my-rule', 'major', ['Schema']]]);
  });
});
