import oas3 from './oas3/index';
import { RuleSet } from '../validate';

export const rules: Record<string, RuleSet<any>> = {
  oas3,
};
