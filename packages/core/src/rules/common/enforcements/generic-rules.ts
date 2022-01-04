import { isOrdered, getCounts } from './utils';

export const rules = {
  pattern: (value: string, pattern: string): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    const regexOptions = pattern.match(/(\b\/\b)(.+)/g) || ['/'];
    pattern = pattern.slice(1).replace(regexOptions[0],'');
    const regx = new RegExp(pattern, regexOptions[0].slice(1));
    return !!value.match(regx);
  },
  enum: (value: string, keys: string[]): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    return keys.includes(value);
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
  length: (value: string | any[], length: number): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    return value.length === length;
  },
  casing: (value: string, style: string): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    const cases = ['camelCase', 'kebab-case', 'snake_case', 'PascalCase'];
    if (!cases.includes(style)) {
      // report wrong style name:
      return false;
    }
    let matchCase = false;
    switch (style) {
      case 'camelCase':
        matchCase = !!(value.match(/^[a-z][a-zA-Z0-9]+$/g));
        break;
      case 'kebab-case':
        matchCase = !!(value.match(/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/g));
        break;
      case 'snake_case':
        matchCase = !!(value.match(/^([a-z][a-z0-9]*)(_[a-z0-9]+)*$/g));
        break;
      case 'PascalCase':
        matchCase = !!(value.match(/^[A-Z][a-zA-Z0-9]+$/g));
        break;
    }
    return matchCase;
  },
  sortOrder: (value: string[], _val: 'asc' | 'desc'): boolean => {
    if (typeof value === 'undefined' || value.length === 1) return true;
    return isOrdered(value, _val);
  },
  mutuallyExclusive: (node: any, properties: string[]): boolean => {
    return getCounts(node, properties) < 2;
  },
  mutuallyRequired: (node: any, properties: string[]): boolean => {
    return getCounts(node, properties) === properties.length;
  }
}