import {
  buildComponentCard,
  buildOperationCard,
  isPlainObject,
  type analyzeApi,
  type ApiNodeEnvelope,
  type OperationCard,
  type SpecVersion,
} from '@redocly/openapi-core';

import { parseNodeContent } from '../tree/print/signature.js';
import {
  extractBodyFields,
  extractRequiredParams,
  extractResponseCarry,
  renderRowAuth,
  type ResolveSchema,
} from './extract.js';

type ApiAnalysis = Awaited<ReturnType<typeof analyzeApi>>;
type CollectedOperation = ApiAnalysis['meta']['operations'][number];

export type ApiMap = {
  headline: string;
  legend: string[];
  servers?: string;
  security: string[];
  groups: { name: string; summary?: string; rows: string[] }[];
  webhooks: string[];
  operationCount: number;
};

export function buildMapRow(input: {
  card: OperationCard;
  isWebhook: boolean;
  containerKey: string;
  method: string;
  deprecated?: boolean;
  fallbackResolve?: ResolveSchema;
}): string {
  const { card, isWebhook, containerKey, method, deprecated, fallbackResolve } = input;
  const parsed = card.content === undefined ? undefined : parseNodeContent(card.content);
  const fromDeps = makeResolver(card.deps ?? []);
  const resolve: ResolveSchema = (ref) => fromDeps(ref) ?? fallbackResolve?.(ref);

  const target = isWebhook ? `webhook ${containerKey}` : containerKey;
  const identity = [`${method.toUpperCase()} ${target}`, card.operationId]
    .filter((part) => part !== undefined)
    .join(' · ');
  const head = card.summary === undefined ? identity : `${identity} — ${firstLine(card.summary)}`;

  const segments: string[] = [head];
  const auth = renderRowAuth(card.security);
  if (auth !== undefined) segments.push(`auth: ${auth}`);
  if (parsed !== undefined) {
    const body = extractBodyFields(parsed, resolve);
    if (body !== undefined) segments.push(`body: ${body}`);
    const params = extractRequiredParams(parsed, resolve);
    if (params !== undefined) segments.push(`params: ${params}`);
    const carry = extractResponseCarry(parsed, resolve);
    if (carry !== undefined) segments.push(carry);
  }
  if (deprecated === true) segments.push('deprecated');
  segments.push(`src: ${card.file} L${card.start_line}-${card.end_line}`);
  return segments.join(' · ');
}

/**
 * Resolves `$ref` strings from an operation's content against its deps closure: pointer refs by
 * their `<section>/<name>` id, file refs by path-suffix match on the dependency's file.
 */
