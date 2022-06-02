import { Location } from 'core/src/ref-utils';
import { OrderOptions, OrderDirection, isOrdered, getIntersectionLength, regexFromString } from './utils';

type Asserts = Record<string, (value: any, condition: any, baseLocation: Location, rawValue?: any) => {isValid: boolean, location?: Location}>;

export const runOnKeysSet = new Set([
  'mutuallyExclusive',
  'mutuallyRequired',
  'enum',
  'pattern',
  'minLength',
  'maxLength',
  'casing',
  'sortOrder',
  'disallowed',
  'required',
  'ref'
]);
export const runOnValuesSet = new Set([
  'pattern',
  'enum',
  'defined',
  'undefined',
  'nonEmpty',
  'minLength',
  'maxLength',
  'casing',
  'sortOrder',
  'ref'
]);

export const asserts: Asserts = {
  pattern: (value: string | string[], condition: string, baseLocation: Location): {isValid: boolean, location?: Location} => {
    if (typeof value === 'undefined') return { isValid: true }; // property doesn't exist, no need to lint it with this assert
    const values = typeof value === 'string' ? [value] : value;
    const regx = regexFromString(condition);
    for (let _val of values) {
      if (!regx?.test(_val)) {
        return { isValid: false, location: baseLocation };
      }
    }
    return { isValid: true };
  },
  enum: (value: string | string[], condition: string[], baseLocation: Location): {isValid: boolean, location?: Location} => {
    if (typeof value === 'undefined') return { isValid: true }; // property doesn't exist, no need to lint it with this assert
    const values = typeof value === 'string' ? [value] : value;
    for (let _val of values) {
      if (!condition.includes(_val)) {
        return { isValid: false, location: baseLocation };;
      }
    }
    return { isValid: true };
  },
  defined: (value: string | undefined, condition: boolean = true, baseLocation: Location): {isValid: boolean, location?: Location} => {
    const isDefined = typeof value !== 'undefined';
    return { isValid: condition ? isDefined : !isDefined, location: baseLocation };
  },
  required: (value: string[], keys: string[], baseLocation: Location): {isValid: boolean, location?: Location} => {
    for (const requiredKey of keys) {
      if (!value.includes(requiredKey)) {
        return { isValid: false, location: baseLocation };
      }
    }
    return { isValid: true };
  },
  disallowed: (value: string | string[], condition: string[], baseLocation: Location): {isValid: boolean, location?: Location} => {
    if (typeof value === 'undefined') return { isValid: true }; // property doesn't exist, no need to lint it with this assert
    const values = typeof value === 'string' ? [value] : value;
    for (let _val of values) {
      if (condition.includes(_val)) {
        return { isValid: false, location: baseLocation };
      }
    }
    return { isValid: true };
  },
  undefined: (value: any, condition: boolean = true, baseLocation: Location): {isValid: boolean, location?: Location} => {
    const isUndefined = typeof value === 'undefined';
    return { isValid: condition ? isUndefined : !isUndefined, location: baseLocation };
  },
  nonEmpty: (value: string | undefined | null, condition: boolean = true, baseLocation: Location): {isValid: boolean, location?: Location} => {
    const isEmpty = typeof value === 'undefined' || value === null || value === '';
    return { isValid: condition ? !isEmpty : isEmpty, location: baseLocation};
  },
  minLength: (value: string | any[], condition: number, baseLocation: Location): {isValid: boolean, location?: Location} => {
    if (typeof value === 'undefined') return { isValid: true }; // property doesn't exist, no need to lint it with this assert
    return { isValid: value.length >= condition, location: baseLocation};
  },
  maxLength: (value: string | any[], condition: number, baseLocation: Location): {isValid: boolean, location?: Location} => {
    if (typeof value === 'undefined') return { isValid: true }; // property doesn't exist, no need to lint it with this assert
    return { isValid: value.length <= condition, location: baseLocation};
  },
  casing: (value: string | string[], condition: string, baseLocation: Location): {isValid: boolean, location?: Location} => {
    if (typeof value === 'undefined') return { isValid: true }; // property doesn't exist, no need to lint it with this assert
    const values = typeof value === 'string' ? [value] : value;
    for (let _val of values) {
      let matchCase = false;
      switch (condition) {
        case 'camelCase':
          matchCase = !!_val.match(/^[a-z][a-zA-Z0-9]+$/g);
          break;
        case 'kebab-case':
          matchCase = !!_val.match(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/g);
          break;
        case 'snake_case':
          matchCase = !!_val.match(/^([a-z][a-z0-9]*)(_[a-z0-9]+)*$/g);
          break;
        case 'PascalCase':
          matchCase = !!_val.match(/^[A-Z][a-zA-Z0-9]+$/g);
          break;
        case 'MACRO_CASE':
          matchCase = !!_val.match(/^([A-Z][A-Z0-9]*)(_[A-Z0-9]+)*$/g);
          break;
        case 'COBOL-CASE':
          matchCase = !!_val.match(/^([A-Z][A-Z0-9]*)(-[A-Z0-9]+)*$/g);
          break;
        case 'flatcase':
          matchCase = !!_val.match(/^[a-z][a-z0-9]+$/g);
          break;
      }
      if (!matchCase) {
        return { isValid: false, location: baseLocation };
      }
    }
    return { isValid: true };
  },
  sortOrder: (value: any[], condition: OrderOptions | OrderDirection, baseLocation: Location): {isValid: boolean, location?: Location} => {
    if (typeof value === 'undefined') return { isValid: true };
    return { isValid: isOrdered(value, condition), location: baseLocation};
  },
  mutuallyExclusive: (value: string[], condition: string[], baseLocation: Location): {isValid: boolean, location?: Location} => {
    return { isValid: getIntersectionLength(value, condition) < 2, location: baseLocation};
  },
  mutuallyRequired: (value: string[], condition: string[], baseLocation: Location): {isValid: boolean, location?: Location} => {
    return { isValid: getIntersectionLength(value, condition) > 0
      ? getIntersectionLength(value, condition) === condition.length
      : true, location: baseLocation};
  },
  requireAny: (value: string[], condition: string[]): boolean => {
    return getIntersectionLength(value, condition) >= 1;
  },
  ref: (_value: any, condition: string | boolean, baseLocation: Location, rawValue: any): {isValid: boolean, location?: Location} => {
    if (typeof rawValue === 'undefined') return { isValid: true }; // property doesn't exist, no need to lint it with this assert
    const hasRef = rawValue.hasOwnProperty('$ref');
    if (typeof condition === 'boolean') {
      return { isValid: condition ? hasRef : !hasRef, location: baseLocation};
    }
    const regex = regexFromString(condition);
    return { isValid: hasRef && regex?.test(rawValue['$ref']), location: baseLocation};
  }
};
