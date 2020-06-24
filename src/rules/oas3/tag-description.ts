import { Oas3Rule } from '../../visitors';

export const TagDescription: Oas3Rule = () => {
  return {
    Tag(tag, { report, location }) {
      if (tag.description === undefined) {
        report({
          message: 'Tag object description must be present.',
          location: { reportOnKey: true },
        });
      } else if (!tag.description) {
        report({
          message: 'Tag object description must be non-empty string.',
          location: location.child(['description']),
        });
      }
    },
  };
};
