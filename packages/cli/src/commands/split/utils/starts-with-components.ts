import { COMPONENTS } from '../constants.js';

export function startsWithComponents(node: string) {
  return node.startsWith(`#/${COMPONENTS}/`);
}
