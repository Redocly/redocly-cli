import * as oas3 from './oas3/index';
import * as oas2 from './oas2/index';
import { CustomRulesConfig } from '../index';

export const rules: CustomRulesConfig = {
  oas3: oas3.rules,
  oas2: oas2.rules,
};

export const preprocessors = {
  oas3: oas3.preprocessors,
  oas2: oas2.preprocessors,
};

export const decorators = {
  oas3: oas3.decorators,
  oas2: oas2.decorators,
};
