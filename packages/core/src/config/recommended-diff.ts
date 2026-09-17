import { recommendedDiffRules } from '../diff/rules/index.js';
import { type RawGovernanceConfig } from './types.js';

const recommendedDiff: RawGovernanceConfig<'built-in'> = {
  diff: recommendedDiffRules,
};

export default recommendedDiff;
