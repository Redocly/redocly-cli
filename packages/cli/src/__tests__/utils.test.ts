import {
  getFallbackApisOrExit,
  isSubdir,
  pathToFilename,
  printConfigLintTotals,
  langToExt,
} from '../utils';
import { ResolvedApi, Totals, isAbsoluteUrl } from '@redocly/openapi-core';
import { red, yellow } from 'colorette';
import { existsSync } from 'fs';
import * as path from 'path';

jest.mock('os');
jest.mock('colorette');
jest.mock('fs');

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
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => true);
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

describe('getFallbackApisOrExit', () => {
  const redColoretteMocks = red as jest.Mock<any, any>;
  const yellowColoretteMocks = yellow as jest.Mock<any, any>;

  const apis: Record<string, ResolvedApi> = {
    main: {
      root: 'someFile.yaml',
      styleguide: {},
    },
  };

  const config = { apis };

  beforeEach(() => {
    yellowColoretteMocks.mockImplementation((text: string) => text);
    redColoretteMocks.mockImplementation((text: string) => text);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    jest.spyOn(process, 'exit').mockImplementation();
  });

  it('should exit with error because no path provided', async () => {
    const apisConfig = {
      apis: {},
    };
    await getFallbackApisOrExit([''], apisConfig);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should error if file from config do not exist', async () => {
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => false);
    await getFallbackApisOrExit(undefined, config);

    expect(process.stderr.write).toHaveBeenCalledWith(
      '\n someFile.yaml does not exist or is invalid. Please provide a valid path. \n\n'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should return valid array with results if such file exist', async () => {
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => true);
    jest.spyOn(path, 'resolve').mockImplementationOnce((_, path) => path);

    const result = await getFallbackApisOrExit(undefined, config);
    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(process.exit).toHaveBeenCalledTimes(0);
    expect(result).toStrictEqual([
      {
        alias: 'main',
        path: 'someFile.yaml',
      },
    ]);
  });

  it('should exit with error in case if invalid path provided as args', async () => {
    const apisConfig = {
      apis: {},
    };
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => false);
    await getFallbackApisOrExit(['someFile.yaml'], apisConfig);

    expect(process.stderr.write).toHaveBeenCalledWith(
      '\n someFile.yaml does not exist or is invalid. Please provide a valid path. \n\n'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit with error in case if invalid 2 path provided as args', async () => {
    const apisConfig = {
      apis: {},
    };
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => false);
    await getFallbackApisOrExit(['someFile.yaml', 'someFile2.yaml'], apisConfig);

    expect(process.stderr.write).lastCalledWith(
      '\n someFile2.yaml does not exist or is invalid. Please provide a valid path. \n\n'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should exit with error if only one file exist ', async () => {
    const apisStub = {
      ...apis,
      notExist: {
        root: 'notExist.yaml',
        styleguide: {},
      },
    };
    const configStub = { apis: apisStub };

    (existsSync as jest.Mock<any, any>).mockImplementationOnce((path) => path === 'someFile.yaml');

    await getFallbackApisOrExit(undefined, configStub);

    expect(process.stderr.write).toBeCalledWith(
      '\n notExist.yaml does not exist or is invalid. Please provide a valid path. \n\n'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should work ok if it is url passed', async () => {
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => false);
    (isAbsoluteUrl as jest.Mock<any, any>).mockImplementation(() => true);
    const apisConfig = {
      apis: {
        main: {
          root: 'https://someLinkt/petstore.yaml?main',
          styleguide: {},
        },
      },
    };

    const result = await getFallbackApisOrExit(undefined, apisConfig);

    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(process.exit).toHaveBeenCalledTimes(0);
    expect(result).toStrictEqual([
      {
        alias: 'main',
        path: 'https://someLinkt/petstore.yaml?main',
      },
    ]);
  });
});

describe('langToExt', () => {
  it.each([
    ['php', '.php'],
    ['c#', '.cs'],
    ['shell', '.sh'],
    ['curl', '.sh'],
    ['bash', '.sh'],
    ['javascript', '.js'],
    ['js', '.js'],
    ['python', '.py'],
  ])('should infer file extension from lang - %s', (lang, expected) => {
    expect(langToExt(lang)).toBe(expected);
  });

  it('should ignore case when inferring file extension', () => {
    expect(langToExt('JavaScript')).toBe('.js');
  });
});
