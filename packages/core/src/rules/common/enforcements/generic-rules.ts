import { OrderOptions, OrderDirection, isOrdered, getCounts } from './utils';

type RunsOnAllProps = 'mutuallyExclusive' | 'mutuallyRequired';
type RunsOnSingleProp = 'pattern' | 'enum' | 'defined' | 'undefined'
  | 'nonEmpty' | 'length' | 'minLength' | 'maxLength' | 'casing' | 'sortOrder';

export const rules: {[key in RunsOnSingleProp | RunsOnAllProps]: any} = {
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
  minLength: (value: string | any[], length: number): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    return value.length >= length;
  },
  maxLength: (value: string | any[], length: number): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
    return value.length <= length;
  },
  casing: (value: string, style: string): boolean => {
    if (typeof value === 'undefined') return true; // property doesn't exist, no need to lint it with this rule
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
      case 'MACRO_CASE':
        matchCase = !!(value.match(/^([A-Z][A-Z0-9]*)(_[A-Z0-9]+)*$/g));
        break;
      case 'COBOL-CASE':
        matchCase = !!(value.match(/^([A-Z][A-Z0-9]*)(-[A-Z0-9]+)*$/g));
        break;
      case 'flatcase':
        matchCase = !!(value.match(/^[a-z][a-z0-9]+$/g));
        break;
    }
    return matchCase;
  },
  sortOrder: (value: any[], _val: OrderOptions | OrderDirection): boolean => {
    if (typeof value === 'undefined') return true;
    return isOrdered(value, _val);
  },
  mutuallyExclusive: (node: any, properties: string[]): boolean => {
    return getCounts(node, properties) < 2;
  },
  mutuallyRequired: (node: any, properties: string[]): boolean => {
    return getCounts(node, properties) === properties.length;
  }
}