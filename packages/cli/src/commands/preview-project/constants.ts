import type { Product } from './types.js';

export const FRAMEWORK_PACKAGE = '@redocly/framework';

export const PRODUCT_PACKAGES = {
  framework: FRAMEWORK_PACKAGE,
  realm: '@redocly/realm',
  'redoc-revel': '@redocly/redoc-revel',
  'revel-reef': '@redocly/revel-reef',
  'redoc-reef': '@redocly/redoc-reef',
  redoc: '@redocly/redoc',
  revel: '@redocly/revel',
  reef: '@redocly/reef',
};

export const PRODUCT_NAMES: { [key in Product]: string } = {
  framework: 'Redocly',
  redoc: 'Redoc',
  revel: 'Revel',
  reef: 'Reef',
  realm: 'Realm',
  'redoc-revel': 'Redoc + Revel',
  'redoc-reef': 'Redoc + Reef',
  'revel-reef': 'Revel + Reef',
};

export const PRODUCT_PLANS = ['pro', 'scale', 'enterprise'] as const;
