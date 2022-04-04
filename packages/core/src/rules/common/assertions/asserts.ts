import { OrderOptions, OrderDirection, isOrdered, getIntersectionLength } from './utils';

type Asserts = Record<string, (value: any, condition: any) => boolean>;

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
]);

export const asserts: Asserts = {
  pattern: (value: string | string[], condition: string): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this assert
    const values = typeof value === 'string' ? [value] : value;
    const regexOptions = condition.match(/(\b\/\b)(.+)/g) || ['/'];
    condition = condition.slice(1).replace(regexOptions[0], '');
    const regx = new RegExp(condition, regexOptions[0].slice(1));
    for (let _val of values) {
      if (!_val.match(regx)) {
        return false;
      }
    }
    return true;
  },
  enum: (value: string | string[], condition: string[]): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this assert
    const values = typeof value === 'string' ? [value] : value;
    for (let _val of values) {
      if (!condition.includes(_val)) {
        return false;
      }
    }
    return true;
  },
  defined: (value: string | undefined, condition: boolean = true): boolean => {
    const isDefined = typeof value !== 'undefined';
    return condition ? isDefined : !isDefined;
  },
  required: (value: string[], keys: string[]): boolean => {
    for (const requiredKey of keys) {
      if (!value.includes(requiredKey)) {
        return false;
      }
    }
    return true;
  },
  disallowed: (value: string | string[], condition: string[]): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this assert
    const values = typeof value === 'string' ? [value] : value;
    for (let _val of values) {
      if (condition.includes(_val)) {
        return false;
      }
    }
    return true;
  },
  undefined: (value: any, condition: boolean = true): boolean => {
    const isUndefined = typeof value === 'undefined';
    return condition ? isUndefined : !isUndefined;
  },
  nonEmpty: (value: string | undefined | null, condition: boolean = true): boolean => {
    const isEmpty = typeof value === 'undefined' || value === null || value === '';
    return condition ? !isEmpty : isEmpty;
  },
  minLength: (value: string | any[], condition: number): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this assert
    return value.length >= condition;
  },
  maxLength: (value: string | any[], condition: number): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this assert
    return value.length <= condition;
  },
  casing: (value: string | string[], condition: string): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this assert
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
        return false;
      }
    }
    return true;
  },
  sortOrder: (value: any[], condition: OrderOptions | OrderDirection): boolean => {
    if (typeof value === 'undefined') return true;
    return isOrdered(value, condition);
  },
  mutuallyExclusive: (value: string[], condition: string[]): boolean => {
    return getIntersectionLength(value, condition) < 2;
  },
  mutuallyRequired: (value: string[], condition: string[]): boolean => {
    return getIntersectionLength(value, condition) > 0
      ? getIntersectionLength(value, condition) === condition.length
      : true;
  },
};
