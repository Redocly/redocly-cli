import { jsonStringifyWithArrayBuffer } from '../json-stringify-with-array-buffer.js';

describe('jsonStringifyWithArrayBuffer', () => {
  it('should serialize ArrayBuffer to base64', () => {
    const arrayBuffer = new ArrayBuffer(4);
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array.set([1, 2, 3, 4]);

    const obj = { binaryData: arrayBuffer };
    const result = jsonStringifyWithArrayBuffer(obj);
    const parsed = JSON.parse(result);

    expect(parsed.binaryData).toEqual({
      __type: 'ArrayBuffer',
      data: 'AQIDBA==', // base64 of [1, 2, 3, 4]
      byteLength: 4,
    });
  });

  it('should serialize File objects', () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

    const obj = { fileData: file };
    const result = jsonStringifyWithArrayBuffer(obj);
    const parsed = JSON.parse(result);

    expect(parsed.fileData).toEqual({
      __type: 'File',
      name: 'test.txt',
      size: 12,
      type: 'text/plain',
      lastModified: expect.any(Number),
    });
  });

  it('should handle mixed objects with ArrayBuffer and File', () => {
    const arrayBuffer = new ArrayBuffer(2);
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array.set([10, 20]);

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    const obj = {
      binary: arrayBuffer,
      file: file,
      normal: 'string value',
      number: 42,
    };

    const result = jsonStringifyWithArrayBuffer(obj);
    const parsed = JSON.parse(result);

    expect(parsed.binary).toEqual({
      __type: 'ArrayBuffer',
      data: 'ChQ=', // base64 of [10, 20]
      byteLength: 2,
    });

    expect(parsed.file).toEqual({
      __type: 'File',
      name: 'hello.txt',
      size: 5,
      type: 'text/plain',
      lastModified: expect.any(Number),
    });

    expect(parsed.normal).toBe('string value');
    expect(parsed.number).toBe(42);
  });

  it('should handle nested objects', () => {
    const arrayBuffer = new ArrayBuffer(1);
    const uint8Array = new Uint8Array(arrayBuffer);
    uint8Array.set([100]);

    const file = new File(['nested'], 'nested.txt', { type: 'text/plain' });

    const obj = {
      level1: {
        level2: {
          binary: arrayBuffer,
          file: file,
        },
      },
    };

    const result = jsonStringifyWithArrayBuffer(obj);
    const parsed = JSON.parse(result);

    expect(parsed.level1.level2.binary).toEqual({
      __type: 'ArrayBuffer',
      data: 'ZA==', // base64 of [100]
      byteLength: 1,
    });

    expect(parsed.level1.level2.file).toEqual({
      __type: 'File',
      name: 'nested.txt',
      size: 6,
      type: 'text/plain',
      lastModified: expect.any(Number),
    });
  });
});
