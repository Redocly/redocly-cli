import { isEmpty } from '../is-empty.js';

describe('isEmpty', () => {
  describe('when value is null or undefined', () => {
    it('should return true', () => {
      expect(isEmpty(null)).toEqual(true);
      expect(isEmpty(undefined)).toEqual(true);
    });
  });

  describe('when value is an object', () => {
    it('should return true if the object is empty', () => {
      expect(isEmpty({})).toEqual(true);
    });

    it('should return false if the object is not empty', () => {
      expect(isEmpty({ a: 1 })).toEqual(false);
    });
  });

  describe('when value is a string', () => {
    it('should return true if the string is empty', () => {
      expect(isEmpty('')).toEqual(true);
    });

    it('should return false if the string is not empty', () => {
      expect(isEmpty('a')).toEqual(false);
    });
  });

  describe('when value is an array', () => {
    it('should return true if the array is empty', () => {
      expect(isEmpty([])).toEqual(true);
    });

    it('should return false if the array is not empty', () => {
      expect(isEmpty([1])).toEqual(false);
    });
  });

  describe('when value is a number', () => {
    it('should return false', () => {
      expect(isEmpty(1)).toEqual(false);
    });
  });
});
