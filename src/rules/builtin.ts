import * as oas3 from './oas3/index';
import { Oas3RuleSet } from '../validate';

export const rules: Record<string, Oas3RuleSet> = {
  oas3: oas3.rules,
};

export const preprocessors = {
  oas3: oas3.preprocessors
}
