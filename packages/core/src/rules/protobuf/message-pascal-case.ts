import { protoLocationToProblemLocation } from '../../protobuf/locations.js';
import type { ProtobufRule } from '../../visitors.js';

const PASCAL_CASE_PATTERN = /^[A-Z][a-zA-Z0-9]*$/u;

export const MessagePascalCase: ProtobufRule = () => {
  return {
    ProtoMessage(message, { report }) {
      if (PASCAL_CASE_PATTERN.test(message.name)) return;

      report({
        message: `Message name \`${message.name}\` must use PascalCase.`,
        location: protoLocationToProblemLocation(message.location),
      });
    },
  };
};
