import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ReferenceProperty: Arazzo1Rule = () => {
  return {
    Report: {
      enter(report, { report: ctxReport, location }: UserContext) {
        const reference = report?.reference;
        if (reference !== undefined) {
          try {
            new URL(reference);
          } catch (_) {
            ctxReport({
              message: 'The `reference` property must be a valid URI.',
              location: location.child(['reference']),
            });
          }
        }
      },
    },
  };
};
