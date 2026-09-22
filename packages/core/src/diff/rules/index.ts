import { async3Rules } from './async3.js';
import { oas3Rules } from './oas3.js';

export { async3Rules, oas3Rules };

export type Oas3DiffRuleId = keyof typeof oas3Rules;
export type Async3DiffRuleId = keyof typeof async3Rules;
export type DiffRuleId = Oas3DiffRuleId | Async3DiffRuleId;

export const diffRuleIds: string[] = [
  ...new Set([...Object.keys(oas3Rules), ...Object.keys(async3Rules)]),
];
