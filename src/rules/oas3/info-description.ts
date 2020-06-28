import { Oas3Rule } from '../../visitors';
import { validateDefinedAndNonEmpty } from '../utils';

export const InfoDescription: Oas3Rule = () => {
  return {
    Info(info, ctx) {
      validateDefinedAndNonEmpty('description', info, ctx);
    },
  };
};
