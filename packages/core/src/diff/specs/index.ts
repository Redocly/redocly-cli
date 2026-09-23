import type { SpecMajorVersion } from '../../oas-types.js';
import type { DiffSpec } from '../types.js';
import { async3Spec } from './async3.js';
import { oas3Spec } from './oas3.js';

/** A document of a family without its own spec is still compared, just never judged. */
export const structuralSpec: DiffSpec = {
  identityOf: () => undefined,
  directionOf: () => 'neutral',
};

/** Only these families have diff rules. */
export const diffSpecs: Partial<Record<SpecMajorVersion, DiffSpec>> = {
  oas3: oas3Spec,
  async3: async3Spec,
};
