import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const XSecuritySchemeNameReference: Arazzo1Rule = () => {
  let sourceDescriptionsCount = 0;

  return {
    SourceDescriptions: {
      enter(sourceDescriptions) {
        sourceDescriptionsCount = Array.isArray(sourceDescriptions) ? sourceDescriptions.length : 0;
      },
    },
    Workflow: {
      leave(workflow, { report, location }: UserContext) {
        const extendedSecurity = workflow?.['x-security'];

        if (!extendedSecurity || sourceDescriptionsCount <= 1) {
          return;
        }

        for (const security of extendedSecurity) {
          if ('schemeName' in security) {
            const schemeName = security.schemeName;
            const isReference =
              typeof schemeName === 'string' && schemeName.startsWith('$sourceDescriptions.');

            if (!isReference) {
              report({
                message:
                  'When multiple `sourceDescriptions` exist, `workflow.x-security.schemeName` must be a reference to a source description (e.g. `$sourceDescriptions.{name}.{schemeName}`)',
                location: location.child([
                  'x-security',
                  extendedSecurity.indexOf(security),
                  'schemeName',
                ]),
              });
            }
          }
        }
      },
    },
  };
};
