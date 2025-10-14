import { getMatchingStatusCodeRange } from '../utils.js';
import { slash } from '../utils/slash.js';
import { doesYamlFileExist } from '../utils/does-yaml-file-exist.js';
import { isBrowser } from '../env.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isTruthy } from '../utils/is-truthy.js';
import { isNotEmptyArray } from '../utils/is-not-empty-array.js';
import { isNotEmptyObject } from '../utils/is-not-empty-object.js';

vi.mock('node:fs');
vi.mock('node:path');

describe('utils', () => {
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

  describe('doesYamlFileExist', () => {
    beforeEach(() => {
      vi.spyOn(fs, 'existsSync').mockImplementation(
        (path) => path === 'redocly.yaml' || path === 'redocly.yml'
      );
      vi.spyOn(path, 'extname').mockImplementation((path) => {
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

  describe('isTruthy', () => {
    it('should return true for truthy values', () => {
      expect(isTruthy(true)).toBe(true);
      expect(isTruthy(1)).toBe(true);
      expect(isTruthy('foo')).toBe(true);
      expect(isTruthy({})).toBe(true);
      expect(isTruthy([])).toBe(true);
      expect(isTruthy(new Date())).toBe(true);
      expect(isTruthy(new Error())).toBe(true);
      expect(isTruthy(new Set())).toBe(true);
      expect(isTruthy(new Map())).toBe(true);
      expect(isTruthy(new Promise(() => {}))).toBe(true);
    });

    it('should return false for falsy values', () => {
      expect(isTruthy(false)).toBe(false);
      expect(isTruthy(0)).toBe(false);
      expect(isTruthy('')).toBe(false);
      expect(isTruthy(null)).toBe(false);
      expect(isTruthy(undefined)).toBe(false);
    });
  });

  describe('isNotEmptyArray', () => {
    it('should return true for non-empty arrays', () => {
      expect(isNotEmptyArray([1])).toBe(true);
    });

    it('should return false for empty arrays', () => {
      expect(isNotEmptyArray([])).toBe(false);
    });
  });

  describe('isNotEmptyObject', () => {
    it('should return true for non-empty objects', () => {
      expect(isNotEmptyObject({ a: 1 })).toBe(true);
    });

    it('should return false for empty objects', () => {
      expect(isNotEmptyObject({})).toBe(false);
    });
  });
});
