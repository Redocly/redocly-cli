import type {
  CriteriaObject,
  RegexpSuccessCriteria,
  JsonPathSuccessCriteria,
} from '../../../types';

export function isRegexpSuccessCriteria(
  criteria: CriteriaObject
): criteria is RegexpSuccessCriteria {
  return (criteria as RegexpSuccessCriteria).type === 'regex';
}

export function isJSONPathSuccessCriteria(
  criteria: CriteriaObject
): criteria is JsonPathSuccessCriteria {
  const typeValue = (criteria as JsonPathSuccessCriteria)?.type;

  return (
    typeValue === 'jsonpath' || (typeof typeValue === 'object' && typeValue?.type === 'jsonpath')
  );
}

export const ALLOWED_EXPRESSION_KEYS = [
  '$url',
  '$method',
  '$statusCode',
  '$request',
  '$response',
  '$inputs',
  '$outputs',
  '$steps',
  '$workflows',
  '$sourceDescriptions',
  '$components',
];

export function validateSuccessCriteria(successCriteria: CriteriaObject[]) {
  successCriteria.forEach((criteria: CriteriaObject) => {
    const { condition } = criteria;

    if (isRegexpSuccessCriteria(criteria)) {
      const { context } = criteria;
      const regex = /\$[a-zA-Z_]\w*/g;
      const matches = context.match(regex);

      if (!matches) {
        throw new Error(`"${context}" does not contain any valid context.`);
      }

      const invalidKeys = matches.filter((key: string) => !ALLOWED_EXPRESSION_KEYS.includes(key));

      if (invalidKeys.length) {
        throw new Error(`Success criteria context "${context}" is not allowed.`);
      }
    } else if (isJSONPathSuccessCriteria(criteria)) {
      if (!criteria.context) {
        throw new Error(`jsonpath success criteria context is required.`);
      }

      if (!criteria.condition) {
        throw new Error(`jsonpath success criteria condition is required.`);
      }
    } else {
      const regex = /\$[a-zA-Z_]\w*/g;
      const matches = condition.match(regex);

      if (!matches) {
        return;
      }

      const invalidKeys = matches.filter((key: string) => !ALLOWED_EXPRESSION_KEYS.includes(key));

      if (invalidKeys.length) {
        throw new Error(`Success criteria condition ${condition} is not allowed.`);
      }
    }
  });
}
