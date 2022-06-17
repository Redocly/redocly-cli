import { Location } from '../../../../ref-utils';
import { Source } from '../../../../resolve';
import { asserts } from '../asserts';

let baseLocation = new Location(jest.fn() as any as Source, 'pointer');

describe('oas3 assertions', () => {
  describe('generic rules', () => {
    const fakeNode = {
      foo: '',
      bar: '',
      baz: '',
    };

    describe('pattern', () => {
      it('value should match regex pattern', () => {
        expect(asserts.pattern('test string', '/test/', baseLocation)).toEqual({ isValid: true });
        expect(asserts.pattern('test string', '/test me/', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.pattern(['test string', 'test me'], '/test/', baseLocation)).toEqual({ isValid: true });
        expect(asserts.pattern(['test string', 'test me'], '/test me/', baseLocation)).toEqual({ isValid: false, location: baseLocation.key() });
        expect(asserts.pattern('./components/smth/test.yaml', '/^(./)?components/.*.yaml$/', baseLocation)).toEqual({ isValid: true });
        expect(asserts.pattern('./other.yaml', '/^(./)?components/.*.yaml$/', baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
    });

    describe('ref', () => {
      it('value should have ref', () => {
        expect(asserts.ref({ $ref: 'text' }, true, baseLocation, { $ref: 'text' })).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.ref({}, true, baseLocation, {})).toEqual({ isValid: false, location: baseLocation.key() });
      });

      it('value should not have ref', () => {
        expect(asserts.ref({ $ref: 'text' }, false, baseLocation, { $ref: 'text' })).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.ref({}, false, baseLocation, {})).toEqual({ isValid: true, location: baseLocation.key() });
      });

      it('value should match regex pattern', () => {
        expect(asserts.ref({ $ref: 'test string' }, '/test/', baseLocation, { $ref: 'test string' })).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.ref({ $ref: 'test string' }, '/test me/', baseLocation, { $ref: 'test string' })).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.ref({ $ref: './components/smth/test.yaml' }, '/^(./)?components/.*.yaml$/', baseLocation, { $ref: './components/smth/test.yaml' })).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.ref({ $ref: './paths/smth/test.yaml' }, '/^(./)?components/.*.yaml$/', baseLocation, { $ref: './paths/smth/test.yaml' })).toEqual({ isValid: false, location: baseLocation });
      });
    });

    describe('enum', () => {
      it('value should be among predefined keys', () => {
        expect(asserts.enum('test', ['test', 'example'], baseLocation)).toEqual({ isValid: true });
        expect(asserts.enum(['test'], ['test', 'example'], baseLocation)).toEqual({ isValid: true });
        expect(asserts.enum(['test', 'example'], ['test', 'example'], baseLocation)).toEqual({ isValid: true });
        expect(asserts.enum(['test', 'example', 'foo'], ['test', 'example'], baseLocation)).toEqual({ isValid: false, location: baseLocation.child('foo').key() });
        expect(asserts.enum('test', ['foo', 'example'], baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.enum(['test', 'foo'], ['test', 'example'], baseLocation)).toEqual({ isValid: false, location: baseLocation.child('foo').key() });
      });
    });

    describe('defined', () => {
      it('value should be defined', () => {
        expect(asserts.defined('test', true, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.defined(undefined, true, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be undefined', () => {
        expect(asserts.defined(undefined, false, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.defined('test', false, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
    });

    describe('undefined', () => {
      it('value should be undefined', () => {
        expect(asserts.undefined(undefined, true, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.undefined('test', true, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be defined', () => {
        expect(asserts.undefined('test', false, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.undefined(undefined, false, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
    });

    describe('required', () => {
      it('values should be required', () => {
        expect(asserts.required(['one', 'two', 'three'], ['one', 'two'], baseLocation)).toEqual({ isValid: true });
        expect(asserts.required(['one', 'two'], ['one', 'two', 'three'], baseLocation)).toEqual({ isValid: false, location: baseLocation.key() });
      });
    });

    describe('nonEmpty', () => {
      it('value should not be empty', () => {
        expect(asserts.nonEmpty('test', true, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.nonEmpty('', true, baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.nonEmpty(null, true, baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.nonEmpty(undefined, true, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be empty', () => {
        expect(asserts.nonEmpty('', false, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.nonEmpty(null, false, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.nonEmpty(undefined, false, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.nonEmpty('test', false, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
    });

    describe('minLength', () => {
      it('value should have less or equal than 5 symbols length', () => {
        expect(asserts.minLength('test', 5, baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.minLength([1, 2, 3, 4], 5, baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.minLength([1, 2, 3, 4, 5], 5, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.minLength([1, 2, 3, 4, 5, 6], 5, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.minLength('example', 5, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.minLength([], 5, baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.minLength('', 5, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
    });

    describe('maxLength', () => {
      it('value should have more or equal than 5 symbols length', () => {
        expect(asserts.maxLength('test', 5, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.maxLength([1, 2, 3, 4], 5, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.maxLength([1, 2, 3, 4, 5], 5, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.maxLength([1, 2, 3, 4, 5, 6], 5, baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.maxLength('example', 5, baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.maxLength([], 5, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.maxLength('', 5, baseLocation)).toEqual({ isValid: true, location: baseLocation });
      });
    });

    describe('casing', () => {
      it('value should be camelCase', () => {
        expect(asserts.casing(['testExample', 'fooBar'], 'camelCase', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['testExample', 'FooBar'], 'camelCase', baseLocation)).toEqual({ isValid: false, location: baseLocation.child('FooBar').key() });
        expect(asserts.casing('testExample', 'camelCase', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing('TestExample', 'camelCase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test-example', 'camelCase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test_example', 'camelCase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be PascalCase', () => {
        expect(asserts.casing('TestExample', 'PascalCase', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['TestExample', 'FooBar'], 'PascalCase', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['TestExample', 'fooBar'], 'PascalCase', baseLocation)).toEqual({ isValid: false, location: baseLocation.child('fooBar').key() });
        expect(asserts.casing('testExample', 'PascalCase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test-example', 'PascalCase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test_example', 'PascalCase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be kebab-case', () => {
        expect(asserts.casing('test-example', 'kebab-case', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['test-example', 'foo-bar'], 'kebab-case', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['test-example', 'foo_bar'], 'kebab-case', baseLocation)).toEqual({ isValid: false, location: baseLocation.child('foo_bar').key() });
        expect(asserts.casing('testExample', 'kebab-case', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TestExample', 'kebab-case', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test_example', 'kebab-case', baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be snake_case', () => {
        expect(asserts.casing('test_example', 'snake_case', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['test_example', 'foo_bar'], 'snake_case', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['test_example', 'foo-bar'], 'snake_case', baseLocation)).toEqual({ isValid: false, location: baseLocation.child('foo-bar').key() });
        expect(asserts.casing('testExample', 'snake_case', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TestExample', 'snake_case', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test-example', 'snake_case', baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be MACRO_CASE', () => {
        expect(asserts.casing('TEST_EXAMPLE', 'MACRO_CASE', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['TEST_EXAMPLE', 'FOO_BAR'], 'MACRO_CASE', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['TEST_EXAMPLE', 'FOO-BAR'], 'MACRO_CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation.child('FOO-BAR').key() });
        expect(asserts.casing('TEST_EXAMPLE_', 'MACRO_CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('_TEST_EXAMPLE', 'MACRO_CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TEST__EXAMPLE', 'MACRO_CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TEST-EXAMPLE', 'MACRO_CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('testExample', 'MACRO_CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TestExample', 'MACRO_CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test-example', 'MACRO_CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be COBOL-CASE', () => {
        expect(asserts.casing('TEST-EXAMPLE', 'COBOL-CASE', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['TEST-EXAMPLE', 'FOO-BAR'], 'COBOL-CASE', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['TEST-EXAMPLE', 'FOO_BAR'], 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation.child('FOO_BAR').key() });
        expect(asserts.casing('TEST-EXAMPLE-', 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('0TEST-EXAMPLE', 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('-TEST-EXAMPLE', 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TEST--EXAMPLE', 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TEST_EXAMPLE', 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('testExample', 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TestExample', 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test-example', 'COBOL-CASE', baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be flatcase', () => {
        expect(asserts.casing('testexample', 'flatcase', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['testexample', 'foobar'], 'flatcase', baseLocation)).toEqual({ isValid: true });
        expect(asserts.casing(['testexample', 'foo_bar'], 'flatcase', baseLocation)).toEqual({ isValid: false, location: baseLocation.child('foo_bar').key() });
        expect(asserts.casing('testexample_', 'flatcase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('0testexample', 'flatcase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('testExample', 'flatcase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('TestExample', 'flatcase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.casing('test-example', 'flatcase', baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
    });

    describe.skip('sortOrder', () => {
      it('value should be ordered in ASC direction', () => {
        expect(asserts.sortOrder(['example', 'foo', 'test'], 'asc', baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.sortOrder(['example', 'foo', 'test'], { direction: 'asc' }, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.sortOrder(['example'], 'asc', baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.sortOrder(['example', 'test', 'foo'], 'asc', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.sortOrder(['example', 'foo', 'test'], 'desc', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.sortOrder([{ name: 'bar' }, { name: 'baz' }, { name: 'foo' }], { direction: 'asc', property: 'name' }, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.sortOrder([{ name: 'bar' }, { name: 'baz' }, { name: 'foo' }], { direction: 'desc', property: 'name' }, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
      it('value should be ordered in DESC direction', () => {
        expect(asserts.sortOrder(['test', 'foo', 'example'], 'desc', baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.sortOrder(['test', 'foo', 'example'], { direction: 'desc' }, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.sortOrder(['example'], 'desc', baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.sortOrder(['example', 'test', 'foo'], 'desc', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.sortOrder(['test', 'foo', 'example'], 'asc', baseLocation)).toEqual({ isValid: false, location: baseLocation });
        expect(asserts.sortOrder([{ name: 'foo' }, { name: 'baz' }, { name: 'bar' }], { direction: 'desc', property: 'name' }, baseLocation)).toEqual({ isValid: true, location: baseLocation });
        expect(asserts.sortOrder([{ name: 'foo' }, { name: 'baz' }, { name: 'bar' }], { direction: 'asc', property: 'name' }, baseLocation)).toEqual({ isValid: false, location: baseLocation });
      });
    });

    describe('mutuallyExclusive', () => {
      it('node should not have more than one property from predefined list', () => {
        expect(asserts.mutuallyExclusive(Object.keys(fakeNode), ['foo', 'test'], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
        expect(asserts.mutuallyExclusive(Object.keys(fakeNode), [], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
        expect(asserts.mutuallyExclusive(Object.keys(fakeNode), ['foo', 'bar'], baseLocation)).toEqual({ isValid: false, location: baseLocation.key() });
        expect(asserts.mutuallyExclusive(Object.keys(fakeNode), ['foo', 'bar', 'test'], baseLocation)).toEqual({ isValid: false, location: baseLocation.key() });
      });
    });

    describe('mutuallyRequired', () => {
      it('node should have all the properties from predefined list', () => {
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'bar'], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'bar', 'baz'], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), [], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'test'], baseLocation)).toEqual({ isValid: false, location: baseLocation.key() });
        expect(asserts.mutuallyRequired(Object.keys(fakeNode), ['foo', 'bar', 'test'], baseLocation)).toEqual({ isValid: false, location: baseLocation.key() });
      });
    });

    describe('requireAny', () => {
      it('node must have at least one property from predefined list', () => {
        expect(asserts.requireAny(Object.keys(fakeNode), ['foo', 'test'], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
        expect(asserts.requireAny(Object.keys(fakeNode), ['test', 'bar'], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
        expect(asserts.requireAny(Object.keys(fakeNode), [], baseLocation)).toEqual({ isValid: false, location: baseLocation.key() });
        expect(asserts.requireAny(Object.keys(fakeNode), ['test', 'test1'], baseLocation)).toEqual({ isValid: false, location: baseLocation.key() });
        expect(asserts.requireAny(Object.keys(fakeNode), ['foo', 'bar'], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
        expect(asserts.requireAny(Object.keys(fakeNode), ['foo', 'bar', 'test'], baseLocation)).toEqual({ isValid: true, location: baseLocation.key() });
      });
    });
  });
});
