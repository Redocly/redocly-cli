import { Rule, objectSet, formRule, getCounts, isOrdered } from '../utils';

describe('Oas3 enforcements', () => {
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
        const obj = { foo: '1', bar: '2', baz: '3' }
        expect(getCounts(obj, ['foo'])).toBe(1);
        expect(getCounts(obj, ['foo', 'bar', 'baz'])).toBe(3);
        expect(getCounts(obj, ['foo', 'test', 'baz'])).toBe(2);
        expect(getCounts(obj, ['example', 'test'])).toBe(0);
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
