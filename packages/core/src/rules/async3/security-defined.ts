import type { Async3Rule } from '../../visitors.js';

const SECURITY_LOCATION = /\/security\/\d+$/;
const COMPONENT_SCHEME_FRAGMENT = /^\/components\/securitySchemes\/([^/]+)$/;

export const SecurityDefined: Async3Rule = () => {
  return {
    ref: {
      leave(node, { location, report }, resolved) {
        if (!SECURITY_LOCATION.test(location.pointer)) return;

        const fragment = node.$ref.split('#')[1] ?? '';
        const match = COMPONENT_SCHEME_FRAGMENT.exec(fragment);
        if (!match) {
          report({
            message: `Security scheme \`$ref\` must point to \`#/components/securitySchemes\`.`,
            location: location.key(),
          });
          return;
        }

        if (resolved.node === undefined) {
          report({
            message: `There is no \`${match[1]}\` security scheme defined.`,
            location: location.key(),
          });
        }
      },
    },
  };
};
