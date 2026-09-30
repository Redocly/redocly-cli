import { appliesTo, judgeChanges } from '../judge.js';
import type { Change, DiffRule } from '../types.js';
import { diffTreeOf } from './utils.js';

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
      key: order.label,
      kind: 'removed',
      node: order,
      base: { location: order.base!.location, value: {} },
    };
    const itemsRemoved: Change = {
      key: items.label,
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

    const [orderJudged, itemsJudged] = judgeChanges({
      changes: [orderRemoved, itemsRemoved],
      specVersion: 'oas3_1',
      ruleSets: [{ 'my-rule': rule }],
      impactOf: () => 'major',
      directionOf: () => [],
    });

    expect(orderJudged.verdicts).toMatchObject([{ message: 'Something changed.' }]);
    expect(itemsJudged.verdicts).toMatchObject([
      { message: 'Something changed.' },
      { message: 'A property changed.' },
    ]);
  });

  it('should reject a lint hook, which a diff rule has no use for', () => {
    const withEnter: DiffRule = () => ({ Schema: { enter() {} } });

    const judge = () =>
      judgeChanges({
        changes: [],
        specVersion: 'oas3_1',
        ruleSets: [{ 'my-rule': withEnter }],
        impactOf: () => 'major',
        directionOf: () => [],
      });

    expect(judge).toThrow("Diff rule 'my-rule' uses 'enter' where diff visitors do not have it.");
  });

  it('should reject an any handler nested under a type', () => {
    const withNestedAny: DiffRule = () => ({ Schema: { any() {} } });

    const judge = () =>
      judgeChanges({
        changes: [],
        specVersion: 'oas3_1',
        ruleSets: [{ 'my-rule': withNestedAny }],
        impactOf: () => 'major',
        directionOf: () => [],
      });

    expect(judge).toThrow("Diff rule 'my-rule' uses 'any' where diff visitors do not have it.");
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
