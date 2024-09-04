import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const RequestBodyReplacementsUnique: ArazzoRule = () => {
  const seenReplacements = new Set();

  return {
    RequestBody: {
      enter(requestBody, { report, location }: UserContext) {
        if (!requestBody.replacements) return;

        for (const replacement of requestBody.replacements) {
          if (seenReplacements.has(replacement.target)) {
            report({
              message: 'Every `replacement` in `requestBody` must be unique.',
              location: location.child([
                'replacements',
                requestBody.replacements.indexOf(replacement),
                `target`,
              ]),
            });
          }
          seenReplacements.add(replacement.target);
        }
      },
    },
  };
};
