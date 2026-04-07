import * as fs from 'node:fs';
import * as path from 'node:path';

import { isBrowser } from '../env.js';
import type { Oas3_2Components } from '../typings/openapi.js';
import { doesYamlFileExist } from '../utils/does-yaml-file-exist.js';
import { getMatchingStatusCodeRange } from '../utils/get-matching-status-code-range.js';
import { isCustomRuleId } from '../utils/is-custom-rule-id.js';
import { isNotEmptyArray } from '../utils/is-not-empty-array.js';
import { isNotEmptyObject } from '../utils/is-not-empty-object.js';
import { isTruthy } from '../utils/is-truthy.js';
import { hasComponent } from '../utils/oas-has-component.js';
import { slash } from '../utils/slash.js';
import { splitCamelCaseIntoWords } from '../utils/split-camel-case-into-words.js';
import { validateMimeType, validateMimeTypeOAS3 } from '../utils/validate-mime-type.js';

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

  describe('splitCamelCaseIntoWords', () => {
    it('should split camel case into words with multiple words', () => {
      expect(splitCamelCaseIntoWords('fooBarBaz')).toEqual(new Set(['foo', 'bar', 'baz']));
    });

    it('should split camel case into words with multiple words and spaces', () => {
      expect(splitCamelCaseIntoWords('')).toEqual(new Set());
    });
  });

  describe('validateMimeType', () => {
    it('should validate mime type without reporting errors', () => {
      const report = vi.fn();
      validateMimeType(
        { type: 'consumes', value: { consumes: ['application/json'] } },
        { report, location: { child: () => ({ key: () => ({}) as any }) } } as any,
        ['application/json']
      );
      expect(report).not.toHaveBeenCalled();
    });

    it('should report error for invalid mime type', () => {
      const report = vi.fn();
      validateMimeType(
        { type: 'consumes', value: { consumes: ['text/plain'] } },
        { report, location: { child: () => ({ key: () => ({}) as any }) } } as any,
        ['application/json']
      );
      expect(report).toHaveBeenCalledWith({
        message: 'Mime type "text/plain" is not allowed',
        location: {},
      });
    });

    it('should throw error if allowedValues is not provided', () => {
      expect(() =>
        validateMimeType(
          { type: 'consumes', value: { consumes: ['application/json'] } },
          { report: () => {}, location: { child: () => ({ key: () => ({}) as any }) } } as any,
          // @ts-expect-error
          undefined
        )
      ).toThrow('Parameter "allowedValues" is not provided for "request-mime-type" rule');
    });
  });

  describe('validateMimeTypeOAS3', () => {
    it('should validate mime type without reporting errors', () => {
      const report = vi.fn();
      validateMimeTypeOAS3(
        {
          type: 'consumes',
          value: { content: { 'application/json': { schema: { type: 'string' } } } },
        },
        {
          report,
          location: { child: () => ({ child: () => ({ key: () => ({}) as any }) }) },
        } as any,
        ['application/json']
      );
      expect(report).not.toHaveBeenCalled();
    });

    it('should report error for invalid mime type', () => {
      const report = vi.fn();
      validateMimeTypeOAS3(
        { type: 'consumes', value: { content: { 'text/plain': { schema: { type: 'string' } } } } },
        {
          report,
          location: { child: () => ({ child: () => ({ key: () => ({}) as any }) }) },
        } as any,
        ['application/json']
      );
      expect(report).toHaveBeenCalledWith({
        message: 'Mime type "text/plain" is not allowed',
        location: {},
      });
    });

    it('should throw error if allowedValues is not provided', () => {
      expect(() =>
        validateMimeTypeOAS3(
          {
            type: 'consumes',
            value: { content: { 'application/json': { schema: { type: 'string' } } } },
          },
          {
            report: () => {},
            location: { child: () => ({ child: () => ({ key: () => ({}) as any }) }) },
          } as any,
          // @ts-expect-error
          undefined
        )
      ).toThrow('Parameter "allowedValues" is not provided for "request-mime-type" rule');
    });
  });

  describe('isCustomRuleId', () => {
    it('should return true if the id is a custom rule id', () => {
      expect(isCustomRuleId('custom/rule')).toBe(true);
    });

    it('should return false if the id is not a custom rule id', () => {
      expect(isCustomRuleId('rule')).toBe(false);
    });
  });

  describe('hasComponent', () => {
    it('returns true for OAS 3.2-only component (mediaTypes)', () => {
      const components = {
        mediaTypes: {
          JsonPayload: {
            'application/json': {
              schema: { type: 'string' },
            },
          },
        },
      } as Oas3_2Components;

      expect(hasComponent(components, 'mediaTypes')).toBe(true);
    });

    it('returns false for OAS 3.1 components when querying OAS 3.2-only key', () => {
      const components = {
        schemas: {
          Foo: { type: 'string' },
        },
      };

      expect(hasComponent(components, 'mediaTypes')).toBe(false);
    });

    it('returns true for common component across all OAS versions', () => {
      const components = {
        schemas: {
          Foo: { type: 'string' },
        },
      };

      expect(hasComponent(components, 'schemas')).toBe(true);
    });
  });
});
