import recommended from './recommended';
import all from './all';
import minimal from './minimal';
import { rules as oas3Rules } from '../rules/oas3';
import { rules as oas2Rules } from '../rules/oas2';
import { preprocessors as oas3Preprocessors } from '../rules/oas3';
import { preprocessors as oas2Preprocessors } from '../rules/oas2';
import { decorators as oas3Decorators } from '../decorators/oas3';
import { decorators as oas2Decorators } from '../decorators/oas2';

import type { CustomRulesConfig, StyleguideRawConfig, Plugin } from './types';

export const builtInConfigs: Record<string, StyleguideRawConfig> = {
  recommended,
  minimal,
  all,
  'redocly-registry': {
    decorators: { 'registry-dependencies': 'on' },
  },
};

export const defaultPlugin: Plugin = {
  id: '', // default plugin doesn't have id
  rules: {
    oas3: oas3Rules,
    oas2: oas2Rules,
  } as CustomRulesConfig,
  preprocessors: {
    oas3: oas3Preprocessors,
    oas2: oas2Preprocessors,
  },
  decorators: {
    oas3: oas3Decorators,
    oas2: oas2Decorators,
  },
  configs: builtInConfigs,
};
