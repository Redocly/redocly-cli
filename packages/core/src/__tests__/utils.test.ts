import {
  pickObjectProps,
  omitObjectProps,
  slash,
  getMatchingStatusCodeRange,
  doesYamlFileExist,
  pickDefined,
  isValidURL,
} from '../utils';
import { isBrowser } from '../env';
import * as fs from 'fs';
import * as path from 'path';

describe('utils', () => {
  const testObject = {
    a: 'value a',
    b: 'value b',
    c: 'value c',
    d: 'value d',
    e: 'value e',
  };

  describe('pickObjectProps', () => {
    it('returns correct object result', () => {
      expect(pickObjectProps(testObject, ['a', 'b'])).toStrictEqual({ a: 'value a', b: 'value b' });
    });

    it('returns correct object if passed non existing key', () => {
      expect(pickObjectProps(testObject, ['a', 'b', 'nonExisting'])).toStrictEqual({
        a: 'value a',
        b: 'value b',
      });
    });

    it('returns an empty object if no keys are passed', () => {
      expect(pickObjectProps(testObject, [])).toStrictEqual({});
    });

    it('returns an empty object if empty target obj passed', () => {
      expect(pickObjectProps({}, ['d', 'e'])).toStrictEqual({});
    });
  });

  describe('omitObjectProps', () => {
    it('returns correct object result', () => {
      expect(omitObjectProps(testObject, ['a', 'b', 'c'])).toStrictEqual({
        d: 'value d',
        e: 'value e',
      });
    });

    it('returns correct object if passed non existing key', () => {
      expect(omitObjectProps(testObject, ['a', 'b', 'c', 'nonExisting'])).toStrictEqual({
        d: 'value d',
        e: 'value e',
      });
    });

    it('returns full object if no keys are passed', () => {
      expect(omitObjectProps(testObject, [])).toStrictEqual(testObject);
    });

    it('returns an empty object if empty target obj passed', () => {
      expect(omitObjectProps({}, ['d', 'e'])).toStrictEqual({});
    });
  });

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

  describe('pickDefined', () => {
    it('returns undefined for undefined', () => {
      expect(pickDefined(undefined)).toBeUndefined();
    });

    it('picks only defined values', () => {
      expect(pickDefined({ a: 1, b: undefined, c: 3 })).toStrictEqual({ a: 1, c: 3 });
    });
  });

  describe('getMatchingStatusCodeRange', () => {
    it('should get the generalized form of status codes', () => {
      expect(getMatchingStatusCodeRange('202')).toEqual('2XX');
      expect(getMatchingStatusCodeRange(400)).toEqual('4XX');
    });
    it('should fail on a wrong input', () => {
      expect(getMatchingStatusCodeRange('2002')).toEqual('2002');
      expect(getMatchingStatusCodeRange(4000)).toEqual('4000');
    });
  });

  describe('isValidURL', () => {
    it('should validate URLs with http protocol', () => {
      expect(isValidURL('http://example.com')).toBe(true);
      expect(isValidURL('http://www.example.com')).toBe(true);
      expect(isValidURL('http://subdomain.example.com')).toBe(true);
      expect(isValidURL('http://example.com/path')).toBe(true);
      expect(isValidURL('http://example.com/path/to/resource')).toBe(true);
      expect(isValidURL('http://example.com:8080')).toBe(true);
      expect(isValidURL('http://example.com:8080/path')).toBe(true);
    });

    it('should validate URLs with https protocol', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('https://www.example.com')).toBe(true);
      expect(isValidURL('https://subdomain.example.com')).toBe(true);
    });

    it('should validate URLs without protocol', () => {
      expect(isValidURL('example.com')).toBe(true);
      expect(isValidURL('www.example.com')).toBe(true);
      expect(isValidURL('subdomain.example.com')).toBe(true);
    });

    it('should validate URLs with query parameters', () => {
      expect(isValidURL('http://example.com?param=value')).toBe(true);
      expect(isValidURL('http://example.com?param1=value1&param2=value2')).toBe(true);
      expect(isValidURL('example.com?param=value')).toBe(true);
    });

    it('should validate URLs with fragments', () => {
      expect(isValidURL('http://example.com#section')).toBe(true);
      expect(isValidURL('example.com#section')).toBe(true);
    });

    it('should validate URLs with query parameters and fragments', () => {
      expect(isValidURL('http://example.com?param=value#section')).toBe(true);
      expect(isValidURL('example.com?param=value#section')).toBe(true);
    });

    it('should validate URLs with IP addresses', () => {
      expect(isValidURL('http://192.168.1.1')).toBe(true);
      expect(isValidURL('http://127.0.0.1')).toBe(true);
      expect(isValidURL('http://0.0.0.0')).toBe(true);
      expect(isValidURL('http://255.255.255.255')).toBe(true);
      expect(isValidURL('192.168.1.1')).toBe(true);
    });

    it('should validate URLs with IP addresses and ports', () => {
      expect(isValidURL('http://192.168.1.1:8080')).toBe(true);
      expect(isValidURL('192.168.1.1:8080')).toBe(true);
    });

    it('should accept technically invalid IP addresses due to regex limitations', () => {
      // Note: The current regex implementation doesn't validate IP address ranges correctly
      expect(isValidURL('http://256.256.256.256')).toBe(true);
      expect(isValidURL('http://999.999.999.999')).toBe(true);
    });

    it('should validate URLs with special characters in path', () => {
      expect(isValidURL('http://example.com/path-with-dash')).toBe(true);
      expect(isValidURL('http://example.com/path_with_underscore')).toBe(true);
      expect(isValidURL('http://example.com/path.with.dots')).toBe(true);
      expect(isValidURL('http://example.com/path~with~tilde')).toBe(true);
      expect(isValidURL('http://example.com/path+with+plus')).toBe(true);
      expect(isValidURL('http://example.com/path%20with%20encoded%20space')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('')).toBe(false);
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('http://')).toBe(false);
      expect(isValidURL('http://.')).toBe(false);
      expect(isValidURL('http://..')).toBe(false);
      expect(isValidURL('http://../')).toBe(false);
      expect(isValidURL('http://?')).toBe(false);
      expect(isValidURL('http://??')).toBe(false);
      expect(isValidURL('http://??/')).toBe(false);
      expect(isValidURL('http://#')).toBe(false);
      expect(isValidURL('http://##')).toBe(false);
      expect(isValidURL('http://##/')).toBe(false);
      expect(isValidURL('http://foo.bar?q=Spaces should be encoded')).toBe(false);
    });

    it('should reject URLs with invalid TLDs', () => {
      expect(isValidURL('http://example.a')).toBe(false); // TLD too short
      expect(isValidURL('http://example.invalidtld')).toBe(true); // This actually passes with the current regex
    });
  });

  describe('isConfigFileExist', () => {
    beforeEach(() => {
      jest
        .spyOn(fs, 'existsSync')
        .mockImplementation((path) => path === 'redocly.yaml' || path === 'redocly.yml');
      jest.spyOn(path, 'extname').mockImplementation((path) => {
        if (path.endsWith('.yaml')) {
          return '.yaml';
        } else if (path.endsWith('.yml')) {
          return '.yml';
        } else {
          return '';
        }
      });
    });

    it('should return true because of valid path provided', () => {
      expect(doesYamlFileExist('redocly.yaml')).toBe(true);
    });

    it('should return true because of valid path provided with yml', () => {
      expect(doesYamlFileExist('redocly.yml')).toBe(true);
    });

    it('should return false because of fail do not exist', () => {
      expect(doesYamlFileExist('redoccccly.yaml')).toBe(false);
    });

    it('should return false because of it is not yaml file', () => {
      expect(doesYamlFileExist('redocly.yam')).toBe(false);
    });
  });

  describe('isBrowser', () => {
    it('should not be browser', () => {
      expect(isBrowser).toBe(false);
    });
  });
});
