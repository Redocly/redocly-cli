import type { OpenRpc1Rule } from '../../visitors.js';

export const NoRequiredParamsAfterOptional: OpenRpc1Rule = () => {
  return {
    Method: {
      leave(method, { report, resolve, location }) {
        if (!method.params || !Array.isArray(method.params)) return;

        let foundOptional = false;

        method.params.forEach((paramOrRef, index) => {
          const resolved = resolve(paramOrRef);
          if (!resolved.node) return;

          const param = resolved.node;
          const paramName = param.name;
          if (!paramName) return;

          const isRequired = param.required === true;

          if (!isRequired) {
            foundOptional = true;
          } else if (foundOptional) {
            report({
              message: `Required parameter '${param.name}' must be positioned before optional parameters.`,
              location: location.child([index, 'name']),
            });
          }
        });
      },
    },
  };
};
