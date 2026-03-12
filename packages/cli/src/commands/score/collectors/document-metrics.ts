import { AMBIGUOUS_PARAM_NAMES } from '../constants.js';
import type { DocumentMetrics, OperationMetrics, RefResolver } from '../types.js';
import { walkSchema } from './schema-walker.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

export interface ScoreAccumulator {
  operations: Map<string, OperationMetrics>;
  currentPath: string;
  pathLevelParams: any[];
}

export function createScoreAccumulator(): ScoreAccumulator {
  return {
    operations: new Map(),
    currentPath: '',
    pathLevelParams: [],
  };
}

export function createScoreVisitor(accumulator: ScoreAccumulator) {
  return {
    Paths: {
      PathItem: {
        enter(pathItem: any, ctx: any) {
          accumulator.currentPath = ctx.key as string;
          accumulator.pathLevelParams = Array.isArray(pathItem.parameters)
            ? pathItem.parameters
            : [];
        },
        Operation: {
          enter(operation: any, ctx: any) {
            const path = accumulator.currentPath;
            const method = ctx.key as string;
            const resolveRef = wrapCtxResolve(ctx.resolve);

            const opKey = operation.operationId ?? `${method.toUpperCase()} ${path}`;
            const metrics = collectOperationMetrics(
              path,
              method,
              operation,
              accumulator.pathLevelParams,
              resolveRef
            );
            accumulator.operations.set(opKey, metrics);
          },
        },
      },
    },
  };
}

export function getDocumentMetrics(accumulator: ScoreAccumulator): DocumentMetrics {
  return { operationCount: accumulator.operations.size, operations: accumulator.operations };
}

function wrapCtxResolve(
  resolve: (ref: { $ref: string }) => { node?: any } | undefined
): RefResolver {
  return (ref: string) => {
    try {
      const result = resolve({ $ref: ref });
      return result?.node && typeof result.node === 'object'
        ? (result.node as Record<string, any>)
        : undefined;
    } catch {
      return undefined;
    }
  };
}

