import { Buffer } from 'node:buffer';
import * as fs from 'node:fs';

import type { RequestBody, TestContext } from '../../../types.js';
import {
  createFormData,
  parseRequestBody,
  stripFileDecorator,
} from '../../context-parser/index.js';

vi.mock('node:fs');

describe('parseRequestBody', () => {
  const ctx = {
    options: {
      filePath: 'test.yaml',
      requestFileLoader: {
        getFileBody: async (filePath: string) => {
          await new Promise((resolve, reject) => {
            fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
              if (err) {
                reject(new Error(`File ${filePath} doesn't exist or isn't readable.`));
              } else {
                resolve(filePath);
              }
            });
          });
          const buffer = fs.readFileSync(filePath);
          return new Blob([buffer]);
        },
      },
    },
  } as unknown as TestContext;

  it('should return empty object if no body', async () => {
    expect(await parseRequestBody(undefined, ctx)).toEqual({});
  });

  it('should return body with no ctx provided', async () => {
    expect(
      await parseRequestBody(
        {
          payload: {
            test: 'test',
          },
        },
        ctx
      )
    ).toEqual({
      payload: { test: 'test' },
      contentType: undefined,
      encoding: undefined,
      replacements: undefined,
    });
  });

  it('should return body with ctx provided', async () => {
    expect(
      await parseRequestBody(
        {
          payload: 'clientId={$input.clientID}&grant_type=12',
          contentType: 'application/x-www-form-urlencoded',
          replacements: [
            {
              target: '/clientId',
              value: '123',
            },
          ],
        },
        ctx
      )
    ).toEqual({
      payload: {
        clientId: '{$input.clientID}',
        grant_type: '12',
      },
      contentType: 'application/x-www-form-urlencoded',
      encoding: undefined,
      replacements: [
        {
          target: '/clientId',
          value: '123',
        },
      ],
    });
  });

  it('should return body with string replacement applied', async () => {
    expect(
      await parseRequestBody(
        {
          payload: {
            test: 'test',
          },
          contentType: 'application/json',
          encoding: 'utf-8',
        },
        ctx
      )
    ).toEqual({
      payload: { test: 'test' },
      contentType: 'application/json',
      encoding: 'utf-8',
      replacements: undefined,
    });
  });

  it('should keep a multipart/form-data payload as data and load its files', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('file content');
    // @ts-expect-error
    vi.mocked(fs.access).mockImplementation((_filePath, _mode, callback) => {
      callback();
    });
    expect(
      await parseRequestBody(
        {
          payload: {
            test: 'test',
            file: "$file('file1.txt')",
            commit: {
              message: 'test',
              author: 'John Doe',
            },
            array: ['test', "$file('file2.txt')"],
          },
          contentType: 'multipart/form-data',
          encoding: 'utf-8',
        },
        ctx
      )
    ).toEqual({
      payload: {
        test: 'test',
        file: expect.any(Blob),
        commit: {
          message: 'test',
          author: 'John Doe',
        },
        array: ['test', expect.any(Blob)],
      },
      contentType: 'multipart/form-data',
      encoding: 'utf-8',
    });
  });

  it('should load the files of a payload when only the description sets the multipart content type', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue('file content');
    // @ts-expect-error
    vi.mocked(fs.access).mockImplementation((_filePath, _mode, callback) => {
      callback();
    });
    expect(
      await parseRequestBody(
        { payload: { file: "$file('file1.txt')" } },
        ctx,
        'multipart/form-data'
      )
    ).toEqual({ payload: { file: expect.any(Blob) } });
  });

  it('should handle multipart/form-data and return error reading file', async () => {
    vi.mocked(fs.createReadStream).mockReturnValueOnce('readStream' as any);
    // @ts-expect-error
    vi.mocked(fs.access).mockImplementation((_filePath, _mode, callback) => {
      callback(new Error('error'));
    });
    await expect(
      parseRequestBody(
        {
          payload: {
            test: 'test',
            array: ['test', "$file('file2.txt')"],
          },
          contentType: 'multipart/form-data',
          encoding: 'utf-8',
        },
        ctx
      )
    ).rejects.toThrow("file2.txt doesn't exist or isn't readable.");
  });

  it('should handle application/octet-stream', async () => {
    vi.mocked(fs.readFileSync).mockReturnValueOnce('readStream' as any);
    // @ts-expect-error
    vi.mocked(fs.access).mockImplementation((_filePath, _mode, callback) => {
      callback();
    });
    expect(
      await parseRequestBody(
        {
          payload: "$file('file3.txt')",
          contentType: 'application/octet-stream',
          encoding: 'utf-8',
        },
        ctx
      )
    ).toEqual({
      payload: expect.toSatisfy((p) => p instanceof Blob),
      contentType: 'application/octet-stream',
      encoding: 'utf-8',
      replacements: undefined,
    });
  });

  it('should handle application/octet-stream with string payload', async () => {
    expect(
      await parseRequestBody(
        {
          payload: Buffer.from('test') as unknown as RequestBody['payload'],
          contentType: 'application/octet-stream',
          encoding: 'utf-8',
        },
        ctx
      )
    ).toEqual({
      payload: Buffer.from('test'),
      contentType: 'application/octet-stream',
      encoding: 'utf-8',
      replacements: undefined,
    });
  });

  it('should handle application/octet-stream and return error reading file', async () => {
    vi.mocked(fs.readFileSync).mockReturnValueOnce('readStream' as any);
    // @ts-expect-error
    vi.mocked(fs.access).mockImplementation((_filePath, _mode, callback) => {
      callback(new Error('error'));
    });
    await expect(
      parseRequestBody(
        {
          payload: "$file('file3.txt')",
          contentType: 'application/octet-stream',
          encoding: 'utf-8',
        },
        ctx
      )
    ).rejects.toThrow("file3.txt doesn't exist or isn't readable.");
  });
});

