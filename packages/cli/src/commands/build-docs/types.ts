import type { VerifyConfigOptions } from '../../types.js';

export type BuildDocsOptions = {
  output: string;
  title?: string;
  disableGoogleFont?: boolean;
  templateFileName?: string;
  templateOptions?: Record<string, unknown>;
  redocOptions?: any;
  redocVersion: string;
  telemetry?: boolean;
  inlineBundle?: boolean;
  specType?: 'openapi' | 'asyncapi' | 'graphql';
};

export type BuildDocsArgv = {
  api: string;
  o: string;
  title?: string;
  disableGoogleFont?: boolean;
  template?: string;
  templateOptions: Record<string, any>;
  theme?: {
    openapi: string | Record<string, unknown>;
  };
  openapi?: string | Record<string, unknown>;
  telemetry: boolean;
  inlineBundle: boolean;
} & VerifyConfigOptions;
