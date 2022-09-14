import { AssertResult, CustomFunction } from 'core/src/config/types';
import { Location } from '../../../ref-utils';
import { isString as runOnValue, notUndefined } from '../../../utils';
import {
  OrderOptions,
  OrderDirection,
  isOrdered,
  getIntersectionLength,
  regexFromString,
} from './utils';

type Asserts = Record<
  string,
  (value: any, condition: any, baseLocation: Location, rawValue?: any) => AssertResult[]
>;

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
  'requireAny',
  'ref',
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
  'ref',
]);

export const asserts: Asserts = {
  pattern: (value: string | string[], condition: string, baseLocation: Location) => {
    if (typeof value === 'undefined') return []; // property doesn't exist, no need to lint it with this assert
    const values = runOnValue(value) ? [value] : value;
    const regx = regexFromString(condition);

    return values
      .map((_val) => {
        if (regx?.test(_val)) return;
        return {
          message: `${_val} should match a regex ${condition}`,
          location: runOnValue(value) ? baseLocation : baseLocation.key(),
        };
      })
      .filter(notUndefined);
  },
  enum: (value: string | string[], condition: string[], baseLocation: Location) => {
    if (typeof value === 'undefined') return []; // property doesn't exist, no need to lint it with this assert
    const values = runOnValue(value) ? [value] : value;
    return values
      .map((_val) => {
        if (condition.includes(_val)) return;
        return {
          message: `${_val} should be one of the predefined values`,
          location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
        };
      })
      .filter(notUndefined);
  },
  defined: (value: string | undefined, condition: boolean = true, baseLocation: Location) => {
    const isDefined = typeof value !== 'undefined';
    const isValid = condition ? isDefined : !isDefined;
    if (isValid) return [];

    return [
      {
        message: condition ? `Should be one defined` : 'Should not be one defined',
        location: baseLocation,
      },
    ];
  },
  required: (value: string[], keys: string[], baseLocation: Location) => {
    return keys
      .map((requiredKey) => {
        if (value.includes(requiredKey)) return;
        return { message: `${requiredKey} is required`, location: baseLocation.key() };
      })
      .filter(notUndefined);
  },
  disallowed: (value: string | string[], condition: string[], baseLocation: Location) => {
    if (typeof value === 'undefined') return []; // property doesn't exist, no need to lint it with this assert
    const values = runOnValue(value) ? [value] : value;
    return values
      .map((_val) => {
        if (condition.includes(_val)) {
          return {
            message: `${_val} is disallowed`,
            location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
          };
        }
        return;
      })
      .filter(notUndefined);
  },
  undefined: (value: any, condition: boolean = true, baseLocation: Location) => {
    const isUndefined = typeof value === 'undefined';
    const isValid = condition ? isUndefined : !isUndefined;
    if (isValid) return [];

    return [
      {
        message: condition ? `Should not be defined` : 'Should be defined',
        location: baseLocation,
      },
    ];
  },
  nonEmpty: (
    value: string | undefined | null,
    condition: boolean = true,
    baseLocation: Location
  ) => {
    const isEmpty = typeof value === 'undefined' || value === null || value === '';
    const isValid = condition ? !isEmpty : isEmpty;
    if (isValid) return [];

    return [
      { message: condition ? `Should not be emply` : 'Should be empty', location: baseLocation },
    ];
  },
  minLength: (value: string | any[], condition: number, baseLocation: Location) => {
    if (typeof value === 'undefined' || value.length >= condition) return []; // property doesn't exist, no need to lint it with this assert
    return [{ message: `Should have at least ${value.length} characters`, location: baseLocation }];
  },
  maxLength: (value: string | any[], condition: number, baseLocation: Location) => {
    if (typeof value === 'undefined' || value.length <= condition) return []; // property doesn't exist, no need to lint it with this assert
    return [{ message: `Should have at most ${value.length} characters`, location: baseLocation }];
  },
  casing: (value: string | string[], condition: string, baseLocation: Location) => {
    if (typeof value === 'undefined') return []; // property doesn't exist, no need to lint it with this assert
    const values: string[] = runOnValue(value) ? [value] : value;
    return values
      .map((_val) => {
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
        if (matchCase) return;
        return {
          message: `${_val} should be matched ${condition}`,
          location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
        };
      })
      .filter(notUndefined);
  },
  sortOrder: (value: any[], condition: OrderOptions | OrderDirection, baseLocation: Location) => {
    if (typeof value === 'undefined' || isOrdered(value, condition)) return [];
    return [{ message: `Should be ordered`, location: baseLocation }];
  },
  mutuallyExclusive: (value: string[], condition: string[], baseLocation: Location) => {
    if (getIntersectionLength(value, condition) < 2) return [];
    return [{ message: 'Should be exclusive', location: baseLocation.key() }];
  },
  mutuallyRequired: (value: string[], condition: string[], baseLocation: Location) => {
    const isValid =
      getIntersectionLength(value, condition) > 0
        ? getIntersectionLength(value, condition) === condition.length
        : true;
    if (isValid) return [];
    return [
      {
        message: `Should have required keys ${condition.join(', ')}`,
        location: baseLocation.key(),
      },
    ];
  },
  requireAny: (value: string[], condition: string[], baseLocation: Location) => {
    if (getIntersectionLength(value, condition) >= 1) return [];
    return [
      {
        message: `Should have one of ${condition.join(', ')}`,
        location: baseLocation.key(),
      },
    ];
  },
  ref: (_value: any, condition: string | boolean, baseLocation, rawValue: any) => {
    if (typeof rawValue === 'undefined') return []; // property doesn't exist, no need to lint it with this assert
    const hasRef = rawValue.hasOwnProperty('$ref');
    if (typeof condition === 'boolean') {
      const isValid = condition ? hasRef : !hasRef;
      if (isValid) return [];
      return [
        {
          message: condition ? `ref should be defined` : 'ref should not be defined',
          location: hasRef ? baseLocation : baseLocation.key(),
        },
      ];
    }
    const regex = regexFromString(condition);
    const isValid = hasRef && regex?.test(rawValue['$ref']);
    if (isValid) return [];
    return [
      {
        message: `ref should be matched ${condition}`,
        location: hasRef ? baseLocation : baseLocation.key(),
      },
    ];
  },
};

export function buildAssertCustomFunction(fn: CustomFunction) {
  return (value: string[], options: any, baseLocation: Location) =>
    fn.call(null, value, options, baseLocation);
}
