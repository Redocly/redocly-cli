import createError from './default';

export const createErrorFieldNotAllowed = (fieldName, definitionName, node, ctx,
  options) => createError(
  `The field '${fieldName}' is not allowed in ${definitionName}. Use "x-" prefix to override this behavior.`, node, ctx, { target: 'key', ...options },
);

export const createErrorMissingRequiredField = (fieldName, node, ctx,
  options) => createError(
  `The field '${fieldName}' must be present on this level.`, node, ctx, { target: 'key', ...options },
);

export const createErrrorFieldTypeMismatch = (desiredType, node, ctx, options) => createError(
  `This field must be of ${desiredType} type.`, node, ctx, { target: 'key', ...options },
);

export const createErrorMutuallyExclusiveFields = (fieldNames, node, ctx,
  options) => createError(
  `Fields ${fieldNames.map((el) => `'${el}'`).join(', ')} are mutually exclusive.`, node, ctx, { target: 'key', ...options },
);

export default createError;
