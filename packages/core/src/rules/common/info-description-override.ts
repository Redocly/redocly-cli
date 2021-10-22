import { Oas3Decorator, Oas2Decorator } from '../../visitors';
import { readFileSync } from '../../utils';

export const InfoDescriptionOverride: Oas3Decorator | Oas2Decorator = ({ filePath }) => {
  return {
    Info: {
      leave(info) {
        if (!filePath) throw new Error(`Parameter "filePath" is not provided`);
        info.description = readFileSync(filePath);
      },
    }
  };
};
