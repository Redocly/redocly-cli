import type { InitializedDiffRule } from '../../config/rules.js';
import type { Location } from '../../ref-utils.js';
import { appliesTo, judgeChanges } from '../judge.js';
import type { Change, DiffRule } from '../types.js';
import { diffTreeOf } from './utils.js';

const rulesOf = (rule: DiffRule): InitializedDiffRule[] => [
  { ruleId: 'my-rule', impact: 'major', visitor: rule() },
];
const judgeWith = (rule: DiffRule, change: Change) =>
  judgeChanges([change], rulesOf(rule), 'oas3_1')[0];

describe('judgeChanges', () => {
  it('should run a nested handler for a member only and an any handler for every change', () => {
    const cafe = diffTreeOf(`
      #/Order Schema
      #/Order/properties SchemaProperties
      #/Order/properties/items Schema
    `);
    const order = cafe.get('#/Order')!;
    const items = cafe.get('#/Order/properties/items')!;
    const orderRemoved: Change = {
      key: '#/Order',
      kind: 'removed',
      node: order,
      base: { location: order.base!.location, value: {} },
    };
    const itemsRemoved: Change = {
      key: '#/Order/properties/items',
      kind: 'removed',
      node: items,
      base: { location: items.base!.location, value: {} },
    };
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

    expect(judgeWith(rule, orderRemoved).verdicts).toMatchObject([
      { message: 'Something changed.' },
    ]);
    expect(judgeWith(rule, itemsRemoved).verdicts).toMatchObject([
      { message: 'Something changed.' },
      { message: 'A property changed.' },
    ]);
  });

  it('should hand the rule the location of the changed side and report there unless told otherwise', () => {
    const cafe = diffTreeOf(`
      #/Order Schema
    `);
    const order = cafe.get('#/Order')!;
    const orderRemoved: Change = {
      key: '#/Order',
      kind: 'removed',
      node: order,
      base: { location: order.base!.location, value: {} },
    };
    const seen: Location[] = [];
    const elsewhere = order.base!.location.child(['type']);
    const rule: DiffRule = () => ({
      Schema(_change, { report, location }) {
        seen.push(location);
        report({ message: 'Removed.' });
        report({ message: 'Elsewhere.', location: elsewhere });
      },
    });

    const { impact, verdicts } = judgeWith(rule, orderRemoved);

    expect(seen).toEqual([order.base!.location]);
    expect(verdicts).toEqual([
      { ruleId: 'my-rule', impact: 'major', message: 'Removed.', location: order.base!.location },
      { ruleId: 'my-rule', impact: 'major', message: 'Elsewhere.', location: elsewhere },
    ]);
    expect(impact).toBe('major');
  });

  it('should give a change no rule speaks about the default impact', () => {
    const cafe = diffTreeOf(`
      #/Order Schema
    `);
    const order = cafe.get('#/Order')!;
    const orderAdded: Change = {
      key: '#/Order',
      kind: 'added',
      node: order,
      revision: { location: order.revision!.location, value: {} },
    };

    expect(judgeWith(() => ({}), orderAdded)).toMatchObject({ impact: 'minor', verdicts: [] });
  });

  it('should give a rule the directions of the change when it asks', () => {
    const cafe = diffTreeOf(`
      #/ Root
      #/paths Paths
      #/paths/~1orders PathItem
      #/paths/~1orders/get Operation
      #/paths/~1orders/get/parameters ParameterList
      #/paths/~1orders/get/parameters/0 Parameter
    `);
    const limit = cafe.get('#/paths/~1orders/get/parameters/0')!;
    const limitRemoved: Change = {
      key: '#/paths/~1orders/get/parameters/0',
      kind: 'removed',
      node: limit,
      base: { location: limit.base!.location, value: {} },
    };
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
  it('should apply a nested path to a member of the map, not to the schema that owns it', () => {
    const cafe = diffTreeOf(`
      #/Order Schema
      #/Order/properties SchemaProperties
      #/Order/properties/items Schema
    `);
    const order = cafe.get('#/Order')!;
    const items = cafe.get('#/Order/properties/items')!;

    expect(appliesTo(['SchemaProperties', 'Schema'], items)).toBe(true);
    expect(appliesTo(['SchemaProperties', 'Schema'], order)).toBe(false);
  });

  it('should not apply a nested path to a schema further down inside a member', () => {
    const cafe = diffTreeOf(`
      #/Order Schema
      #/Order/properties SchemaProperties
      #/Order/properties/items Schema
      #/Order/properties/items/items Schema
    `);
    const orderLine = cafe.get('#/Order/properties/items/items')!;

    expect(appliesTo(['SchemaProperties', 'Schema'], orderLine)).toBe(false);
  });

  it('should apply a nested path to a member of a map at any depth', () => {
    const cafe = diffTreeOf(`
      #/Order Schema
      #/Order/properties SchemaProperties
      #/Order/properties/payment Schema
      #/Order/properties/payment/oneOf OneOf
      #/Order/properties/payment/oneOf/0 Schema
      #/Order/properties/payment/oneOf/0/properties SchemaProperties
      #/Order/properties/payment/oneOf/0/properties/cardNumber Schema
    `);
    const cardNumber = cafe.get('#/Order/properties/payment/oneOf/0/properties/cardNumber')!;

    expect(appliesTo(['SchemaProperties', 'Schema'], cardNumber)).toBe(true);
  });

  it('should apply OneOf › Schema to an alternative, not to a property of it', () => {
    const cafe = diffTreeOf(`
      #/Payment Schema
      #/Payment/oneOf OneOf
      #/Payment/oneOf/0 Schema
      #/Payment/oneOf/0/properties SchemaProperties
      #/Payment/oneOf/0/properties/cardNumber Schema
    `);
    const card = cafe.get('#/Payment/oneOf/0')!;
    const cardNumber = cafe.get('#/Payment/oneOf/0/properties/cardNumber')!;

    expect(appliesTo(['OneOf', 'Schema'], card)).toBe(true);
    expect(appliesTo(['OneOf', 'Schema'], cardNumber)).toBe(false);
  });

  it('should apply a flat path to every node of its type and the empty path to any node', () => {
    const cafe = diffTreeOf(`
      #/ Root
      #/Order Schema
      #/Order/items Schema
    `);
    const root = cafe.get('#/')!;
    const orderLine = cafe.get('#/Order/items')!;

    expect(appliesTo(['Schema'], orderLine)).toBe(true);
    expect(appliesTo([], root)).toBe(true);
  });
});
