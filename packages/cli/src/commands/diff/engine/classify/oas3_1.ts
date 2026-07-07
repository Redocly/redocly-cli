import type { DiffRuleRegistry } from '../types.js';
import { oas3Rules } from './oas3.js';

// Inherits oas3 rules; override or extend pointwise when 3.1-specific rules appear.
export const oas3_1Rules: DiffRuleRegistry = { ...oas3Rules };
