import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const XSecuritySchemeNameLink: Arazzo1Rule = () => {
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
          if (!security || typeof security !== 'object') continue;

          if ('schemeName' in security) {
            const schemeName = (security as { schemeName?: unknown }).schemeName;
            const isLink =
              typeof schemeName === 'string' && schemeName.startsWith('$sourceDescriptions.');

            if (!isLink) {
              report({
                message:
                  'When multiple `sourceDescriptions` exist, `workflow.x-security.schemeName` must be a link to a source description (e.g. `$sourceDescriptions.{name}.{scheme}`)',
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
