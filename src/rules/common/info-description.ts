import { Oas3Rule, Oas2Rule } from '../../visitors';
import { validateDefinedAndNonEmpty } from '../utils';

export const InfoDescription: Oas3Rule | Oas2Rule = () => {
  return {
    Info(info, ctx) {
      validateDefinedAndNonEmpty('description', info, ctx);
    },
  };
};
