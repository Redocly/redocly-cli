import type { NodeEntry, NodeValue } from '../../node-tree/types.js';
import { Location } from '../../ref-utils.js';
import { Source } from '../../resolve.js';
import { pairChildren } from '../pair-children.js';
import type { Pair } from '../types.js';

const source = new Source('cafe.yaml', '');

const child = (key: string | number, type: string, value: object = {}): NodeEntry => ({
  type: { name: type, properties: {} },
  key,
  // The pairing reads the key, the type name and the value of a child, and the type of its parent
  // to tell a field from a map entry.
  value: value as NodeValue,
  location: new Location(source, `#/${key}`),
  parent: null,
  children: [],
});
const parameter = (index: number, value: object) => child(index, 'Parameter', value);
const property = (name: string) => child(name, 'Schema', { type: 'string' });
const field = (name: string) => ({
  ...property(name),
  parent: {
    ...child('owner', 'Schema'),
    type: { name: 'Schema', properties: { [name]: { name: 'Schema', properties: {} } } },
  },
});

const keysOf = (pairs: Pair[]) => pairs.map((pair) => [pair.base?.key, pair.revision?.key]);

describe('pairChildren', () => {
  it('should pair children that are the same, wherever they are', () => {
    const pairs = pairChildren(
      [parameter(0, { name: 'limit', in: 'query' }), parameter(1, { name: 'offset', in: 'query' })],
      [parameter(0, { name: 'offset', in: 'query' }), parameter(1, { name: 'limit', in: 'query' })]
    );

    expect(keysOf(pairs)).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it('should pair the most alike of the rest and leave the others alone', () => {
    const pairs = pairChildren(
      [property('price'), property('name')],
      [property('prices'), property('color')]
    );

    expect(keysOf(pairs)).toEqual([
      ['price', 'prices'],
      ['name', undefined],
      [undefined, 'color'],
    ]);
  });

  it('should pair the same before the alike, so a renamed child never takes the place of an unchanged one', () => {
    const pairs = pairChildren([property('limit'), property('limits')], [property('limits')]);

    expect(keysOf(pairs)).toEqual([
      ['limits', 'limits'],
      ['limit', undefined],
    ]);
  });

  it('should pair duplicates in turn and leave the extra one alone', () => {
    const search = { name: 'search', in: 'query' };

    const pairs = pairChildren(
      [parameter(0, search), parameter(1, search)],
      [parameter(0, search)]
    );

    expect(keysOf(pairs)).toEqual([
      [0, 0],
      [1, undefined],
    ]);
  });

  it('should only pair children of one type', () => {
    const pairs = pairChildren([child('/menu', 'PathItem')], [child('x-menu', 'SpecExtension')]);

    expect(keysOf(pairs)).toEqual([
      ['/menu', undefined],
      [undefined, 'x-menu'],
    ]);
  });

  it('should pair a field only with the same field', () => {
    const pairs = pairChildren(
      [field('items'), field('unevaluatedProperties')],
      [field('unevaluatedItems'), field('items')]
    );

    expect(keysOf(pairs)).toEqual([
      ['items', 'items'],
      ['unevaluatedProperties', undefined],
      [undefined, 'unevaluatedItems'],
    ]);
  });

  it('should pair an inline item with a $ref that stands for the same content', () => {
    const limit = { name: 'limit', in: 'query' };
    const limitRef = parameter(0, { $ref: '#/components/parameters/Limit' });
    limitRef.resolved = child('Limit', 'Parameter', limit);

    const pairs = pairChildren([parameter(0, limit)], [limitRef]);

    expect(keysOf(pairs)).toEqual([[0, 0]]);
  });

  it('should pair items whose keys are written in another order', () => {
    const pairs = pairChildren(
      [parameter(0, { name: 'limit', in: 'query', required: true, style: 'form', example: 20 })],
      [parameter(0, { example: 20, style: 'form', required: true, in: 'query', name: 'limit' })]
    );

    expect(keysOf(pairs)).toEqual([[0, 0]]);
  });
});
