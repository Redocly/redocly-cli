import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const SourceDescriptionsNameUnique: ArazzoRule = () => {
  const seenSourceDescriptions = new Set();

  return {
    SourceDescriptions: {
      enter(sourceDescriptions, { report, location }: UserContext) {
        if (!sourceDescriptions.length) return;
        for (const sourceDescription of sourceDescriptions) {
          if (seenSourceDescriptions.has(sourceDescription.name)) {
            report({
              message: 'The `name` must be unique amongst all SourceDescriptions.',
              location: location.child([sourceDescriptions.indexOf(sourceDescription)]),
            });
          }
          seenSourceDescriptions.add(sourceDescription.name);
        }
      },
    },
  };
};
