import {
  handleScorecardClassic as runScorecardClassic,
  type ScorecardClassicArgv,
} from '@redocly/reunite-integration';

import { getAliasOrPath, getFallbackApisOrExit } from '../utils/miscellaneous.js';
import type { CommandArgs } from '../wrapper.js';

export type ScorecardClassicCommandArgv = ScorecardClassicArgv & {
  api: string;
};

export async function handleScorecardClassic({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<ScorecardClassicCommandArgv>) {
  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const { path, alias } = apis[0];
  const matchedAlias = getAliasOrPath(config, path).alias || alias;

  await runScorecardClassic({
    argv,
    config,
    version,
    api: { path, alias: matchedAlias },
    collectSpecData,
  });
}
