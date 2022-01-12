import { OrderOptions, OrderDirection, isOrdered, getCounts } from './utils';

export const runOnKeysMap = ['mutuallyExclusive', 'mutuallyRequired', 'enum', 'pattern',
  'minLength', 'maxLength', 'casing', 'sortOrder'];
export const runOnValuesMap = ['pattern', 'enum', 'defined', 'undefined', 'nonEmpty',
  'minLength', 'maxLength', 'casing', 'sortOrder'];

export const rules: {[key: string]: any} = {
  pattern: (value: string | string[], pattern: string): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    const values = typeof value === 'string' ? [value] : value;
    const regexOptions = pattern.match(/(\b\/\b)(.+)/g) || ['/'];
    pattern = pattern.slice(1).replace(regexOptions[0],'');
    const regx = new RegExp(pattern, regexOptions[0].slice(1));
    for (let _val of values) {
      if (!_val.match(regx)) {
        return false;
      }
    }
    return true;
  },
  enum: (value: string | string[], keys: string[]): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    const values = typeof value === 'string' ? [value] : value;
    for (let _val of values) {
      if (!keys.includes(_val)) {
        return false;
      }
    }
    return true;
  },
  defined: (value: string | undefined, _val: boolean = true): boolean => {
    const isDefined = typeof value !== 'undefined';
    return _val ? isDefined : !isDefined;
  },
  undefined: (value: any, _val: boolean = true): boolean => {
    const isUndefined = typeof value === 'undefined';
    return _val ? isUndefined : !isUndefined;
  },
  nonEmpty: (value: string | undefined | null, _val: boolean = true): boolean => {
    const isEmpty = typeof value === 'undefined' || value === null || value === '';
    return _val ? !isEmpty : isEmpty;
  },
  minLength: (value: string | any[], length: number): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    return value.length >= length;
  },
  maxLength: (value: string | any[], length: number): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    return value.length <= length;
  },
  casing: (value: string | string[], style: string): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    const values = typeof value === 'string' ? [value] : value;
    for (let _val of values) {
      let matchCase = false;
      switch (style) {
        case 'camelCase':
          matchCase = !!(_val.match(/^[a-z][a-zA-Z0-9]+$/g));
          break;
        case 'kebab-case':
          matchCase = !!(_val.match(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/g));
          break;
        case 'snake_case':
          matchCase = !!(_val.match(/^([a-z][a-z0-9]*)(_[a-z0-9]+)*$/g));
          break;
        case 'PascalCase':
          matchCase = !!(_val.match(/^[A-Z][a-zA-Z0-9]+$/g));
          break;
        case 'MACRO_CASE':
          matchCase = !!(_val.match(/^([A-Z][A-Z0-9]*)(_[A-Z0-9]+)*$/g));
          break;
        case 'COBOL-CASE':
          matchCase = !!(_val.match(/^([A-Z][A-Z0-9]*)(-[A-Z0-9]+)*$/g));
          break;
        case 'flatcase':
          matchCase = !!(_val.match(/^[a-z][a-z0-9]+$/g));
          break;
      }
      if (!matchCase) {
        return false;
      }
    }
    return true;
  },
  sortOrder: (value: any[], _val: OrderOptions | OrderDirection): boolean => {
    if (typeof value === 'undefined') return true;
    return isOrdered(value, _val);
  },
  mutuallyExclusive: (keys: string[], properties: string[]): boolean => {
    return getCounts(keys, properties) < 2;
  },
  mutuallyRequired: (keys: string[], properties: string[]): boolean => {
    return getCounts(keys, properties) === properties.length;
  }
}