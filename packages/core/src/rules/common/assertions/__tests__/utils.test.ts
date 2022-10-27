import { Assertion, AssertionDefinition } from '..';
import { isOrdered, buildVisitorObject, getIntersectionLength } from '../utils';

describe('Oas3 assertions', () => {
  describe('Utils', () => {
    describe('getCounts', () => {
      it('should return the right counts', () => {
        const arr = ['foo', 'bar', 'baz'];
        expect(getIntersectionLength(arr, ['foo'])).toBe(1);
        expect(getIntersectionLength(arr, ['foo', 'bar', 'baz'])).toBe(3);
        expect(getIntersectionLength(arr, ['foo', 'test', 'baz'])).toBe(2);
        expect(getIntersectionLength(arr, ['example', 'test'])).toBe(0);
      });
    });

    describe('isOrdered', () => {
      it('should say if array is ordered or not in specific direction', () => {
        expect(isOrdered(['example', 'foo', 'test'], 'asc')).toBeTruthy();
        expect(isOrdered(['example'], 'asc')).toBeTruthy();
        expect(isOrdered(['test', 'foo', 'example'], 'desc')).toBeTruthy();
        expect(isOrdered(['example'], 'desc')).toBeTruthy();
        expect(isOrdered(['example', 'test', 'foo'], 'asc')).toBeFalsy();
        expect(isOrdered(['example', 'foo', 'test'], 'desc')).toBeFalsy();
      });
    });

    describe('buildVisitorObject', () => {
      it('should return a consistent visitor structure', () => {
        const where: AssertionDefinition[] = [
          {
            subject: {
              type: 'Foo',
              filterInParentKeys: ['test'],
            },
            assertions: {},
          },
          {
            subject: {
              type: 'Bar',
              filterInParentKeys: ['test'],
            },
            assertions: {},
          },
          {
            subject: {
              type: 'Roof',
              filterInParentKeys: ['test'],
            },
            assertions: {},
          },
        ] as AssertionDefinition[];

        const visitors = buildVisitorObject(
          { subject: { type: 'Bar' }, where, assertions: {} } as Assertion,
          () => {}
        );

        expect(visitors).toMatchInlineSnapshot(`
          Object {
            "Foo": Object {
              "Bar": Object {
                "Roof": Object {
                  "Bar": Object {
                    "enter": [Function],
                  },
                  "skip": [Function],
                },
                "skip": [Function],
              },
              "skip": [Function],
            },
          }
        `);
      });

      it('should return the right visitor structure', () => {
        const where = [
          {
            subject: {
              type: 'Operation',
              filterInParentKeys: ['put'],
            },
            assertions: {},
          },
          {
            subject: {
              type: 'Responses',
              filterInParentKeys: [201, 200],
            },
            assertions: {},
          },
        ];

        const visitors = buildVisitorObject(
          { subject: { type: 'MediaTypesMap' }, where, assertions: {} } as Assertion,
          () => {}
        );

        expect(visitors).toMatchInlineSnapshot(`
          Object {
            "Operation": Object {
              "Responses": Object {
                "MediaTypesMap": Object {
                  "enter": [Function],
                },
                "skip": [Function],
              },
              "skip": [Function],
            },
          }
        `);
      });
    });
  });
});
