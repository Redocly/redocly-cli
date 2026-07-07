import type { Async2Visitor, Async3Visitor } from '../visitors.js';
import {
  deriveAsync2OperationSummary,
  deriveAsync3OperationSummary,
  deriveSchemaSummary,
} from './derive-summary.js';
import { createApiMapHooks } from './hooks.js';
import type { ApiMapNode, ApiMapOptions } from './types.js';

export function ApiMapAsync2(root: ApiMapNode, opts: ApiMapOptions): Async2Visitor {
  const { rootHooks, sectionHooks, containerHooks, operationHooks, leafHooks } = createApiMapHooks(
    root,
    opts
  );

  return {
    Root: rootHooks,
    Info: leafHooks('title'),
    ServerMap: {
      ...sectionHooks('Root'),
      Server: leafHooks(),
    },
    TagList: {
      ...sectionHooks('Root'),
      Tag: leafHooks('name'),
    },
    ChannelMap: {
      ...sectionHooks('Root'),
      Channel: {
        ...containerHooks,
        Operation: operationHooks({}, deriveAsync2OperationSummary),
      },
    },
    Components: {
      ...sectionHooks('Root'),
      NamedSchemas: {
        ...sectionHooks('Components'),
        Schema: leafHooks(undefined, deriveSchemaSummary),
      },
      NamedMessages: { ...sectionHooks('Components'), Message: leafHooks('title') },
      NamedParameters: { ...sectionHooks('Components'), Parameter: leafHooks() },
      NamedSecuritySchemes: { ...sectionHooks('Components'), SecurityScheme: leafHooks() },
    },
  };
}

export function ApiMapAsync3(root: ApiMapNode, opts: ApiMapOptions): Async3Visitor {
  const { rootHooks, sectionHooks, leafHooks } = createApiMapHooks(root, opts);

  return {
    Root: rootHooks,
    Info: leafHooks('title'),
    ServerMap: {
      ...sectionHooks('Root'),
      Server: leafHooks(),
    },
    NamedChannels: {
      ...sectionHooks('Root'),
      Channel: leafHooks('title'),
    },
    NamedOperations: {
      ...sectionHooks('Root'),
      Operation: leafHooks('title', deriveAsync3OperationSummary),
    },
    Components: {
      ...sectionHooks('Root'),
      NamedSchemas: {
        ...sectionHooks('Components'),
        Schema: leafHooks(undefined, deriveSchemaSummary),
      },
      NamedMessages: { ...sectionHooks('Components'), Message: leafHooks('title') },
      NamedParameters: { ...sectionHooks('Components'), Parameter: leafHooks() },
      NamedSecuritySchemes: { ...sectionHooks('Components'), SecurityScheme: leafHooks() },
    },
  };
}
