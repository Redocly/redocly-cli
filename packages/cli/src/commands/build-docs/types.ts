export type SpecType = 'openapi' | 'asyncapi' | 'graphql';

export type BuildDocsOptions = {
  output: string;
  title?: string;
  templateFileName?: string;
  templateOptions?: Record<string, unknown>;
  redocOptions?: Record<string, unknown>;
  redocVersion: string;
  disableTelemetry?: boolean;
  inlineBundle?: boolean;
};

export type BuildDocsArgv = {
  api: string;
  o: string;
  title?: string;
  template?: string;
  templateOptions: Record<string, unknown>;
  openapi?: string | Record<string, unknown>;
  asyncapi?: string | Record<string, unknown>;
  graphql?: string | Record<string, unknown>;
  inlineBundle: boolean;
};
