import type { PRODUCT_PLANS } from './constants.js';

export type ProductPlan = (typeof PRODUCT_PLANS)[number];

export type PreviewProjectArgv = {
  /** Deprecated and ignored: the preview always runs `@redocly/framework`. */
  product?: string;
  plan: ProductPlan | string;
  port?: number;
  'project-dir': string;
};