export function collectDocumentMetrics(document: Record<string, any>): DocumentMetrics {
  const operations = new Map<string, OperationMetrics>();
  const paths = document.paths;
  const resolveRef = createSimpleRefResolver(document);

  if (paths && typeof paths === 'object') {
    for (const [pathStr, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue;
      const pathObj = resolveNode(pathItem as Record<string, any>, resolveRef);

      const pathLevelParams: any[] = Array.isArray(pathObj.parameters) ? pathObj.parameters : [];

      for (const method of HTTP_METHODS) {
        const operation = pathObj[method];
        if (!operation || typeof operation !== 'object') continue;

        const opKey = operation.operationId ?? `${method.toUpperCase()} ${pathStr}`;
        const metrics = collectOperationMetrics(
          pathStr,
          method,
          operation as Record<string, any>,
          pathLevelParams,
          resolveRef
        );
        operations.set(opKey, metrics);
      }
    }
  }

  return { operationCount: operations.size, operations };
}

function createSimpleRefResolver(document: Record<string, any>): RefResolver {
  return (ref: string) => {
    if (!ref.startsWith('#/')) return undefined;
    const parts = ref.slice(2).split('/');
    let current: any = document;
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined;
      current = current[decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~'))];
    }
    return current && typeof current === 'object' ? current : undefined;
  };
}

function resolveNode(node: Record<string, any>, resolveRef: RefResolver): Record<string, any> {
  if (node.$ref && typeof node.$ref === 'string') {
    return resolveRef(node.$ref) ?? node;
  }
  return node;
}

function collectOperationMetrics(
  path: string,
  method: string,
  operation: Record<string, any>,
  pathLevelParams: any[],
  resolveRef: RefResolver
): OperationMetrics {
  const allParams = mergeParameters(pathLevelParams, operation.parameters ?? [], resolveRef);

  let parameterCount = 0;
  let requiredParameterCount = 0;
  let paramsWithDescription = 0;
  let ambiguousIdentifierCount = 0;

  for (const param of allParams) {
    if (!param || typeof param !== 'object') continue;
    parameterCount++;
    if (param.required) requiredParameterCount++;
    if (param.description) paramsWithDescription++;
    if (isAmbiguousParam(param)) ambiguousIdentifierCount++;
  }

  const reqBody = operation.requestBody
    ? resolveNode(operation.requestBody, resolveRef)
    : undefined;
  const requestBodyPresent = !!reqBody;
  let maxRequestSchemaDepth = 0;
  let topLevelWritableFieldCount = 0;
  let requestExamplePresent = false;
  let totalPolymorphism = 0;
  let totalAnyOf = 0;
  let hasDiscriminator = false;
  let propertyCount = 0;
  let schemaPropsWithDesc = 0;
  let totalSchemaProps = 0;
  let constraintCount = 0;
  const refsUsed = new Set<string>();

  if (reqBody) {
    collectRefs(reqBody, refsUsed);

    if (reqBody.content && typeof reqBody.content === 'object') {
      for (const [, mediaType] of Object.entries(reqBody.content)) {
        const mt = mediaType as Record<string, any>;
        if (hasExample(mt)) {
          requestExamplePresent = true;
        }
        if (mt.schema) {
          const sm = walkSchema(mt.schema, resolveRef);
          maxRequestSchemaDepth = Math.max(maxRequestSchemaDepth, sm.depth);
          topLevelWritableFieldCount = Math.max(
            topLevelWritableFieldCount,
            sm.writableTopLevelFieldCount
          );
          totalPolymorphism += sm.oneOfCount + sm.anyOfCount + sm.allOfCount;
          totalAnyOf += sm.anyOfCount;
          if (sm.hasDiscriminator) hasDiscriminator = true;
          propertyCount += sm.propertyCount;
          schemaPropsWithDesc += sm.propertiesWithDescription;
          totalSchemaProps += sm.totalProperties;
          constraintCount += sm.constraintCount;
          if (sm.propertiesWithExamples > 0) requestExamplePresent = true;
          collectRefs(mt.schema, refsUsed);
        }
      }
    }
  }

  let maxResponseSchemaDepth = 0;
  let responseExamplePresent = false;
  let structuredErrorResponseCount = 0;
  let totalErrorResponses = 0;

  if (operation.responses && typeof operation.responses === 'object') {
    for (const [code, rawResponse] of Object.entries(operation.responses)) {
      if (!rawResponse || typeof rawResponse !== 'object') continue;
      const resp = resolveNode(rawResponse as Record<string, any>, resolveRef);
      collectRefs(rawResponse as Record<string, any>, refsUsed);

      const isError = isErrorCode(code);
      if (isError) totalErrorResponses++;

      const hasContent = resp.content && typeof resp.content === 'object';
      if (hasContent) {
        for (const [, mediaType] of Object.entries(resp.content)) {
          const mt = mediaType as Record<string, any>;
          if (hasExample(mt)) {
            responseExamplePresent = true;
          }
          if (mt.schema) {
            const sm = walkSchema(mt.schema, resolveRef);
            maxResponseSchemaDepth = Math.max(maxResponseSchemaDepth, sm.depth);
            totalPolymorphism += sm.oneOfCount + sm.anyOfCount + sm.allOfCount;
            totalAnyOf += sm.anyOfCount;
            if (sm.hasDiscriminator) hasDiscriminator = true;
            propertyCount += sm.propertyCount;
            schemaPropsWithDesc += sm.propertiesWithDescription;
            totalSchemaProps += sm.totalProperties;
            constraintCount += sm.constraintCount;
            if (sm.propertiesWithExamples > 0) responseExamplePresent = true;
            collectRefs(mt.schema, refsUsed);
          }

          if (isError) {
            structuredErrorResponseCount++;
          }
        }
      } else if (isError && resp.description) {
        structuredErrorResponseCount++;
      }
    }
  }

  return {
    path,
    method,
    operationId: operation.operationId,
    parameterCount,
    requiredParameterCount,
    paramsWithDescription,
    requestBodyPresent,
    topLevelWritableFieldCount,
    maxRequestSchemaDepth,
    maxResponseSchemaDepth,
    polymorphismCount: totalPolymorphism,
    anyOfCount: totalAnyOf,
    hasDiscriminator,
    propertyCount,
    operationDescriptionPresent: !!operation.description,
    schemaPropertiesWithDescription: schemaPropsWithDesc,
    totalSchemaProperties: totalSchemaProps,
    constraintCount,
    requestExamplePresent,
    responseExamplePresent,
    structuredErrorResponseCount,
    totalErrorResponses,
    ambiguousIdentifierCount,
    refsUsed,
  };
}

function mergeParameters(pathLevel: any[], opLevel: any[], resolveRef: RefResolver): any[] {
  const merged = new Map<string, any>();
  for (const raw of pathLevel) {
    const p = raw && typeof raw === 'object' ? resolveNode(raw, resolveRef) : raw;
    if (p && typeof p === 'object' && p.name && p.in) {
      merged.set(`${p.in}:${p.name}`, p);
    }
  }
  for (const raw of opLevel) {
    const p = raw && typeof raw === 'object' ? resolveNode(raw, resolveRef) : raw;
    if (p && typeof p === 'object' && p.name && p.in) {
      merged.set(`${p.in}:${p.name}`, p);
    }
  }
  return Array.from(merged.values());
}

function hasExample(mediaType: Record<string, any>): boolean {
  if (mediaType.example !== undefined) return true;
  if (mediaType.examples && typeof mediaType.examples === 'object') {
    return Object.keys(mediaType.examples).length > 0;
  }
  return false;
}

function isAmbiguousParam(param: Record<string, any>): boolean {
  if (param.description) return false;
  const name = (param.name ?? '').toLowerCase();
  return AMBIGUOUS_PARAM_NAMES.has(name);
}

function isErrorCode(code: string): boolean {
  if (code === 'default') return true;
  const num = parseInt(code, 10);
  return num >= 400 && num < 600;
}

function collectRefs(node: any, refs: Set<string>, seen?: Set<any>): void {
  if (!node || typeof node !== 'object') return;
  seen = seen ?? new Set();
  if (seen.has(node)) return;
  seen.add(node);

  if (typeof node.$ref === 'string') {
    refs.add(node.$ref);
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectRefs(item, refs, seen);
    }
  } else {
    for (const val of Object.values(node)) {
      collectRefs(val, refs, seen);
    }
  }
}
