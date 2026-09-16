import { async3Rules } from './async3.js';
import { oas3Rules } from './oas3.js';

export { async3Rules, oas3Rules };

export type DiffRuleId = keyof typeof oas3Rules | keyof typeof async3Rules;

export const diffRuleIds: string[] = [
  ...new Set([...Object.keys(oas3Rules), ...Object.keys(async3Rules)]),
];
