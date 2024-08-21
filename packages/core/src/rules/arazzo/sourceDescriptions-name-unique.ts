import type {
  ArazzoSourceDescription,
  NoneSourceDescription,
  OpenAPISourceDescription,
} from '../../typings/arazzo';
import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const SourceDescriptionsNameUnique: ArazzoRule = () => {
  const seenSourceDescriptions = new Set();

  return {
    SourceDescriptions(sourceDescriptions, { report, location }: UserContext) {
      if (!sourceDescriptions.length) return;
      sourceDescriptions.forEach(
        (
          sourceDescription:
            | OpenAPISourceDescription
            | NoneSourceDescription
            | ArazzoSourceDescription
        ) => {
          if (seenSourceDescriptions.has(sourceDescription.name)) {
            report({
              message: 'The `name` MUST be unique amongst all SourceDescriptions.',
              location: location.child([sourceDescriptions.indexOf(sourceDescription)]),
            });
          }
          seenSourceDescriptions.add(sourceDescription.name);
        }
      );
    },
  };
};
