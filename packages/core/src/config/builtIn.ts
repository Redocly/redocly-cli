import recommended from './recommended';
import all from './all';
import minimal from './minimal';
import { LintRawConfig, Plugin } from './config';

import * as builtinRules from '../rules/builtin';

export const builtInConfigs: Record<string, LintRawConfig> = {
  recommended,
  minimal,
  all,
  'redocly-registry': {
    decorators: { 'registry-dependencies': 'on' }
  }
};

export const defaultPlugin: Plugin = {
  id: '', // default plugin doesn't have id
  rules: builtinRules.rules,
  preprocessors: builtinRules.preprocessors,
  decorators: builtinRules.decorators,
  configs: builtInConfigs,
}