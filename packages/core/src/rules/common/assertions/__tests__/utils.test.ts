import { Rule, objectSet, formRule, getCounts, isOrdered } from '../utils';

describe('Oas3 assertions', () => {
  describe('Utils', () => {
    describe('objectSet', () => {
      it('should set the value at path of object', () => {
        const path = ['foo', 'bar', 'baz'];
        const obj = objectSet(path, 'test');
        expect(obj).toMatchInlineSnapshot(`
          Object {
            "foo": Object {
              "bar": Object {
                "baz": "test",
              },
            },
          }
        `);
      });
    });

    describe('formRule', () => {
      it('should return the visitor object', () => {
        const visitor = formRule('test', {} as { [key: string]: Rule[] });
        expect(visitor).toMatchInlineSnapshot(`
          Object {
            "test": [Function],
          }
        `);
      });
    });

    describe('getCounts', () => {
      it('should return the right counts', () => {
        const arr = ['foo', 'bar', 'baz']
        expect(getCounts(arr, ['foo'])).toBe(1);
        expect(getCounts(arr, ['foo', 'bar', 'baz'])).toBe(3);
        expect(getCounts(arr, ['foo', 'test', 'baz'])).toBe(2);
        expect(getCounts(arr, ['example', 'test'])).toBe(0);
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
  });
});
