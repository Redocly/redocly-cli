export type BuildDocsOptions = {
  ssr?: boolean;
  watch?: boolean;
  cdn?: boolean;
  output?: string;
  title?: string;
  disableGoogleFont?: boolean;
  port?: number;
  templateFileName?: string;
  templateOptions?: any;
  redocOptions?: any;
};

export type BuildDocsArgv = {
  spec: string;
  o: string;
  cdn: boolean;
  title?: string;
  disableGoogleFont?: boolean;
  template?: string;
  templateOptions: Record<string, any>;
  options: string | Record<string, unknown>;
};
