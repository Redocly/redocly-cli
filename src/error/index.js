import { relative } from 'path';
import createError, { getReferencedFrom } from './default';

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
export { getReferencedFrom } from './default';

export const createYAMLParseError = (e, ctx, resolvedPath, root = false) => ({
  message: `Error: ${e.name} : ${e.reason}`,
  path: root ? [] : Array.from(ctx.path),
  referencedFrom: root ? null : getReferencedFrom(ctx),
  location: {
    startLine: e.mark.line,
    startCol: e.mark.column,
  },
  codeFrame: '',
  value: null,
  file: relative(process.cwd(), resolvedPath),
  severity: 4,
  enableCodeframe: ctx.enableCodeframe,
  fromRule: 'load-yaml-file',
});
