import createError from './default';

export const createErrorFieldNotAllowed = (fieldName, node, ctx) => createError(
  `${fieldName} is not allowed here. Use "x-" prefix to override this behavior`, node, ctx, 'key',
);

export const createErrorMissingRequiredField = (fieldName, node, ctx) => createError(
  `${fieldName} must be present on this level`, node, ctx,
);

export const createErrrorFieldTypeMismatch = (desiredType, node, ctx) => createError(
  `This field must be of ${desiredType} type`, node, ctx, 'key',
);

export const createErrorMutuallyExclusiveFields = (fieldNames, node, ctx) => createError(
  `${fieldNames.join(', ')} are mutually exclusive`, node, ctx, 'key',
);

export default createError;
