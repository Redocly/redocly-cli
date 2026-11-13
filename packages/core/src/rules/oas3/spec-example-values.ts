import { type Oas3Rule } from '../../visitors.js';

const mutuallyExclusiveFields = [['value', 'externalValue']] as const;

const oas3_2MutuallyExclusiveFields = [
  ...mutuallyExclusiveFields,
  ['value', 'dataValue'],
  ['value', 'serializedValue'],
  ['externalValue', 'serializedValue'],
] as const;

export const SpecExampleValues: Oas3Rule = () => {
  return {
    Example(example, { report, location, specVersion }) {
      const fieldPairs =
        specVersion === 'oas3_2' ? oas3_2MutuallyExclusiveFields : mutuallyExclusiveFields;
      for (const [reportedField, conflictingField] of fieldPairs) {
        if (example[reportedField] !== undefined && example[conflictingField] !== undefined) {
          report({
            message: `The \`${reportedField}\` and \`${conflictingField}\` fields of an Example Object are mutually exclusive.`,
            location: location.child(reportedField).key(),
            reference: 'https://redocly.com/docs/cli/rules/oas/spec-example-values',
          });
        }
      }
    },
  };
};
