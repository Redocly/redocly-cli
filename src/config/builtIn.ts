import recommended from './recommended';
import all from './all';
import { LintRawConfig } from './config';

export const builtInConfigs: Record<string, LintRawConfig> = {
  recommended,
  all,
};
