import { protoLocationToProblemLocation } from '../../protobuf/locations.js';
import type { ProtobufRule } from '../../visitors.js';

const SNAKE_CASE_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/u;

export const FieldSnakeCase: ProtobufRule = () => {
  return {
    ProtoField(field, { report }) {
      if (SNAKE_CASE_PATTERN.test(field.name)) return;

      report({
        message: `Field name \`${field.name}\` must use snake_case.`,
        location: protoLocationToProblemLocation(field.location),
      });
    },
  };
};
