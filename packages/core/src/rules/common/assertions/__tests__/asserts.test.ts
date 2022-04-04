import { asserts } from '../asserts';

describe('oas3 assertions', () => {
  describe('generic rules', () => {
    const fakeNode = {
      foo: '',
      bar: '',
      baz: '',
    };

    describe('pattern', () => {
      it('value should match regex pattern', () => {
        expect(asserts.pattern('test string', '/test/')).toBeTruthy();
        expect(asserts.pattern('test string', '/test me/')).toBeFalsy();
        expect(asserts.pattern(['test string', 'test me'], '/test/')).toBeTruthy();
        expect(asserts.pattern(['test string', 'test me'], '/test me/')).toBeFalsy();
      });
    });

    describe('enum', () => {
      it('value should be among predefined keys', () => {
        expect(asserts.enum('test', ['test', 'example'])).toBeTruthy();
        expect(asserts.enum(['test'], ['test', 'example'])).toBeTruthy();
        expect(asserts.enum(['test', 'example'], ['test', 'example'])).toBeTruthy();
        expect(asserts.enum(['test', 'example', 'foo'], ['test', 'example'])).toBeFalsy();
        expect(asserts.enum('test', ['foo', 'example'])).toBeFalsy();
        expect(asserts.enum(['test', 'foo'], ['test', 'example'])).toBeFalsy();
      });
    });

    describe('defined', () => {
      it('value should be defined', () => {
        expect(asserts.defined('test', true)).toBeTruthy();
        expect(asserts.defined(undefined, true)).toBeFalsy();
      });
      it('value should be undefined', () => {
        expect(asserts.defined(undefined, false)).toBeTruthy();
        expect(asserts.defined('test', false)).toBeFalsy();
      });
    });

    describe('undefined', () => {
      it('value should be undefined', () => {
        expect(asserts.undefined(undefined, true)).toBeTruthy();
        expect(asserts.undefined('test', true)).toBeFalsy();
      });
      it('value should be defined', () => {
        expect(asserts.undefined('test', false)).toBeTruthy();
        expect(asserts.undefined(undefined, false)).toBeFalsy();
      });
    });

    describe('required', () => {
      it('values should be required', () => {
        expect(asserts.required(['one', 'two', 'three'], ['one', 'two'])).toBeTruthy();
        expect(asserts.required(['one', 'two'], ['one', 'two', 'three'])).toBeFalsy();
      });
    });

    describe('nonEmpty', () => {
      it('value should not be empty', () => {
        expect(asserts.nonEmpty('test', true)).toBeTruthy();
        expect(asserts.nonEmpty('', true)).toBeFalsy();
        expect(asserts.nonEmpty(null, true)).toBeFalsy();
        expect(asserts.nonEmpty(undefined, true)).toBeFalsy();
      });
      it('value should be empty', () => {
        expect(asserts.nonEmpty('', false)).toBeTruthy();
        expect(asserts.nonEmpty(null, false)).toBeTruthy();
        expect(asserts.nonEmpty(undefined, false)).toBeTruthy();
        expect(asserts.nonEmpty('test', false)).toBeFalsy();
      });
    });

    describe('minLength', () => {
      it('value should have less or equal than 5 symbols length', () => {
        expect(asserts.minLength('test', 5)).toBeFalsy();
        expect(asserts.minLength([1, 2, 3, 4], 5)).toBeFalsy();
        expect(asserts.minLength([1, 2, 3, 4, 5], 5)).toBeTruthy();
        expect(asserts.minLength([1, 2, 3, 4, 5, 6], 5)).toBeTruthy();
        expect(asserts.minLength('example', 5)).toBeTruthy();
        expect(asserts.minLength([], 5)).toBeFalsy();
        expect(asserts.minLength('', 5)).toBeFalsy();
      });
    });

    describe('maxLength', () => {
      it('value should have more or equal than 5 symbols length', () => {
        expect(asserts.maxLength('test', 5)).toBeTruthy();
        expect(asserts.maxLength([1, 2, 3, 4], 5)).toBeTruthy();
        expect(asserts.maxLength([1, 2, 3, 4, 5], 5)).toBeTruthy();
        expect(asserts.maxLength([1, 2, 3, 4, 5, 6], 5)).toBeFalsy();
        expect(asserts.maxLength('example', 5)).toBeFalsy();
        expect(asserts.maxLength([], 5)).toBeTruthy();
        expect(asserts.maxLength('', 5)).toBeTruthy();
      });
    });

    describe('casing', () => {
      it('value should be camelCase', () => {
        expect(asserts.casing(['testExample', 'fooBar'], 'camelCase')).toBeTruthy();
        expect(asserts.casing(['testExample', 'FooBar'], 'camelCase')).toBeFalsy();
        expect(asserts.casing('testExample', 'camelCase')).toBeTruthy();
        expect(asserts.casing('TestExample', 'camelCase')).toBeFalsy();
        expect(asserts.casing('test-example', 'camelCase')).toBeFalsy();
        expect(asserts.casing('test_example', 'camelCase')).toBeFalsy();
      });
      it('value should be PascalCase', () => {
        expect(asserts.casing('TestExample', 'PascalCase')).toBeTruthy();
        expect(asserts.casing(['TestExample', 'FooBar'], 'PascalCase')).toBeTruthy();
        expect(asserts.casing(['TestExample', 'fooBar'], 'PascalCase')).toBeFalsy();
        expect(asserts.casing('testExample', 'PascalCase')).toBeFalsy();
        expect(asserts.casing('test-example', 'PascalCase')).toBeFalsy();
        expect(asserts.casing('test_example', 'PascalCase')).toBeFalsy();
      });
      it('value should be kebab-case', () => {
        expect(asserts.casing('test-example', 'kebab-case')).toBeTruthy();
        expect(asserts.casing(['test-example', 'foo-bar'], 'kebab-case')).toBeTruthy();
        expect(asserts.casing(['test-example', 'foo_bar'], 'kebab-case')).toBeFalsy();
        expect(asserts.casing('testExample', 'kebab-case')).toBeFalsy();
        expect(asserts.casing('TestExample', 'kebab-case')).toBeFalsy();
        expect(asserts.casing('test_example', 'kebab-case')).toBeFalsy();
      });
      it('value should be snake_case', () => {
        expect(asserts.casing('test_example', 'snake_case')).toBeTruthy();
        expect(asserts.casing(['test_example', 'foo_bar'], 'snake_case')).toBeTruthy();
        expect(asserts.casing(['test_example', 'foo-bar'], 'snake_case')).toBeFalsy();
        expect(asserts.casing('testExample', 'snake_case')).toBeFalsy();
        expect(asserts.casing('TestExample', 'snake_case')).toBeFalsy();
        expect(asserts.casing('test-example', 'snake_case')).toBeFalsy();
      });
      it('value should be MACRO_CASE', () => {
        expect(asserts.casing('TEST_EXAMPLE', 'MACRO_CASE')).toBeTruthy();
        expect(asserts.casing(['TEST_EXAMPLE', 'FOO_BAR'], 'MACRO_CASE')).toBeTruthy();
        expect(asserts.casing(['TEST_EXAMPLE', 'FOO-BAR'], 'MACRO_CASE')).toBeFalsy();
        expect(asserts.casing('TEST_EXAMPLE_', 'MACRO_CASE')).toBeFalsy();
        expect(asserts.casing('_TEST_EXAMPLE', 'MACRO_CASE')).toBeFalsy();
        expect(asserts.casing('TEST__EXAMPLE', 'MACRO_CASE')).toBeFalsy();
        expect(asserts.casing('TEST-EXAMPLE', 'MACRO_CASE')).toBeFalsy();
        expect(asserts.casing('testExample', 'MACRO_CASE')).toBeFalsy();
        expect(asserts.casing('TestExample', 'MACRO_CASE')).toBeFalsy();
        expect(asserts.casing('test-example', 'MACRO_CASE')).toBeFalsy();
      });
      it('value should be COBOL-CASE', () => {
        expect(asserts.casing('TEST-EXAMPLE', 'COBOL-CASE')).toBeTruthy();
        expect(asserts.casing(['TEST-EXAMPLE', 'FOO-BAR'], 'COBOL-CASE')).toBeTruthy();
        expect(asserts.casing(['TEST-EXAMPLE', 'FOO_BAR'], 'COBOL-CASE')).toBeFalsy();
        expect(asserts.casing('TEST-EXAMPLE-', 'COBOL-CASE')).toBeFalsy();
        expect(asserts.casing('0TEST-EXAMPLE', 'COBOL-CASE')).toBeFalsy();
        expect(asserts.casing('-TEST-EXAMPLE', 'COBOL-CASE')).toBeFalsy();
        expect(asserts.casing('TEST--EXAMPLE', 'COBOL-CASE')).toBeFalsy();
        expect(asserts.casing('TEST_EXAMPLE', 'COBOL-CASE')).toBeFalsy();
        expect(asserts.casing('testExample', 'COBOL-CASE')).toBeFalsy();
        expect(asserts.casing('TestExample', 'COBOL-CASE')).toBeFalsy();
        expect(asserts.casing('test-example', 'COBOL-CASE')).toBeFalsy();
      });
      it('value should be flatcase', () => {
        expect(asserts.casing('testexample', 'flatcase')).toBeTruthy();
        expect(asserts.casing(['testexample', 'foobar'], 'flatcase')).toBeTruthy();
        expect(asserts.casing(['testexample', 'foo_bar'], 'flatcase')).toBeFalsy();
        expect(asserts.casing('testexample_', 'flatcase')).toBeFalsy();
        expect(asserts.casing('0testexample', 'flatcase')).toBeFalsy();
        expect(asserts.casing('testExample', 'flatcase')).toBeFalsy();
        expect(asserts.casing('TestExample', 'flatcase')).toBeFalsy();
        expect(asserts.casing('test-example', 'flatcase')).toBeFalsy();
      });
    });

    describe.skip('sortOrder', () => {
      it('value should be ordered in ASC direction', () => {
        expect(asserts.sortOrder(['example', 'foo', 'test'], 'asc')).toBeTruthy();
        expect(asserts.sortOrder(['example', 'foo', 'test'], { direction: 'asc' })).toBeTruthy();
        expect(asserts.sortOrder(['example'], 'asc')).toBeTruthy();
        expect(asserts.sortOrder(['example', 'test', 'foo'], 'asc')).toBeFalsy();
        expect(asserts.sortOrder(['example', 'foo', 'test'], 'desc')).toBeFalsy();
        expect(
          asserts.sortOrder([{ name: 'bar' }, { name: 'baz' }, { name: 'foo' }], {
            direction: 'asc',
            property: 'name',
          }),
        ).toBeTruthy();
        expect(
          asserts.sortOrder([{ name: 'bar' }, { name: 'baz' }, { name: 'foo' }], {
            direction: 'desc',
            property: 'name',
          }),
        ).toBeFalsy();
      });
      it('value should be ordered in DESC direction', () => {
        expect(asserts.sortOrder(['test', 'foo', 'example'], 'desc')).toBeTruthy();
        expect(asserts.sortOrder(['test', 'foo', 'example'], { direction: 'desc' })).toBeTruthy();
        expect(asserts.sortOrder(['example'], 'desc')).toBeTruthy();
        expect(asserts.sortOrder(['example', 'test', 'foo'], 'desc')).toBeFalsy();
        expect(asserts.sortOrder(['test', 'foo', 'example'], 'asc')).toBeFalsy();
        expect(
          asserts.sortOrder([{ name: 'foo' }, { name: 'baz' }, { name: 'bar' }], {
            direction: 'desc',
            property: 'name',
          }),
        ).toBeTruthy();
        expect(
          asserts.sortOrder([{ name: 'foo' }, { name: 'baz' }, { name: 'bar' }], {
            direction: 'asc',
            property: 'name',
          }),
        ).toBeFalsy();
      });
    });

    describe('mutuallyExclusive', () => {
      it('node should not have more than one property from predefined list', () => {
        expect(asserts.mutuallyExclusive(Object.keys(fakeNode), ['foo', 'test'])).toBeTruthy();
        expect(asserts.mutuallyExclusive(Object.keys(fakeNode), [])).toBeTruthy();
        expect(asserts.mutuallyExclusive(Object.keys(fakeNode), ['foo', 'bar'])).toBeFalsy();
        expect(
          asserts.mutuallyExclusive(Object.keys(fakeNode), ['foo', 'bar', 'test']),
        ).toBeFalsy();
      });
    });

    describe('mutuallyRequired', () => {
      it('node should have all the properties from predefined list', () => {
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'bar'])).toBeTruthy();
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'bar', 'baz'])).toBeTruthy();
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), [])).toBeTruthy();
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'test'])).toBeFalsy();
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'bar', 'test'])).toBeFalsy();
      });
    });
  });
});
