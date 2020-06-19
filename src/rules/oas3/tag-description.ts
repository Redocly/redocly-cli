import { OAS3Rule } from '../../visitors';

export const TagDescription: OAS3Rule = () => {
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
          location: location.append(['descrption']),
        });
      }
    },
  };
};
