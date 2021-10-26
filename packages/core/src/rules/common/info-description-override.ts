import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { readFileAsStringSync } from '../../utils';
import { UserContext } from '../../walk';

export const InfoDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ filePath }) => {
  return {
    Info: {
      leave(info, { report, location }: UserContext) {
        if (!filePath) throw new Error(`Parameter "filePath" is not provided`);
        try {
          info.description = readFileAsStringSync(filePath);
        } catch (e) {
          report({
            message: `Failed to read file. ${e.message}`,
            location: location.child('info').key(),
          });
        }
      },
    },
  };
};
