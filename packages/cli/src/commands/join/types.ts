import type {
  Oas3Definition,
  Oas3_1Definition,
  Oas3_2Definition,
  Oas3Tag,
  Oas3_2Tag,
  SpecVersion,
} from '@redocly/openapi-core';

import type { VerifyConfigOptions } from '../../types.js';

export type AnyOas3Definition = Oas3Definition | Oas3_1Definition | Oas3_2Definition;

export type JoinDocumentContext = {
  api: string;
  apiFilename: string;
  apiTitle?: string;
  tags?: (Oas3Tag | Oas3_2Tag)[];
  potentialConflicts: any;
  tagsPrefix: string;
  componentsPrefix: string | undefined;
  oasVersion: Extract<SpecVersion, 'oas3_0' | 'oas3_1' | 'oas3_2'> | null;
};

export type JoinArgv = {
  apis: string[];
  'prefix-tags-with-info-prop'?: string;
  'prefix-tags-with-filename'?: boolean;
  'prefix-components-with-info-prop'?: string;
  'without-x-tag-groups'?: boolean;
  output?: string;
} & VerifyConfigOptions;
