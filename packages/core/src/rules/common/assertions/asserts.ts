import { AssertResult, CustomFunction } from 'core/src/config/types';
import { Location } from '../../../ref-utils';
import { isString as runOnValue, isTruthy } from '../../../utils';
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
      .map(
        (_val) =>
          !regx?.test(_val) && {
            message: `${_val} should match a regex ${condition}`,
            location: runOnValue(value) ? baseLocation : baseLocation.key(),
          }
      )
      .filter(isTruthy);
  },
  enum: (value: string | string[], condition: string[], baseLocation: Location) => {
    if (typeof value === 'undefined') return []; // property doesn't exist, no need to lint it with this assert
    const values = runOnValue(value) ? [value] : value;
    return values
      .map(
        (_val) =>
          !condition.includes(_val) && {
            message: `${_val} should be one of the predefined values`,
            location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
          }
      )
      .filter(isTruthy);
  },
  defined: (value: string | undefined, condition: boolean = true, baseLocation: Location) => {
    const isDefined = typeof value !== 'undefined';
    const isValid = condition ? isDefined : !isDefined;
    return isValid
      ? []
      : [
          {
            message: condition ? `Should be one defined` : 'Should not be one defined',
            location: baseLocation,
          },
        ];
  },
  required: (value: string[], keys: string[], baseLocation: Location) => {
    return keys
      .map(
        (requiredKey) =>
          !value.includes(requiredKey) && {
            message: `${requiredKey} is required`,
            location: baseLocation.key(),
          }
      )
      .filter(isTruthy);
  },
  disallowed: (value: string | string[], condition: string[], baseLocation: Location) => {
    if (typeof value === 'undefined') return []; // property doesn't exist, no need to lint it with this assert
    const values = runOnValue(value) ? [value] : value;
    return values
      .map(
        (_val) =>
          condition.includes(_val) && {
            message: `${_val} is disallowed`,
            location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
          }
      )
      .filter(isTruthy);
  },
  undefined: (value: any, condition: boolean = true, baseLocation: Location) => {
    const isUndefined = typeof value === 'undefined';
    const isValid = condition ? isUndefined : !isUndefined;
    return isValid
      ? []
      : [
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
    return isValid
      ? []
      : [
          {
            message: condition ? `Should not be emply` : 'Should be empty',
            location: baseLocation,
          },
        ];
  },
  minLength: (value: string | any[], condition: number, baseLocation: Location) => {
    if (typeof value === 'undefined' || value.length >= condition) return []; // property doesn't exist, no need to lint it with this assert
    return [{ message: `Should have at least ${condition} characters`, location: baseLocation }];
  },
  maxLength: (value: string | any[], condition: number, baseLocation: Location) => {
    if (typeof value === 'undefined' || value.length <= condition) return []; // property doesn't exist, no need to lint it with this assert
    return [{ message: `Should have at most ${condition} characters`, location: baseLocation }];
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
        return (
          !matchCase && {
            message: `${_val} should be matched ${condition}`,
            location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
          }
        );
      })
      .filter(isTruthy);
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
    return isValid
      ? []
      : [
          {
            message: `Should have required keys ${condition.join(', ')}`,
            location: baseLocation.key(),
          },
        ];
  },
  requireAny: (value: string[], condition: string[], baseLocation: Location) => {
    return getIntersectionLength(value, condition) >= 1
      ? []
      : [
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
      return isValid
        ? []
        : [
            {
              message: condition ? `ref should be defined` : 'ref should not be defined',
              location: hasRef ? baseLocation : baseLocation.key(),
            },
          ];
    }
    const regex = regexFromString(condition);
    const isValid = hasRef && regex?.test(rawValue['$ref']);
    return isValid
      ? []
      : [
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
