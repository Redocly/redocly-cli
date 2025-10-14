import { type Oas3Rule } from '../../visitors.js';

export const ExampleValues: Oas3Rule = () => {
  return {
    Example({ value, externalValue, dataValue, serializedValue }, { report, location }) {
      if (value !== undefined && externalValue !== undefined) {
        report({
          message:
            "The 'value' and 'externalValue' fields of an example object are mutually exclusive.",
          location: location,
        });
      }

      if (serializedValue !== undefined && externalValue !== undefined) {
        report({
          message:
            "The 'serializedValue' and 'externalValue' fields of an example object are mutually exclusive.",
          location: location,
        });
      }

      if (value !== undefined && dataValue !== undefined) {
        report({
          message:
            "The 'value' filed must be absent if 'dataValue' is present in an example object.",
          location: location.child('value').key(),
        });
      }

      if (value !== undefined && serializedValue !== undefined) {
        report({
          message:
            "The 'value' filed must be absent if 'serializedValue' is present in an example object.",
          location: location.child('value').key(),
        });
      }
    },
  };
};
