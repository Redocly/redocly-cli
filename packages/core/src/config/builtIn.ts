import recommended from './recommended';
import all from './all';
import minimal from './minimal';
import { LintRawConfig } from './config';

export const builtInConfigs: Record<string, LintRawConfig> = {
  recommended,
  minimal,
  all,
};
