import { outdent } from 'outdent';

import type { InitializedDiffRule } from '../../config/rules.js';
import type { Location } from '../../ref-utils.js';
import { displaySide } from '../changes.js';
import { appliesTo, judgeChanges } from '../judge.js';
import type { Change, DiffRule } from '../types.js';
import { changesBetween, diffNodeAt } from './utils.js';

const rulesOf = (rule: DiffRule): InitializedDiffRule[] => [
  { ruleId: 'my-rule', impact: 'major', visitor: rule() },
];
const judgeWith = (rule: DiffRule, change: Change) =>
  judgeChanges([change], rulesOf(rule), 'oas3_1')[0];

const cafe = (schemas: string) => outdent`
  openapi: 3.1.0
  info: { title: Cafe, version: 1.0.0 }
  paths: {}
  components:
    schemas: ${schemas}
`;

describe('judgeChanges', () => {
  it('should run a nested handler for a member only and an any handler for every change', async () => {
    const [itemsRemoved, dessertRemoved] = await changesBetween(
      cafe('{ Order: { properties: { items: { type: array } } }, Dessert: { type: object } }'),
      cafe('{ Order: { properties: {} } }')
    );
    const rule: DiffRule = () => ({
      any(_change, { report }) {
        report({ message: 'Something changed.' });
      },
      SchemaProperties: {
        Schema(_change, { report }) {
          report({ message: 'A property changed.' });
        },
      },
    });

    expect(judgeWith(rule, dessertRemoved).verdicts).toMatchObject([
      { message: 'Something changed.' },
    ]);
    expect(judgeWith(rule, itemsRemoved).verdicts).toMatchObject([
      { message: 'Something changed.' },
      { message: 'A property changed.' },
    ]);
  });

  it('should hand the rule the location of the changed side and report there unless told otherwise', async () => {
    const [orderRemoved] = await changesBetween(cafe('{ Order: { type: object } }'), cafe('{}'));
    const removedAt = displaySide(orderRemoved).location;
    const elsewhere = removedAt.child(['type']);
    const seen: Location[] = [];
    const rule: DiffRule = () => ({
      Schema(_change, { report, location }) {
        seen.push(location);
        report({ message: 'Removed.' });
        report({ message: 'Elsewhere.', location: elsewhere });
      },
    });

    const { impact, verdicts } = judgeWith(rule, orderRemoved);

    expect(seen).toEqual([removedAt]);
    expect(verdicts).toEqual([
      { ruleId: 'my-rule', impact: 'major', message: 'Removed.', location: removedAt },
      { ruleId: 'my-rule', impact: 'major', message: 'Elsewhere.', location: elsewhere },
    ]);
    expect(impact).toBe('major');
  });

  it('should give a change no rule speaks about the default impact', async () => {
    const [menuAdded] = await changesBetween(
      'openapi: 3.1.0\ninfo: { title: Cafe, version: 1.0.0 }\npaths: {}',
      'openapi: 3.1.0\ninfo: { title: Cafe, version: 1.0.0 }\npaths: { /menu: {} }'
    );

    expect(judgeWith(() => ({}), menuAdded)).toMatchObject({ impact: 'minor', verdicts: [] });
  });

  it('should give a rule the directions of the change when it asks', async () => {
    const orders = (parameters: string) => outdent`
      openapi: 3.1.0
      info: { title: Cafe, version: 1.0.0 }
      paths:
        /orders:
          get:
            parameters: ${parameters}
            responses: {}
    `;
    const [limitRemoved] = await changesBetween(
      orders('[{ name: limit, in: query }, { name: page, in: query }]'),
      orders('[{ name: page, in: query }]')
    );
    const rule: DiffRule = () => ({
      Parameter(_change, { report, getDirections }) {
        report({ message: `Travels as ${getDirections().join(' and ')}.` });
      },
    });

    expect(judgeWith(rule, limitRemoved).verdicts).toMatchObject([
      { message: 'Travels as request.' },
    ]);
  });

  it('should reject a lint hook, which a diff rule has no use for', () => {
    const withEnter: DiffRule = () => ({ Schema: { enter() {} } });

    expect(() => judgeChanges([], rulesOf(withEnter), 'oas3_1')).toThrow(
      "Diff rule 'my-rule' uses 'enter' where diff visitors do not have it."
    );
  });

  it('should reject an any handler nested under a type', () => {
    const withNestedAny: DiffRule = () => ({ Schema: { any() {} } });

    expect(() => judgeChanges([], rulesOf(withNestedAny), 'oas3_1')).toThrow(
      "Diff rule 'my-rule' uses 'any' where diff visitors do not have it."
    );
  });
});

describe('appliesTo', () => {
  const order = outdent`
    openapi: 3.1.0
    info: { title: Cafe, version: 1.0.0 }
    paths: {}
    components:
      schemas:
        Order:
          properties:
            items: { type: array, items: { type: object } }
            payment:
              oneOf:
                - properties: { cardNumber: { type: string } }
  `;
  const at = (pointer: string) => diffNodeAt(order, `#/components/schemas/Order${pointer}`);

  it('should apply a nested path to a member of the map, not to the schema that owns it', async () => {
    expect(appliesTo(['SchemaProperties', 'Schema'], await at('/properties/items'))).toBe(true);
    expect(appliesTo(['SchemaProperties', 'Schema'], await at(''))).toBe(false);
  });

  it('should not apply a nested path to a schema further down inside a member', async () => {
    const orderLine = await at('/properties/items/items');

    expect(appliesTo(['SchemaProperties', 'Schema'], orderLine)).toBe(false);
  });

  it('should apply a nested path to a member of a map at any depth', async () => {
    const cardNumber = await at('/properties/payment/oneOf/0/properties/cardNumber');

    expect(appliesTo(['SchemaProperties', 'Schema'], cardNumber)).toBe(true);
  });

  it('should apply OneOf › Schema to an alternative, not to a property of it', async () => {
    const card = await at('/properties/payment/oneOf/0');
    const cardNumber = await at('/properties/payment/oneOf/0/properties/cardNumber');

    expect(appliesTo(['OneOf', 'Schema'], card)).toBe(true);
    expect(appliesTo(['OneOf', 'Schema'], cardNumber)).toBe(false);
  });

  it('should apply a flat path to every node of its type and the empty path to any node', async () => {
    expect(appliesTo(['Schema'], await at('/properties/items/items'))).toBe(true);
    expect(appliesTo([], await diffNodeAt(order, '#/'))).toBe(true);
  });
});
