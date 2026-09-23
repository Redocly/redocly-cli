import { constraintRule } from './utils.js';

export const StringLengthChanged = constraintRule(['minLength', 'maxLength', 'pattern']);
