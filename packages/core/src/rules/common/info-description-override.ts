import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { readFileSync } from '../../utils';

export const InfoDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ filePath }) => {
  return {
    Info: {
      leave(info, { report, location }) {
        if (!filePath) throw new Error(`Parameter "filePath" is not provided`);
        const { data, error } = readFileSync(filePath);
        if (error) {
          report({
            message: error,
            location: location.child('info').key(),
          });
        }
        info.description = data;
      },
    },
  };
};
