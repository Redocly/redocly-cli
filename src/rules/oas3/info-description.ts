import { OAS3Rule } from '../../visitors';

export const InfoDescription: OAS3Rule = () => {
  return {
    Info(info, { report }) {
      if (!info.description) {
        report({
          message: 'Info object description must be present and non-empty string.',
          location: { reportOnKey: true },
        });
      }
    },
  };
};
