import type { Async3Rule } from '../../visitors.js';

const COMPONENT_SCHEME_PREFIX = '#/components/securitySchemes/';

export const SecurityDefined: Async3Rule = () => {
  return {
    ref: {
      leave(node, { type, location, report }, resolved) {
        if (type.name !== 'SecurityScheme') return;

        const ref = node.$ref;
        if (!ref.startsWith(COMPONENT_SCHEME_PREFIX)) {
          report({
            message: `Security scheme \`$ref\` must point to \`#/components/securitySchemes\`.`,
            location: location.key(),
          });
          return;
        }

        if (resolved.node === undefined) {
          const schemeName = ref.slice(COMPONENT_SCHEME_PREFIX.length);
          report({
            message: `There is no \`${schemeName}\` security scheme defined.`,
            location: location.key(),
          });
        }
      },
    },
  };
};
