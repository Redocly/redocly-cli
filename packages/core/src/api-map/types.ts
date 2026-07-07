export type ApiMapNodeSource = {
  file: string;
  pointer: string;
};

export type ApiMapNode = {
  title: string;
  kind: string;
  pointer: string;
  summary?: string;
  method?: string;
  path?: string;
  source?: ApiMapNodeSource;
  nodes: ApiMapNode[];
};

export type ApiMapOptions = {
  sourceLocations?: boolean;
};
