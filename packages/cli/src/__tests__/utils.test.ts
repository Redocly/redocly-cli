import { isSubdir, slash } from '../utils';

jest.mock("os");


describe('slash path', () => {
  it('can correctly slash path', () => {
    [
      ['foo\\bar', 'foo/bar'],
      ['foo/bar', 'foo/bar'],
      ['foo\\中文', 'foo/中文'],
      ['foo/中文', 'foo/中文'],
    ].forEach(([path, expectRes]) => {
      expect(slash(path)).toBe(expectRes);
    });
  });

  it('does not modify extended length paths', () => {
    const extended = '\\\\?\\some\\path';
    expect(slash(extended)).toBe(extended);
  });
});

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
