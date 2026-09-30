import { constraintRule } from './utils.js';

export const StringConstraintChanged = constraintRule(['minLength', 'maxLength', 'pattern']);