describe('stripFileDecorator', () => {
  it('should return file name without $file decorator', () => {
    expect(stripFileDecorator("$file('file1.txt')")).toEqual('file1.txt');
  });

  it('should return file name', () => {
    expect(stripFileDecorator('file1.txt')).toEqual('file1.txt');
  });
});

describe('createFormData', () => {
  it('should encode nested objects, arrays, and files as form fields', () => {
    const formData = createFormData({
      name: 'tiramisu',
      price: 13000,
      commit: { message: 'test' },
      tags: ['dessert', 'coffee'],
      photo: new Blob(['photo']),
    });

    expect([...formData.entries()]).toEqual([
      ['name', 'tiramisu'],
      ['price', '13000'],
      ['commit[message]', 'test'],
      ['tags', 'dessert'],
      ['tags', 'coffee'],
      ['photo', expect.any(File)],
    ]);
  });

  it('should encode an object in a list as indexed fields', () => {
    const formData = createFormData({
      items: [{ id: 'prd_1', tags: ['dessert'] }, { id: 'prd_2' }],
      names: ['tiramisu', 'tea'],
    });

    expect([...formData.entries()]).toEqual([
      ['items[0][id]', 'prd_1'],
      ['items[0][tags]', 'dessert'],
      ['items[1][id]', 'prd_2'],
      ['names', 'tiramisu'],
      ['names', 'tea'],
    ]);
  });

  it('should put the files after the other fields', () => {
    const formData = createFormData({
      photo: new Blob(['photo']),
      name: 'tiramisu',
      gallery: [new Blob(['first']), 'caption'],
    });

    expect([...formData.entries()]).toEqual([
      ['name', 'tiramisu'],
      ['gallery', 'caption'],
      ['photo', expect.any(File)],
      ['gallery', expect.any(File)],
    ]);
  });

  it('should send a list in a list as text', () => {
    const formData = createFormData({ sizes: [[1, 2], [3]] });

    expect([...formData.entries()]).toEqual([
      ['sizes', '1,2'],
      ['sizes', '3'],
    ]);
  });

  it('should send an evaluated value that looks like a file reference as text', () => {
    const formData = createFormData({ note: "$file('/etc/passwd')" });

    expect(formData.get('note')).toEqual("$file('/etc/passwd')");
  });
});
