import type { ProtobufRule } from '../../visitors.js';

export const PackageDefined: ProtobufRule = () => {
  return {
    Root(root, { report, location }) {
      if (root.package) return;

      report({
        message: 'Protobuf file must declare a package.',
        location,
      });
    },
  };
};
