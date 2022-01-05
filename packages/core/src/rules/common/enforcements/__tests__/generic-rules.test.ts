import { rules as genericRules } from '../generic-rules';

describe('oas3 enforcements', () => {
  describe('generic rules', () => {
    const fakeNode = {
      foo: '',
      bar: '',
      baz: ''
    };

    describe('pattern', () => {
      it('value should match regex pattern',  () => {
        expect(genericRules.pattern('test string', '/test/')).toBeTruthy();
      });
      it('value should not match regex pattern',  () => {
        expect(genericRules.pattern('test string', '/test me/')).toBeFalsy();
      });
    });

    describe('enum', () => {
      it('value should be among predefined keys',  () => {
        expect(genericRules.enum('test', ['test', 'example'])).toBeTruthy();
      });
      it('value should not be among predefined keys',  () => {
        expect(genericRules.enum('test', ['foo', 'example'])).toBeFalsy();
      });
    });

    describe('defined', () => {
      it('value should be defined',  () => {
        expect(genericRules.defined('test', true)).toBeTruthy();
        expect(genericRules.defined(undefined, true)).toBeFalsy();
      });
      it('value should be undefined',  () => {
        expect(genericRules.defined(undefined, false)).toBeTruthy();
        expect(genericRules.defined('test', false)).toBeFalsy();
      });
    });

    describe('undefined', () => {
      it('value should be undefined',  () => {
        expect(genericRules.undefined(undefined, true)).toBeTruthy();
        expect(genericRules.undefined('test', true)).toBeFalsy();
      });
      it('value should be defined',  () => {
        expect(genericRules.undefined('test', false)).toBeTruthy();
        expect(genericRules.undefined(undefined, false)).toBeFalsy();
      });
    });

    describe('nonEmpty', () => {
      it('value should not be empty',  () => {
        expect(genericRules.nonEmpty('test', true)).toBeTruthy();
        expect(genericRules.nonEmpty('', true)).toBeFalsy();
        expect(genericRules.nonEmpty(null, true)).toBeFalsy();
        expect(genericRules.nonEmpty(undefined, true)).toBeFalsy();
      });
      it('value should be empty',  () => {
        expect(genericRules.nonEmpty('', false)).toBeTruthy();
        expect(genericRules.nonEmpty(null, false)).toBeTruthy();
        expect(genericRules.nonEmpty(undefined, false)).toBeTruthy();
        expect(genericRules.nonEmpty('test', false)).toBeFalsy();
      });
    });

    describe('length', () => {
      it('value should be 4 symbols length',  () => {
        expect(genericRules.length('test', 4)).toBeTruthy();
        expect(genericRules.length([1, 2, 3, 4], 4)).toBeTruthy();
        expect(genericRules.length('example', 4)).toBeFalsy();
        expect(genericRules.length([], 4)).toBeFalsy();
        expect(genericRules.length('', 4)).toBeFalsy();
      });
    });

    describe('minLength', () => {
      it('value should have less or equal than 5 symbols length',  () => {
        expect(genericRules.minLength('test', 5)).toBeFalsy();
        expect(genericRules.minLength([1, 2, 3, 4], 5)).toBeFalsy();
        expect(genericRules.minLength([1, 2, 3, 4, 5], 5)).toBeTruthy();
        expect(genericRules.minLength([1, 2, 3, 4, 5, 6], 5)).toBeTruthy();
        expect(genericRules.minLength('example', 5)).toBeTruthy();
        expect(genericRules.minLength([], 5)).toBeFalsy();
        expect(genericRules.minLength('', 5)).toBeFalsy();
      });
    });

    describe('maxLength', () => {
      it('value should have more or equal than 5 symbols length',  () => {
        expect(genericRules.maxLength('test', 5)).toBeTruthy();
        expect(genericRules.maxLength([1, 2, 3, 4], 5)).toBeTruthy();
        expect(genericRules.maxLength([1, 2, 3, 4, 5], 5)).toBeTruthy();
        expect(genericRules.maxLength([1, 2, 3, 4, 5, 6], 5)).toBeFalsy();
        expect(genericRules.maxLength('example', 5)).toBeFalsy();
        expect(genericRules.maxLength([], 5)).toBeTruthy();
        expect(genericRules.maxLength('', 5)).toBeTruthy();
      });
    });

    describe('casing', () => {
      it('value should be camelCase',  () => {
        expect(genericRules.casing('testExample', 'camelCase')).toBeTruthy();
        expect(genericRules.casing('TestExample', 'camelCase')).toBeFalsy();
        expect(genericRules.casing('test-example', 'camelCase')).toBeFalsy();
        expect(genericRules.casing('test_example', 'camelCase')).toBeFalsy();
      });
      it('value should be PascalCase',  () => {
        expect(genericRules.casing('TestExample', 'PascalCase')).toBeTruthy();
        expect(genericRules.casing('testExample', 'PascalCase')).toBeFalsy();
        expect(genericRules.casing('test-example', 'PascalCase')).toBeFalsy();
        expect(genericRules.casing('test_example', 'PascalCase')).toBeFalsy();
      });
      it('value should be kebab-case',  () => {
        expect(genericRules.casing('test-example', 'kebab-case')).toBeTruthy();
        expect(genericRules.casing('testExample', 'kebab-case')).toBeFalsy();
        expect(genericRules.casing('TestExample', 'kebab-case')).toBeFalsy();
        expect(genericRules.casing('test_example', 'kebab-case')).toBeFalsy();
      });
      it('value should be snake_case',  () => {
        expect(genericRules.casing('test_example', 'snake_case')).toBeTruthy();
        expect(genericRules.casing('testExample', 'snake_case')).toBeFalsy();
        expect(genericRules.casing('TestExample', 'snake_case')).toBeFalsy();
        expect(genericRules.casing('test-example', 'snake_case')).toBeFalsy();
      });
    });

    describe('sortOrder', () => {
      it('value should be ordered in ASC direction',  () => {
        expect(genericRules.sortOrder(['example', 'foo', 'test'], 'asc')).toBeTruthy();
        expect(genericRules.sortOrder(['example', 'foo', 'test'], {direction: 'asc'})).toBeTruthy();
        expect(genericRules.sortOrder(['example'], 'asc')).toBeTruthy();
        expect(genericRules.sortOrder(['example', 'test', 'foo'], 'asc')).toBeFalsy();
        expect(genericRules.sortOrder(['example', 'foo', 'test'], 'desc')).toBeFalsy();
        expect(genericRules.sortOrder([{name: 'bar'}, {name: 'baz'}, {name: 'foo'}], {direction: 'asc', property: 'name'})).toBeTruthy();
        expect(genericRules.sortOrder([{name: 'bar'}, {name: 'baz'}, {name: 'foo'}], {direction: 'desc', property: 'name'})).toBeFalsy();
      });
      it('value should be ordered in DESC direction',  () => {
        expect(genericRules.sortOrder(['test', 'foo', 'example'], 'desc')).toBeTruthy();
        expect(genericRules.sortOrder(['test', 'foo', 'example'], {direction: 'desc'})).toBeTruthy();
        expect(genericRules.sortOrder(['example'], 'desc')).toBeTruthy();
        expect(genericRules.sortOrder(['example', 'test', 'foo'], 'desc')).toBeFalsy();
        expect(genericRules.sortOrder(['test', 'foo', 'example'], 'asc')).toBeFalsy();
        expect(genericRules.sortOrder([{name: 'foo'}, {name: 'baz'}, {name: 'bar'}], {direction: 'desc', property: 'name'})).toBeTruthy();
        expect(genericRules.sortOrder([{name: 'foo'}, {name: 'baz'}, {name: 'bar'}], {direction: 'asc', property: 'name'})).toBeFalsy();
      });
    });

    describe('mutuallyExclusive', () => {
      it('node should not have more than one property from predefined list',  () => {
        expect(genericRules.mutuallyExclusive(fakeNode, ['foo', 'test'])).toBeTruthy();
        expect(genericRules.mutuallyExclusive(fakeNode, [])).toBeTruthy();
        expect(genericRules.mutuallyExclusive(fakeNode, ['foo', 'bar'])).toBeFalsy();
        expect(genericRules.mutuallyExclusive(fakeNode, ['foo', 'bar', 'test'])).toBeFalsy();
      });
    });

    describe('mutuallyRequired', () => {
      it('node should have all the properties from predefined list',  () => {
        expect(genericRules.mutuallyRequired(fakeNode, ['foo', 'bar'])).toBeTruthy();
        expect(genericRules.mutuallyRequired(fakeNode, ['foo', 'bar', 'baz'])).toBeTruthy();
        expect(genericRules.mutuallyRequired(fakeNode, [])).toBeTruthy();
        expect(genericRules.mutuallyRequired(fakeNode, ['foo', 'test'])).toBeFalsy();
        expect(genericRules.mutuallyRequired(fakeNode, ['foo', 'bar', 'test'])).toBeFalsy();
      });
    });
  });
});