function makeResolver(deps: ApiNodeEnvelope[]): ResolveSchema {
  const parsedById = new Map<string, Record<string, unknown> | undefined>();
  const parsedDep = (dep: ApiNodeEnvelope) => {
    if (!parsedById.has(dep.id)) parsedById.set(dep.id, parseNodeContent(dep.content));
    return parsedById.get(dep.id);
  };
  return (ref) => {
    const pointerMatch = ref.match(/#\/components\/([^/]+)\/([^/]+)$/);
    if (pointerMatch !== null) {
      const dep = deps.find(
        (candidate) => candidate.id === `${pointerMatch[1]}/${pointerMatch[2]}`
      );
      return dep === undefined ? undefined : parsedDep(dep);
    }
    const filePart = ref.split('#')[0].replace(/^(\.\.\/)+|^\.\//, '');
    if (filePart === '') return undefined;
    const dep = deps.find((candidate) => candidate.file.endsWith(filePart));
    return dep === undefined ? undefined : parsedDep(dep);
  };
}

export function buildApiMap(
  analysis: ApiAnalysis,
  options: { specVersion: SpecVersion; cwd: string; entryFileLabel: string }
): ApiMap {
  const meta = analysis.meta;
  const operations = meta.operations.filter((operation) => !operation.isWebhook);
  const webhookOperations = meta.operations.filter((operation) => operation.isWebhook);

  const resolvePointer = makePointerResolver(analysis, options);
  const rowFor = (operation: CollectedOperation) => {
    // Pointer refs resolve through the shared component cache; the per-operation deps closure
    // is expensive at this scale, so it is built only where file refs make it necessary.
    let card = buildOperationCard(analysis, operation, {
      specVersion: options.specVersion,
      cwd: options.cwd,
      withContent: true,
    });
    if (card.content !== undefined && /\$ref['"]?: *['"]?(?!#)/.test(card.content)) {
      card = buildOperationCard(analysis, operation, {
        specVersion: options.specVersion,
        cwd: options.cwd,
        withDeps: true,
        withContent: true,
      });
    }
    return buildMapRow({
      card,
      isWebhook: operation.isWebhook,
      containerKey: operation.containerKey,
      method: operation.method,
      deprecated: operation.deprecated,
      fallbackResolve: resolvePointer,
    });
  };

  // Every operation appears exactly once: under its first tag, or under `untagged`.
  const groups = new Map<string, string[]>();
  for (const tag of meta.declaredTags) groups.set(tag.name, []);
  for (const operation of operations) {
    const tag = operation.tags[0] ?? 'untagged';
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag)!.push(rowFor(operation));
  }

  const security = securitySection(
    meta.securitySchemes.map((scheme) => ({
      ...scheme,
      tokenUrl:
        scheme.type === 'oauth2' ? oauthTokenUrl(analysis, options, scheme.name) : undefined,
    }))
  );

  const title = meta.info?.title ?? options.entryFileLabel;
  return {
    headline: `${title} · ${options.specVersion} · ${operations.length} operations · generated by @redocly/cli from ${options.entryFileLabel} — do not edit; regenerate after editing the spec`,
    legend: [
      'one line per operation: METHOD /path · operationId — summary · auth: scheme (scopes) · body: required* fields · params: required query/header · 2xx→{what to carry} · src: file Lstart-end',
      'find your operation: grep this file by task words, or read the toc and sed its line range',
    ],
    servers: meta.servers === undefined ? undefined : meta.servers.urls.join(' · '),
    security,
    groups: [...groups.entries()]
      .filter(([, rows]) => rows.length > 0)
      .map(([name, rows]) => ({
        name,
        summary: firstLine(meta.declaredTags.find((tag) => tag.name === name)?.description),
        rows,
      })),
    webhooks: webhookOperations.map(rowFor),
    operationCount: operations.length,
  };
}

/**
 * One line per scheme the description defines. A description that defines none says so out loud:
 * silence there reads as "this API needs no auth", which is a different claim than "this document
 * never states how its calls authenticate" — and the second is what an empty section means.
 */
export function securitySection(
  schemes: {
    name: string;
    type?: string;
    in?: string;
    keyName?: string;
    scheme?: string;
    tokenUrl?: string;
  }[]
): string[] {
  if (schemes.length === 0) {
    return [
      'none declared in this description — a call may still need auth stated in its own description',
    ];
  }
  return schemes.map((scheme) => {
    const detail =
      scheme.type === 'apiKey' && scheme.in !== undefined && scheme.keyName !== undefined
        ? `apiKey in ${scheme.in} ${scheme.keyName}`
        : scheme.type === 'http' && scheme.scheme !== undefined
          ? `http ${scheme.scheme}`
          : (scheme.type ?? '');
    const token = scheme.tokenUrl === undefined ? '' : ` · token from ${scheme.tokenUrl}`;
    return `${scheme.name}: ${detail}${token}`;
  });
}

/** Lazily slices components on first reference, so 1,200 operations share one cache. */
function makePointerResolver(
  analysis: ApiAnalysis,
  options: { specVersion: SpecVersion; cwd: string }
): ResolveSchema {
  const cache = new Map<string, Record<string, unknown> | undefined>();
  return (ref) => {
    const pointerMatch = ref.match(/#\/components\/([^/]+)\/([^/]+)$/);
    if (pointerMatch === null) return undefined;
    const id = `${pointerMatch[1]}/${pointerMatch[2]}`;
    if (!cache.has(id)) {
      const component = analysis.meta.components.find(
        (candidate) => candidate.section === pointerMatch[1] && candidate.name === pointerMatch[2]
      );
      const card =
        component === undefined
          ? undefined
          : buildComponentCard(analysis, component, {
              specVersion: options.specVersion,
              cwd: options.cwd,
              withContent: true,
            });
      cache.set(id, card?.content === undefined ? undefined : parseNodeContent(card.content));
    }
    return cache.get(id);
  };
}

/** The token endpoint of an oauth2 scheme, read from the scheme component's own source. */
function oauthTokenUrl(
  analysis: ApiAnalysis,
  options: { specVersion: SpecVersion; cwd: string },
  schemeName: string
): string | undefined {
  const component = analysis.meta.components.find(
    (candidate) => candidate.section === 'securitySchemes' && candidate.name === schemeName
  );
  if (component === undefined) return undefined;
  const card = buildComponentCard(analysis, component, {
    specVersion: options.specVersion,
    cwd: options.cwd,
    withContent: true,
  });
  const parsed = card.content === undefined ? undefined : parseNodeContent(card.content);
  if (!isPlainObject(parsed) || !isPlainObject(parsed.flows)) return undefined;
  for (const flow of Object.values(parsed.flows)) {
    if (isPlainObject(flow) && typeof flow.tokenUrl === 'string') return flow.tokenUrl;
  }
  return undefined;
}

function firstLine(text: string | undefined): string | undefined {
  const line = text?.trim().split('\n')[0];
  return line === '' ? undefined : line;
}
