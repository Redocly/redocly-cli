export type BuildDocsOptions = {
  watch?: boolean;
  cdn?: boolean;
  output?: string;
  title?: string;
  disableGoogleFont?: boolean;
  port?: number;
  templateFileName?: string;
  templateOptions?: any;
  redocOptions?: any;
  redocCurrentVersion: string;
};

export type BuildDocsArgv = {
  api: string;
  o: string;
  cdn: boolean;
  title?: string;
  disableGoogleFont?: boolean;
  template?: string;
  templateOptions: Record<string, any>;
  theme: {
    openapi: string | Record<string, unknown>;
  };
  config?: string;
};
