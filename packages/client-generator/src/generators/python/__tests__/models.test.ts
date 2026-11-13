import type { SchemaModel } from '../../../intermediate-representation/model.js';
import { sortAliases } from '../models.js';

describe('sortAliases', () => {
  it('orders an alias after the aliases it names', () => {
    const aliases = new Map<string, SchemaModel>([
      [
        'Action',
        {
          kind: 'union',
          members: [
            { kind: 'ref', name: 'Feed' },
            { kind: 'ref', name: 'Adopt' },
          ],
        },
      ],
      [
        'Adopt',
        {
          kind: 'union',
          members: [
            { kind: 'scalar', scalar: 'string' },
            { kind: 'scalar', scalar: 'integer' },
          ],
        },
      ],
    ]);
    expect(sortAliases(aliases).map(([name]) => name)).toEqual(['Adopt', 'Action']);
  });
});
