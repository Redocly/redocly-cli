import type { Oas2Visitor, Oas3Visitor } from '../visitors.js';
import { deriveOperationSummary, deriveSchemaSummary } from './derive-summary.js';
import { createApiMapHooks } from './hooks.js';
import type { ApiMapNode, ApiMapOptions } from './types.js';

export function ApiMapOAS3(root: ApiMapNode, opts: ApiMapOptions): Oas3Visitor {
  const { rootHooks, sectionHooks, containerHooks, operationHooks, leafHooks } = createApiMapHooks(
    root,
    opts
  );

  return {
    Root: rootHooks,
    Info: leafHooks('title'),
    ServerList: {
      ...sectionHooks('Root'),
      Server: leafHooks('url'),
    },
    TagList: {
      ...sectionHooks('Root'),
      Tag: leafHooks('name'),
    },
    Paths: {
      ...sectionHooks('Root'),
      PathItem: {
        ...containerHooks,
        Operation: operationHooks({ method: true, path: true }, deriveOperationSummary),
      },
    },
    WebhooksMap: {
      ...sectionHooks('Root'),
      PathItem: {
        ...containerHooks,
        Operation: operationHooks({ method: true }, deriveOperationSummary),
      },
    },
    Components: {
      ...sectionHooks('Root'),
      NamedSchemas: {
        ...sectionHooks('Components'),
        Schema: leafHooks(undefined, deriveSchemaSummary),
      },
      NamedResponses: { ...sectionHooks('Components'), Response: leafHooks() },
      NamedParameters: { ...sectionHooks('Components'), Parameter: leafHooks() },
      NamedExamples: { ...sectionHooks('Components'), Example: leafHooks() },
      NamedRequestBodies: { ...sectionHooks('Components'), RequestBody: leafHooks() },
      NamedHeaders: { ...sectionHooks('Components'), Header: leafHooks() },
      NamedSecuritySchemes: { ...sectionHooks('Components'), SecurityScheme: leafHooks() },
      NamedLinks: { ...sectionHooks('Components'), Link: leafHooks() },
      NamedCallbacks: { ...sectionHooks('Components'), Callback: leafHooks() },
      NamedPathItems: { ...sectionHooks('Components'), PathItem: containerHooks },
      NamedMediaTypes: { ...sectionHooks('Components'), MediaTypesMap: leafHooks() },
    },
  };
}

export function ApiMapOAS2(root: ApiMapNode, opts: ApiMapOptions): Oas2Visitor {
  const { rootHooks, sectionHooks, containerHooks, operationHooks, leafHooks } = createApiMapHooks(
    root,
    opts
  );

  return {
    Root: rootHooks,
    Info: leafHooks('title'),
    TagList: {
      ...sectionHooks('Root'),
      Tag: leafHooks('name'),
    },
    Paths: {
      ...sectionHooks('Root'),
      PathItem: {
        ...containerHooks,
        Operation: operationHooks({ method: true, path: true }, deriveOperationSummary),
      },
    },
    NamedSchemas: { ...sectionHooks('Root'), Schema: leafHooks(undefined, deriveSchemaSummary) },
    NamedParameters: { ...sectionHooks('Root'), Parameter: leafHooks() },
    NamedResponses: { ...sectionHooks('Root'), Response: leafHooks() },
    NamedSecuritySchemes: { ...sectionHooks('Root'), SecurityScheme: leafHooks() },
  };
}
