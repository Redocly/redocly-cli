import type { VerifyConfigOptions } from '../../types.js';

export type BuildDocsOptions = {
  watch?: boolean;
  output?: string;
  title?: string;
  disableGoogleFont?: boolean;
  port?: number;
  templateFileName?: string;
  templateOptions?: Record<string, unknown>;
  redocOptions?: any;
  redocVersion: string;
};

export type BuildDocsArgv = {
  api: string;
  o: string;
  title?: string;
  disableGoogleFont?: boolean;
  template?: string;
  templateOptions: Record<string, unknown>;
  theme: {
    openapi: string | Record<string, unknown>;
  };
  openapi: string | Record<string, unknown>;
  inlineBundle: boolean;
} & VerifyConfigOptions;
