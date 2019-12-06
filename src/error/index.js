import createError from './default';

const mutuallyExclusiveFieldsMessageHelper = (fieldNames) => `Fields ${fieldNames.map((el) => `'${el}'`).join(', ')} are mutually exclusive.`;
const fieldTypeMismatchMessageHelper = (desiredType) => `This field must be of ${desiredType} type.`;
const missingRequiredField = (fieldName) => `The field '${fieldName}' must be present on this level.`;
const fieldNotAllowedMessageHelper = (fieldName, definitionName) => `The field '${fieldName}' is not allowed in ${definitionName}. Use "x-" prefix or custom types to override this behavior.`;

export const messageHelpers = {
  mutuallyExclusiveFieldsMessageHelper,
  fieldTypeMismatchMessageHelper,
  missingRequiredField,
  fieldNotAllowedMessageHelper,
};

export default createError;
