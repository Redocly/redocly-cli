import { isSubdir, pathToFilename, escapeLanguageName } from '../utils';

jest.mock("os");

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
    jest.resetModules()
  })
});


describe('pathToFilename', () => {
  it('should use correct path separator', () => {
    const processedPath = pathToFilename('/user/createWithList', '_');
    expect(processedPath).toEqual('user_createWithList');
  });
});

describe('escapeLanguageName', () => {
  it('should create correct folder name for code samples with # char', () => {
    const escapedName = escapeLanguageName('C#');
    expect(escapedName).toEqual('C_sharp');
  });

  it('should create correct folder name for code samples with / char', () => {
    const escapedName = escapeLanguageName('C/AL');
    expect(escapedName).toEqual('C_AL');
  });

  it('should create correct folder name for code samples with space char', () => {
    const escapedName = escapeLanguageName('Visual Basic');
    expect(escapedName).toEqual('VisualBasic');
  });

  it('should leave the folder name as is', () => {
    const escapedName = escapeLanguageName('PHP');
    expect(escapedName).toEqual('PHP');
  });
});
