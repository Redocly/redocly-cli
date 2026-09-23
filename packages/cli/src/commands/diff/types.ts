import type { Impact } from '@redocly/openapi-core';

import type { VerifyConfigOptions } from '../../types.js';
import type { DiffReportFormat } from './format/index.js';

export type DiffOutputFormat = DiffReportFormat | 'github-actions';

export type DiffFailOn = Impact | 'none';

export type DiffArgv = {
  base: string;
  revision: string;
  format: DiffOutputFormat;
  output?: string;
  'fail-on': DiffFailOn;
  'check-version': boolean;
  'skip-rule'?: string[];
} & VerifyConfigOptions;
