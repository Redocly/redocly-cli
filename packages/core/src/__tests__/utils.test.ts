import { pickObjectProps, omitObjectProps, slash, getMatchingStatusCodeRange } from '../utils';

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
});
