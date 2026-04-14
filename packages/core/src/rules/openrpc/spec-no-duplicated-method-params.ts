import type { OpenRpc1Rule } from '../../visitors.js';

export const NoDuplicatedMethodParams: OpenRpc1Rule = () => {
  return {
    Method: {
      leave(method, { report, resolve, location }) {
        if (!method.params || !Array.isArray(method.params)) return;

        const seenParams = new Set<string>();

        method.params.forEach((paramOrRef, index) => {
          const resolved = resolve(paramOrRef);
          if (!resolved.node) return;

          const param = resolved.node;
          const paramName = param.name;
          if (!paramName) return;

          if (seenParams.has(paramName)) {
            report({
              message: `Parameter names must be unique. Duplicate parameter name '${param.name}' found.`,
              location: location.child([index, 'name']),
            });
          }
          seenParams.add(paramName);
        });
      },
    },
  };
};
