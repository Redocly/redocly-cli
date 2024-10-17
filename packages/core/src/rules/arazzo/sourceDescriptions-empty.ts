import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const SourceDescriptionsEmpty: ArazzoRule = () => {
  const existingSourceDescriptions = new Set();

  return {
    SourceDescriptions: {
      enter(sourceDescriptions) {
        for (const sourceDescription of sourceDescriptions) {
          existingSourceDescriptions.add(sourceDescription.name);
        }
      },
    },
    Step: {
      leave(step, { report, location }: UserContext) {
        if (step?.operationId && !existingSourceDescriptions.size) {
          report({
            message:
              '`sourceDescriptions` must be defined when `operationId` description reference is used.',
            location: location.child(['operationId']),
          });
        } else if (step?.operationPath && !existingSourceDescriptions.size) {
          report({
            message:
              '`sourceDescriptions` must be defined when `operationPath` description reference is used.',
            location: location.child(['operationPath']),
          });
        } else {
          return;
        }
      },
    },
  };
};
