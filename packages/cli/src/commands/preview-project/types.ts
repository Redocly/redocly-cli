import type { VerifyConfigOptions } from '../../types.js';
import type { PRODUCT_PACKAGES, PRODUCT_PLANS } from './constants.js';

export type Product = keyof typeof PRODUCT_PACKAGES;
export type ProductPlan = typeof PRODUCT_PLANS[number];

export type PreviewProjectArgv = {
  product?: Product | string;
  plan: ProductPlan | string;
  port?: number;
  'project-dir': string;
} & VerifyConfigOptions;
