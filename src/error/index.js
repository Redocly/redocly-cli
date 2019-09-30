import createError, { messageLevels } from './default';

export const createErrorFieldNotAllowed = (fieldName, node, ctx,
  severity = messageLevels.ERROR) => createError(
  `The field '${fieldName}' is not allowed here. Use "x-" prefix to override this behavior.`, node, ctx, 'key', severity,
);

export const createErrorMissingRequiredField = (fieldName, node, ctx,
  severity = messageLevels.ERROR) => createError(
  `The field '${fieldName}' must be present on this level.`, node, ctx, 'key', severity,
);

export const createErrrorFieldTypeMismatch = (desiredType, node, ctx,
  severity = messageLevels.ERROR) => createError(
  `This field must be of ${desiredType} type.`, node, ctx, 'key', severity,
);

export const createErrorMutuallyExclusiveFields = (fieldNames, node, ctx,
  severity = messageLevels.ERROR) => createError(
  `Fields ${fieldNames.map((el) => `'${el}'`).join(', ')} are mutually exclusive.`, node, ctx, 'key', severity,
);

export default createError;
