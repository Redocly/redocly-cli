import type { NodeEntry } from '../../node-map/types.js';
import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';
import { classifyChanges } from '../detect.js';
import type { Change } from '../types.js';
import { UsageIndex } from '../usage.js';
import { treeOf } from './tree.js';

const emptyMaps = {
  base: new Map<string, NodeEntry>(),
  revision: new Map<string, NodeEntry>(),
  usage: new UsageIndex([], () => undefined),
};

// What every rule verdict passes through: which rules run, how many verdicts survive,
// and which one decides the change. The rules themselves are covered by tests/e2e/diff.
describe('classifyChanges', () => {
  it('defaults to non-breaking when no rule judges the change', () => {
    const location = new Location(new Source('api.yaml', ''), '#/info/title');
    const changes: Change[] = [
      {
        key: '#/info',
        kind: 'modified',
        property: 'title',
        typeName: 'Info',
        base: { location, value: 'a' },
        revision: { location, value: 'b' },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'oas3_1', ...emptyMaps });
    expect(change.compat).toBe('non-breaking');
    expect(change.verdicts).toEqual([]);
  });

  it('returns structural-only (non-breaking) for specs without a registry', () => {
    const location = new Location(new Source('api.yaml', ''), '#/x');
    const changes: Change[] = [
      {
        key: '#/x',
        kind: 'removed',
        typeName: 'Operation',
        base: { location, value: {} },
      },
    ];
    const [change] = classifyChanges({ changes, specVersion: 'async2', ...emptyMaps });
    expect(change.compat).toBe('non-breaking');
  });

  it('keeps every verdict when multiple rules fire, worst-first', () => {
    // The component is referenced from a request and from a response, so it is
    // judged under both polarities; that needs real node types on the way down.
    const entries = treeOf(`
      #/ Root
      #/paths PathsMap
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
      #/components/schemas/S Schema
    `);
    const tree = (pointer: string) => entries.get(pointer);
    const usage = new UsageIndex(
      [
        {
          site: '#/paths/~1x/get/parameters/{query:q}/schema',
          target: '#/components/schemas/S',
        },
        {
          site: '#/paths/~1x/get/responses/200/content/application~1json/schema',
          target: '#/components/schemas/S',
        },
      ],
      tree
    );
    const location = new Location(new Source('api.yaml', ''), '#/components/schemas/S/enum');
    const changes: Change[] = [
      {
        key: '#/components/schemas/S',
        property: 'enum',
        kind: 'modified',
        typeName: 'Schema',
        base: { location, value: ['a', 'b'] },
        revision: { location, value: ['a', 'c'] },
      },
    ];
    const [change] = classifyChanges({
      changes,
      specVersion: 'oas3_1',
      base: entries,
      revision: entries,
      usage,
    });
    // Swapping one enum value both removes an accepted request value and returns a
    // response value no client handled, so both verdicts are kept.
    expect(change.compat).toBe('breaking');
    expect(change.verdicts).toMatchInlineSnapshot(`
      [
        {
          "compat": "breaking",
          "message": "Enum values added: c.",
          "ruleId": "enum-values-added",
        },
        {
          "compat": "breaking",
          "message": "Enum values removed: b.",
          "ruleId": "enum-values-removed",
        },
      ]
    `);
  });
});
