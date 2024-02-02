import { PRODUCT_PACKAGES, PRODUCT_PLANS } from './constants';

export type Product = keyof typeof PRODUCT_PACKAGES;
export type ProductPlan = typeof PRODUCT_PLANS[number];

export type PreviewProjectOptions = {
  product?: Product | string;
  plan: ProductPlan | string;
  port?: number;
  'source-dir': string;
  config?: string;
};
