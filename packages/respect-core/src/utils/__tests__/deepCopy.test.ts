import { deepCopy } from '../deepCopy.js';

describe('deepCopy', () => {
  it('should deep copy an object', () => {
    const obj = { a: 1, b: { c: 2 } };
    const copy = deepCopy(obj);
    expect(copy).toEqual(obj);
  });

  it('should deep copy an object with circular references', () => {
    const obj = { a: 1 };
    // @ts-ignore
    obj.b = obj;
    const copy = deepCopy(obj);
    expect(copy).toEqual(obj);
  });

  it('should deep copy an object with File and ArrayBuffer', () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const arrayBuffer = new ArrayBuffer(8);
    const copy = deepCopy({ file, arrayBuffer });
    expect(copy).toEqual({ file, arrayBuffer });
  });

  it('should deep copy an object with nested objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const copy = deepCopy(obj);
    expect(copy).toEqual(obj);
  });

  it('should deep copy an object with nested objects and circular references', () => {
    const obj = { a: 1, b: { c: 2 } };
    // @ts-ignore
    obj.b.d = obj;
    const copy = deepCopy(obj);
    expect(copy).toEqual(obj);
  });
});
