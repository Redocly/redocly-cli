import { Assertion } from '..';
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
        const context: Assertion[] = [
          {
            subject: {
              type: 'Foo',
              filterInParentKeys: ['test'],
            },
          },
          {
            subject: {
              type: 'Bar',
              filterInParentKeys: ['test'],
            },
          },
          {
            subject: {
              type: 'Roof',
              filterInParentKeys: ['test'],
            },
          },
        ] as Assertion[];

        const visitors = buildVisitorObject(
          { subject: { type: 'Bar' } } as Assertion,
          context as any
        );

        expect(visitors).toMatchInlineSnapshot(`
          Object {
            "Foo": Object {
              "Bar": Object {
                "Roof": Object {
                  "Bar": [Function],
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
        const context = [
          {
            subject: {
              type: 'Operation',
              filterInParentKeys: ['put'],
            },
          },
          {
            subject: {
              type: 'Responses',
              filterInParentKeys: [201, 200],
            },
          },
        ];

        const visitors = buildVisitorObject(
          { subject: { type: 'MediaTypesMap' } } as Assertion,
          context as any
        );

        expect(visitors).toMatchInlineSnapshot(`
          Object {
            "Operation": Object {
              "Responses": Object {
                "MediaTypesMap": [Function],
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
