import type { VerifyConfigOptions } from '../../types.js';

export type SpecType = 'openapi' | 'asyncapi' | 'graphql';

export type BuildDocsOptions = {
  output: string;
  title?: string;
  disableGoogleFont?: boolean;
  templateFileName?: string;
  templateOptions?: Record<string, unknown>;
  redocOptions?: any;
  redocVersion: string;
  disableTelemetry?: boolean;
  inlineBundle?: boolean;
  specType: SpecType;
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
  asyncapi?: string | Record<string, unknown>;
  graphql?: string | Record<string, unknown>;
  disableTelemetry?: boolean;
  inlineBundle: boolean;
} & VerifyConfigOptions;
