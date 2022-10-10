import { Totals } from '@redocly/openapi-core';
import { getFallbackApisOrExit, isSubdir, pathToFilename, printConfigLintTotals } from '../utils';
import { red, yellow } from 'colorette';

jest.mock('os');
jest.mock('colorette');

describe('isSubdir', () => {
  it('can correctly determine if subdir', () => {
    (
      [
        ['/foo', '/foo', false],
        ['/foo', '/bar', false],
        ['/foo', '/foobar', false],
        ['/foo', '/foo/bar', true],
        ['/foo', '/foo/../bar', false],
        ['/foo', '/foo/./bar', true],
        ['/bar/../foo', '/foo/bar', true],
        ['/foo', './bar', false],
        ['/foo', '/foo/..bar', true],
      ] as [string, string, boolean][]
    ).forEach(([parent, child, expectRes]) => {
      expect(isSubdir(parent, child)).toBe(expectRes);
    });
  });

  it('can correctly determine if subdir for windows-based paths', () => {
    const os = require('os');
    os.platform.mockImplementation(() => 'win32');

    (
      [
        ['C:/Foo', 'C:/Foo/Bar', true],
        ['C:\\Foo', 'C:\\Bar', false],
        ['C:\\Foo', 'D:\\Foo\\Bar', false],
      ] as [string, string, boolean][]
    ).forEach(([parent, child, expectRes]) => {
      expect(isSubdir(parent, child)).toBe(expectRes);
    });
  });

  afterEach(() => {
    jest.resetModules();
  });
});

describe('pathToFilename', () => {
  it('should use correct path separator', () => {
    const processedPath = pathToFilename('/user/createWithList', '_');
    expect(processedPath).toEqual('user_createWithList');
  });
});

describe('getFallbackApisOrExit', () => {
  it('should find alias by filename', async () => {
    const entry = await getFallbackApisOrExit(['./test.yaml'], {
      apis: {
        main: {
          root: 'test.yaml',
        },
      },
    } as any);
    expect(entry).toEqual([{ path: './test.yaml', alias: 'main' }]);
  });
});

describe('printConfigLintTotals', () => {
  const totalProblemsMock: Totals = {
    errors: 1,
    warnings: 0,
    ignored: 0,
  };

  const redColoretteMocks = red as jest.Mock<any, any>;
  const yellowColoretteMocks = yellow as jest.Mock<any, any>;

  beforeEach(() => {
    yellowColoretteMocks.mockImplementation((text: string) => text);
    redColoretteMocks.mockImplementation((text: string) => text);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  it('should print errors if such exist', () => {
    printConfigLintTotals(totalProblemsMock);
    expect(process.stderr.write).toHaveBeenCalledWith('❌ Your config has 1 error.\n');
    expect(redColoretteMocks).toHaveBeenCalledWith('❌ Your config has 1 error.\n');
  });

  it('should print warnign and error', () => {
    printConfigLintTotals({ ...totalProblemsMock, warnings: 2 });
    expect(process.stderr.write).toHaveBeenCalledWith(
      '❌ Your config has 1 error and 2 warnings.\n'
    );
    expect(redColoretteMocks).toHaveBeenCalledWith('❌ Your config has 1 error and 2 warnings.\n');
  });

  it('should print warnign if no error', () => {
    printConfigLintTotals({ ...totalProblemsMock, errors: 0, warnings: 2 });
    expect(process.stderr.write).toHaveBeenCalledWith('You have 2 warnings.\n');
    expect(yellowColoretteMocks).toHaveBeenCalledWith('You have 2 warnings.\n');
  });

  it('should print nothing if no error and no warnings', () => {
    const result = printConfigLintTotals({ ...totalProblemsMock, errors: 0 });
    expect(result).toBeUndefined();
    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(yellowColoretteMocks).toHaveBeenCalledTimes(0);
    expect(redColoretteMocks).toHaveBeenCalledTimes(0);
  });
});
