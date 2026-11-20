import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { YAMLNode, LoadOptions } from 'yaml-ast-parser';

import type { ResolveConfig } from './config/types.js';
import { YamlParseError } from './errors/yaml-parse-error.js';
import { isGraphqlRef } from './graphql/detect-graphql.js';
import { parseYaml } from './js-yaml/index.js';
import {
  isRef,
  joinPointer,
  escapePointerFragment,
  parseRef,
  isAbsoluteUrl,
  isAnchor,
  isFileUrl,
  isExternalValue,
  isRefWithSiblings,
  getSchemaId,
  resolveSchemaId,
  Location,
} from './ref-utils.js';
import { isNamedType, SpecExtension, type NormalizedNodeType } from './types/index.js';
import type { OasRef } from './typings/openapi.js';
import { getOwn } from './utils/get-own.js';
import { isPlainObject } from './utils/is-plain-object.js';
import { isSupportedExtension } from './utils/is-supported-extension.js';
import { makeRefId } from './utils/make-ref-id.js';
import { readFileFromUrl } from './utils/read-file-from-url.js';
import type { ResolveFn } from './walk.js';

export type CollectedRefs = Map<string /* absoluteFilePath */, Document>;

export class Source {
  constructor(
    public absoluteRef: string,
    public body: string,
    public mimeType?: string
  ) {}

  #ast: YAMLNode | undefined;
  #lines: string[] | undefined;

  // pass safeLoad as argument to separate it from browser bundle
  getAst(safeLoad: (input: string, options?: LoadOptions | undefined) => YAMLNode) {
    if (this.#ast === undefined) {
      this.#ast = safeLoad(this.body, { filename: this.absoluteRef }) ?? undefined;

      // fix ast representation of file with newlines only
      if (
        this.#ast &&
        this.#ast.kind === 0 && // KIND.scalar = 0
        this.#ast.value === '' &&
        this.#ast.startPosition !== 1
      ) {
        this.#ast.startPosition = 1;
        this.#ast.endPosition = 1;
      }
    }
    return this.#ast;
  }

  getLines() {
    if (this.#lines === undefined) {
      this.#lines = this.body.split(/\r\n|[\n\r]/g);
    }
    return this.#lines;
  }
}

export class ResolveError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ResolveError.prototype);
  }
}

export type Document<T = unknown> = {
  source: Source;
  parsed: T;
};

export function makeDocumentFromString<T = unknown>(
  sourceString: string,
  absoluteRef: string
): Document<T> {
  const source = new Source(absoluteRef, sourceString);
  // GraphQL SDL is not YAML/JSON: keep the raw body for the GraphQL engine.
  if (isGraphqlRef(absoluteRef)) {
    return { source, parsed: sourceString as T };
  }
  try {
    return {
      source,
      parsed: parseYaml(sourceString, { filename: absoluteRef }) as T,
    };
  } catch (e) {
    throw new YamlParseError(e, source);
  }
}

export class BaseResolver {
  cache: Map<string, Promise<Document | ResolveError>> = new Map();
  // Local files that overlays add to a remote API description. Any other `file:` URL is followed
  // only from a local document, so a remote description can't read the user's files.
  overlayFiles: Set<string> = new Set();

  constructor(protected config: ResolveConfig = { http: { headers: [] } }) {}

  getFiles() {
    return new Set(Array.from(this.cache.keys()));
  }

  resolveExternalRef(base: string | null, ref: string): string {
    if (isAbsoluteUrl(ref)) {
      return ref;
    }

    if (base && isAbsoluteUrl(base)) {
      return new URL(ref, base).href;
    }

    return path.resolve(base ? path.dirname(base) : process.cwd(), ref);
  }

  async loadExternalRef(absoluteRef: string): Promise<Source> {
    try {
      if (isAbsoluteUrl(absoluteRef) && !isFileUrl(absoluteRef)) {
        const { body, mimeType } = await readFileFromUrl(absoluteRef, this.config.http);
        return new Source(absoluteRef, body, mimeType);
      } else {
        const filePath = isFileUrl(absoluteRef) ? fileURLToPath(absoluteRef) : absoluteRef;
        if (fs.lstatSync(filePath).isDirectory()) {
          throw new Error(`Expected a file but received a folder at ${filePath}.`);
        }
        const content = await fs.promises.readFile(filePath, 'utf-8');
        // In some cases file have \r\n line delimeters like on windows, we should skip it.
        return new Source(absoluteRef, content.replace(/\r\n/g, '\n'));
      }
    } catch (error) {
      error.message = error.message.replace(', lstat', '');
      throw new ResolveError(error);
    }
  }

  parseDocument(source: Source, isRoot: boolean = false): Document {
    // GraphQL SDL is not YAML/JSON: keep the raw body for the GraphQL engine.
    if (isGraphqlRef(source.absoluteRef)) {
      return { source, parsed: source.body };
    }

    const filename = isAbsoluteUrl(source.absoluteRef)
      ? new URL(source.absoluteRef).pathname
      : source.absoluteRef;

    if (
      !isSupportedExtension(filename) &&
      !source.mimeType?.match(/(json|yaml|openapi)/) &&
      !isRoot // always parse root
    ) {
      return { source, parsed: source.body };
    }

    try {
      return {
        source,
        parsed: parseYaml(source.body, { filename: source.absoluteRef }),
      };
    } catch (e) {
      throw new YamlParseError(e, source);
    }
  }

  async resolveDocument<T = unknown>(
    base: string | null,
    ref: string,
    isRoot: boolean = false
  ): Promise<Document<T> | ResolveError | YamlParseError> {
    const absoluteRef = this.resolveExternalRef(base, ref);

    if (
      isFileUrl(absoluteRef) &&
      base !== null &&
      isAbsoluteUrl(base) &&
      !isFileUrl(base) &&
      !this.overlayFiles.has(absoluteRef)
    ) {
      throw new ResolveError(
        new Error(`A remote document can't reference ${absoluteRef}, which is a local file.`)
      );
    }

    const cachedDocument = this.cache.get(absoluteRef) as Document<T> | ResolveError | undefined;
    if (cachedDocument) {
      return cachedDocument;
    }

    const doc = this.loadExternalRef(absoluteRef).then((source) => {
      return this.parseDocument(source, isRoot) as Document<T>;
    });

    this.cache.set(absoluteRef, doc);

    return doc;
  }
}

// A $ref with sibling keys the resolution chased through on the way to the chain end.
export type ResolvedRefChainHop = {
  node: unknown;
  document: Document;
  location: Location;
};

export type ResolvedRef =
  | {
      resolved: false;
      isRemote: boolean;
      nodePointer?: string;
      document?: Document;
      source?: Source;
      error?: ResolveError | YamlParseError;
      node?: any;
      chain?: undefined;
    }
  | {
      resolved: true;
      node: any;
      document: Document;
      nodePointer: string;
      isRemote: boolean;
      error?: undefined;
      chain?: ResolvedRefChainHop[];
    };

export type ResolvedRefMap = Map<string, ResolvedRef>;

type SchemaResource = {
  // Base URI used to resolve URI references written inside the resource.
  baseUri: string;
  // Prefix of the resolvedRefMap keys for refs inside the resource. Same as `baseUri`, except for a
  // resource that repeats an $id already declared by another one: it gets its own prefix so the two
  // resources do not overwrite each other's entries.
  refBase: string;
  node: Record<string, unknown>;
  document: Document;
  nodePointer: string;
};

export type DuplicateSchemaId = {
  id: string;
  document: Document;
  pointer: string;
};

export type EnclosingSchemaScope = {
  // Base to resolve refs from inside this $id resource; see SchemaResource.refBase.
  refBase: string;
  // The resource's base URI (its resolved $id).
  baseUri: string;
  nodePointer: string;
};

// $id bookkeeping for one resolveDocument() run, keyed by the ResolvedRefMap the run returns, so
// repeated or concurrent runs never share it. Documents without any $id never get an entry, and
// lookups for them are a plain resolvedRefMap.get(), exactly as before.
type ResolverScopeState = {
  // Resolutions of $ref nodes inside an $id resource (or matched to one), keyed by the $ref node.
  // `viaSchemaId` is set when the ref resolved by matching a schema $id rather than a file.
  byNode: WeakMap<OasRef, { rawRef: string; resolved: ResolvedRef; viaSchemaId: boolean }>;
  // resolvedRefMap keys of the refs that resolved by matching a schema $id
  viaSchemaIdKeys: Set<string>;
  // Pointer -> refBase of every $id resource, per document (keyed by absoluteRef, so the scopes
  // survive copies of the map that clone the documents).
  scopesBySource: Map<string, Map<string, { refBase: string; baseUri: string }>>;
  duplicateSchemaIds: DuplicateSchemaId[];
};

const scopeStateByMap = new WeakMap<ResolvedRefMap, ResolverScopeState>();

// walkDocument() links the `resolve` function it hands to visitors with its map, so code that only
// receives `resolve` (example validation) can reach the $id scopes of the same run.
const mapByResolveFn = new WeakMap<ResolveFn, ResolvedRefMap>();

type ResolvedRefMapOrResolveFn = ResolvedRefMap | ResolveFn;

export function hasSchemaScopes(mapOrResolveFn: ResolvedRefMapOrResolveFn): boolean {
  return getScopeState(mapOrResolveFn) !== undefined;
}

export function linkResolveFn(resolveFn: ResolveFn, resolvedRefMap: ResolvedRefMap) {
  mapByResolveFn.set(resolveFn, resolvedRefMap);
}

function getScopeState(mapOrResolveFn: ResolvedRefMapOrResolveFn): ResolverScopeState | undefined {
  const map = mapOrResolveFn instanceof Map ? mapOrResolveFn : mapByResolveFn.get(mapOrResolveFn);
  return map ? scopeStateByMap.get(map) : undefined;
}

// Carries the $id scopes of a run over to a copy of its map (e.g. a deep clone). Resolutions keyed
// by $ref node are not copied: a clone exists so that its resolved nodes are separate objects.
export function copySchemaScopes(from: ResolvedRefMap, to: ResolvedRefMap) {
  const state = scopeStateByMap.get(from);
  if (state) {
    scopeStateByMap.set(to, {
      byNode: new WeakMap(),
      viaSchemaIdKeys: state.viaSchemaIdKeys,
      scopesBySource: state.scopesBySource,
      duplicateSchemaIds: state.duplicateSchemaIds,
    });
  }
}

// True when `ref` (a $ref node of the resolved document) resolved by matching a schema $id.
export function isResolvedBySchemaId(resolvedRefMap: ResolvedRefMap, ref: OasRef): boolean {
  const byNode = scopeStateByMap.get(resolvedRefMap)?.byNode.get(ref);
  return !!byNode && byNode.rawRef === ref.$ref && byNode.viaSchemaId;
}

const DUPLICATE_ID_PARAM = 'redocly-duplicate-id';

function isPointerWithin(pointer: string, scopePointer: string): boolean {
  return (
    scopePointer === '#/' || pointer === scopePointer || pointer.startsWith(scopePointer + '/')
  );
}

// Returns the $id schema resource that lexically encloses `location` in the run that produced
// `mapOrResolveFn` (a ResolvedRefMap, or a `resolve` function from walkDocument).
export function getEnclosingSchemaScope(
  mapOrResolveFn: ResolvedRefMapOrResolveFn,
  location: Location
): EnclosingSchemaScope | undefined {
  const scopes = getScopeState(mapOrResolveFn)?.scopesBySource.get(location.source.absoluteRef);
  if (!scopes) {
    return undefined;
  }

  let bestPointer: string | undefined;
  for (const scopePointer of scopes.keys()) {
    if (
      isPointerWithin(location.pointer, scopePointer) &&
      (bestPointer === undefined || scopePointer.length > bestPointer.length)
    ) {
      bestPointer = scopePointer;
    }
  }

  if (bestPointer === undefined) {
    return undefined;
  }

  return { ...scopes.get(bestPointer)!, nodePointer: bestPointer };
}

// Finds the resolution of `ref` as seen from `currentLocation` (or from an explicit base `from`).
// Inside an $id resource, refs are recorded under that resource's base instead of the file.
export function lookupResolvedRef(
  resolvedRefMap: ResolvedRefMap,
  ref: OasRef,
  from: string | undefined,
  currentLocation: Location
): ResolvedRef | undefined {
  const state = scopeStateByMap.get(resolvedRefMap);
  if (state) {
    // A $ref node from the document knows its own resolution, whatever base the caller passes.
    const byNode = state.byNode.get(ref);
    if (byNode && byNode.rawRef === ref.$ref) {
      return byNode.resolved;
    }
    // A $ref object built by a visitor (e.g. discriminator mapping values) resolves against the
    // base of the $id resource that encloses the visitor's location.
    if (from === undefined) {
      from = getEnclosingSchemaScope(resolvedRefMap, currentLocation)?.refBase;
    }
  }

  return resolvedRefMap.get(makeRefId(from ?? currentLocation.source.absoluteRef, ref.$ref));
}

// True when the URI reference `$ref`, written at `location`, resolved by matching a schema $id.
export function isSchemaIdRef(
  resolvedRefMap: ResolvedRefMap,
  location: Location,
  $ref: string
): boolean {
  const state = scopeStateByMap.get(resolvedRefMap);
  if (!state) return false;
  const base = getEnclosingSchemaScope(resolvedRefMap, location)?.refBase;
  return state.viaSchemaIdKeys.has(makeRefId(base ?? location.source.absoluteRef, $ref));
}

export function getDuplicateSchemaIds(
  mapOrResolveFn: ResolvedRefMapOrResolveFn
): DuplicateSchemaId[] {
  return getScopeState(mapOrResolveFn)?.duplicateSchemaIds ?? [];
}

// Keywords whose value is a subschema, a map of subschemas, or an array of subschemas.
const SUBSCHEMA_KEYWORDS = new Set([
  'additionalItems',
  'additionalProperties',
  'contains',
  'contentSchema',
  'else',
  'if',
  'items',
  'not',
  'propertyNames',
  'then',
  'unevaluatedItems',
  'unevaluatedProperties',
]);
const SUBSCHEMA_MAP_KEYWORDS = new Set([
  '$defs',
  'definitions',
  'dependencies',
  'dependentSchemas',
  'patternProperties',
  'properties',
]);
const SUBSCHEMA_ARRAY_KEYWORDS = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);

type SchemaPosition = 'schema' | 'map' | 'array' | 'none';

function nextSchemaPosition(
  position: SchemaPosition,
  segment: string,
  value: unknown
): SchemaPosition {
  if (position === 'map' || position === 'array') return 'schema';
  if (position !== 'schema') return 'none';
  if (SUBSCHEMA_MAP_KEYWORDS.has(segment)) return 'map';
  if (SUBSCHEMA_ARRAY_KEYWORDS.has(segment)) return 'array';
  if (SUBSCHEMA_KEYWORDS.has(segment)) return Array.isArray(value) ? 'array' : 'schema';
  return 'none';
}

type RefFrame = {
  prev: RefFrame | null;
  node: unknown;
};

function pushRef(head: RefFrame, node: unknown): RefFrame {
  return {
    prev: head,
    node,
  };
}

function hasRef(head: RefFrame | null, node: unknown): boolean {
  while (head) {
    if (head.node === node) {
      return true;
    }
    head = head.prev;
  }
  return false;
}

const unknownType = { name: 'unknown', properties: {} };
const resolvableScalarType = { name: 'scalar', properties: {} };

export async function resolveDocument(opts: {
  rootDocument: Document;
  externalRefResolver: BaseResolver;
  rootType: NormalizedNodeType;
}): Promise<ResolvedRefMap> {
  const { rootDocument, externalRefResolver, rootType } = opts;
  const resolvedRefMap: ResolvedRefMap = new Map();
  const seenNodes = new Set<string>(); // format "${type}::${absoluteRef}${pointer}"
  const schemaResources = new Map<string, SchemaResource>();
  const nodeResources = new WeakMap<object, SchemaResource>();
  const seenDuplicateLocations = new Set<string>();
  // the $id resource enclosing each composed $ref recorded as a chain hop
  const chainHopResources = new WeakMap<object, SchemaResource | undefined>();

  const resolvePromises: Array<Promise<void>> = [];
  resolveRefsInParallel(rootDocument.parsed, rootDocument, '#/', rootType);

  let resolved;
  do {
    resolved = await Promise.all(resolvePromises);
  } while (resolvePromises.length !== resolved.length);

  return resolvedRefMap;

  function scopeState(): ResolverScopeState {
    let state = scopeStateByMap.get(resolvedRefMap);
    if (!state) {
      state = {
        byNode: new WeakMap(),
        viaSchemaIdKeys: new Set(),
        scopesBySource: new Map(),
        duplicateSchemaIds: [],
      };
      scopeStateByMap.set(resolvedRefMap, state);
    }
    return state;
  }

  function registerSchemaResource(
    node: Record<string, unknown>,
    document: Document,
    nodePointer: string,
    parentResource: SchemaResource | undefined
  ): SchemaResource | undefined {
    const existingForNode = nodeResources.get(node);
    if (existingForNode) {
      return existingForNode;
    }

    const schemaId = getSchemaId(node);
    if (!schemaId) {
      return parentResource;
    }

    const baseUri = resolveSchemaId(
      parentResource?.baseUri ?? document.source.absoluteRef,
      schemaId
    );
    const state = scopeState();
    const existingById = schemaResources.get(baseUri);
    let refBase = baseUri;
    if (existingById && existingById.node !== node) {
      const pointer = joinPointer(nodePointer, '$id');
      const dupKey = `${document.source.absoluteRef}::${pointer}`;
      if (!seenDuplicateLocations.has(dupKey)) {
        seenDuplicateLocations.add(dupKey);
        state.duplicateSchemaIds.push({ id: baseUri, document, pointer });
      }
      // keeps relative URI resolution intact while giving the duplicate its own map keys
      const separator = baseUri.includes('?') ? '&' : '?';
      refBase = `${baseUri}${separator}${DUPLICATE_ID_PARAM}=${state.duplicateSchemaIds.length}`;
    }

    const resource: SchemaResource = { baseUri, refBase, node, document, nodePointer };
    nodeResources.set(node, resource);
    if (!existingById) {
      schemaResources.set(baseUri, resource);
    }

    let scopes = state.scopesBySource.get(document.source.absoluteRef);
    if (!scopes) {
      scopes = new Map();
      state.scopesBySource.set(document.source.absoluteRef, scopes);
    }
    scopes.set(nodePointer, { refBase, baseUri });

    return resource;
  }

  function recordResolvedRef(
    ref: OasRef,
    resolvedRef: ResolvedRef,
    document: Document,
    enclosingResource: SchemaResource | undefined,
    viaSchemaId = false
  ) {
    const base = enclosingResource?.refBase ?? document.source.absoluteRef;
    resolvedRefMap.set(makeRefId(base, ref.$ref), resolvedRef);

    if (enclosingResource || viaSchemaId) {
      const state = scopeState();
      state.byNode.set(ref, { rawRef: ref.$ref, resolved: resolvedRef, viaSchemaId });
      if (viaSchemaId) state.viaSchemaIdKeys.add(makeRefId(base, ref.$ref));
    }
  }

  function resolveRefsInParallel(
    rootNode: unknown,
    rootNodeDocument: Document,
    rootNodePointer: string,
    type: NormalizedNodeType,
    initialResource?: SchemaResource
  ) {
    const rootNodeDocAbsoluteRef = rootNodeDocument.source.absoluteRef;

    const anchorRefsMap: Map<string, unknown> = new Map();
    const rootResource =
      (isPlainObject(rootNode) && nodeResources.get(rootNode)) || initialResource;

    const pendingRefFollows: Array<() => void> = [];

    walk(rootNode, type, rootNodeDocAbsoluteRef + rootNodePointer, rootResource);

    for (const follow of pendingRefFollows) {
      follow();
    }

    // oxlint-disable-next-line sonarjs/cognitive-complexity
    function walk(
      node: unknown,
      type: NormalizedNodeType,
      nodeAbsoluteRef: string,
      enclosingResource: SchemaResource | undefined
    ) {
      if (!isPlainObject(node) && !Array.isArray(node)) {
        return;
      }

      const nodeId = `${type.name}::${nodeAbsoluteRef}`;
      if (seenNodes.has(nodeId)) {
        return;
      }

      seenNodes.add(nodeId);

      if (Array.isArray(node)) {
        const itemsType = type.items;
        // we continue resolving unknown types, but stop early on known scalars
        if (itemsType === undefined && type !== unknownType && type !== SpecExtension) {
          return;
        }
        const isTypeAFunction = typeof itemsType === 'function';
        for (let i = 0; i < node.length; i++) {
          let itemType = isTypeAFunction
            ? itemsType(node[i], joinPointer(nodeAbsoluteRef, i))
            : itemsType;
          // we continue resolving unknown types, but stop early on known scalars
          if (itemType === undefined && type !== unknownType && type !== SpecExtension) {
            continue;
          }

          const value = itemType?.directResolveAs ? { $ref: node[i] } : node[i];
          itemType = itemType?.directResolveAs || itemType;

          walk(
            value,
            isNamedType(itemType) ? itemType : unknownType,
            joinPointer(nodeAbsoluteRef, i),
            enclosingResource
          );
        }
        return;
      }

      if (getOwn(type.properties, '$id')) {
        const nodePointer = nodeAbsoluteRef.slice(rootNodeDocAbsoluteRef.length) || '#/';
        enclosingResource = registerSchemaResource(
          node,
          rootNodeDocument,
          nodePointer,
          enclosingResource
        );
      }

      const [_, anchor] = Object.entries(node).find(([key]) => key === '$anchor') || [];
      if (anchor) {
        anchorRefsMap.set(`#${anchor}`, node);
      }

      for (const propName of Object.keys(node)) {
        let propValue = node[propName];
        let propType = getOwn(type.properties, propName);
        const isExtensionKey =
          type.extensionsPrefix !== undefined && propName.startsWith(type.extensionsPrefix);

        // extensions are not additional properties — only regular undeclared keys take the catch-all type
        if (propType === undefined && !isExtensionKey) {
          propType = type.additionalProperties;
        }
        // a function type picks the concrete type from the value; runs after the fallback because additionalProperties can be a function too
        if (typeof propType === 'function') propType = propType(propValue, propName);
        // an undeclared extension key resolves as SpecExtension so $refs inside it are followed
        if (isExtensionKey && propType === undefined) propType = SpecExtension;
        if (propType === undefined) propType = unknownType;

        if (!isNamedType(propType) && propType?.directResolveAs) {
          propType = propType.directResolveAs;
          propValue = { $ref: propValue };
        }

        if (propType && propType.name === undefined && propType.resolvable !== false) {
          propType = resolvableScalarType;
        }

        if (!isNamedType(propType) || !(isPlainObject(propValue) || Array.isArray(propValue))) {
          continue;
        }

        walk(
          propValue,
          propType,
          joinPointer(nodeAbsoluteRef, escapePointerFragment(propName)),
          enclosingResource
        );
      }

      if (isRef(node)) {
        const refNode = node;
        const refResource = enclosingResource;
        const isSchemaRef = getOwn(type.properties, '$id') !== undefined;
        pendingRefFollows.push(() => {
          const promise = followRef(
            rootNodeDocument,
            refNode,
            {
              prev: null,
              node: refNode,
            },
            refResource,
            isSchemaRef
          ).then(({ resolvedRef, targetResource }) => {
            if (resolvedRef.resolved) {
              resolveRefsInParallel(
                resolvedRef.node,
                resolvedRef.document,
                resolvedRef.nodePointer!,
                type,
                targetResource
              );
              // chain hops carry sibling keys that can contain refs of their own
              for (const chainHop of resolvedRef.chain ?? []) {
                const hopResource = isPlainObject(chainHop.node)
                  ? (nodeResources.get(chainHop.node) ?? chainHopResources.get(chainHop.node))
                  : undefined;
                resolveRefsInParallel(
                  chainHop.node,
                  chainHop.document,
                  chainHop.location.pointer,
                  type,
                  hopResource
                );
              }
            }
          });
          resolvePromises.push(promise);
        });
      }

      // handle example.externalValue as reference
      if (isExternalValue(node)) {
        const extValNode = node;
        const extValResource = enclosingResource;
        pendingRefFollows.push(() => {
          const promise = followRef(
            rootNodeDocument,
            { $ref: extValNode.externalValue },
            {
              prev: null,
              node: extValNode,
            },
            extValResource
          ).then(({ resolvedRef, targetResource }) => {
            if (resolvedRef.resolved) {
              resolveRefsInParallel(
                resolvedRef.node,
                resolvedRef.document,
                resolvedRef.nodePointer,
                type,
                targetResource
              );
            }
          });
          resolvePromises.push(promise);
        });
      }
    }

    // oxlint-disable-next-line sonarjs/cognitive-complexity
    async function followRef(
      document: Document,
      ref: OasRef,
      refStack: RefFrame,
      enclosingResource?: SchemaResource,
      // the ref points to a schema, so $id on the schemas along its pointer sets their base
      isSchemaRef = false
    ): Promise<{ resolvedRef: ResolvedRef; targetResource?: SchemaResource }> {
      if (hasRef(refStack.prev, ref)) {
        throw new Error('Self-referencing circular pointer');
      }

      if (isAnchor(ref.$ref)) {
        const targetNode = anchorRefsMap.get(ref.$ref);
        const resolvedRef: ResolvedRef = {
          resolved: true,
          isRemote: false,
          node: targetNode,
          document,
          nodePointer: ref.$ref,
        };
        const targetResource =
          (isPlainObject(targetNode) && nodeResources.get(targetNode)) || enclosingResource;
        recordResolvedRef(ref, resolvedRef, document, enclosingResource);
        return { resolvedRef, targetResource };
      }

      const { uri, pointer } = parseRef(ref.$ref);

      // $id is an identifier, not a locator (JSON Schema 2020-12 §8.2.1, §9.1.2): a URI reference
      // is resolved against the enclosing $id only to match an $id resource found while resolving.
      // Anything else is loaded relative to the file it was written in, exactly as without $id.
      // A plain-name fragment (`tag#label`) is not matched against $id resources.
      const matchedIdResource =
        uri !== null && !uri.includes('#') && schemaResources.size > 0
          ? schemaResources.get(
              resolveSchemaId(enclosingResource?.baseUri ?? document.source.absoluteRef, uri)
            )
          : undefined;

      let isRemote = matchedIdResource
        ? matchedIdResource.document.source !== document.source
        : uri !== null &&
          externalRefResolver.resolveExternalRef(document.source.absoluteRef, uri) !==
            document.source.absoluteRef;

      let targetDoc: Document;
      try {
        if (matchedIdResource) {
          targetDoc = matchedIdResource.document;
        } else if (isRemote) {
          targetDoc = (await externalRefResolver.resolveDocument(
            document.source.absoluteRef,
            uri!
          )) as Document;
        } else {
          targetDoc = document;
        }
      } catch (error) {
        const resolvedRef: ResolvedRef = {
          resolved: false,
          isRemote,
          document: undefined,
          error,
        };
        recordResolvedRef(ref, resolvedRef, document, enclosingResource);
        return { resolvedRef };
      }

      type Traversal = {
        target: unknown;
        doc: Document;
        nodePointer: string;
        resource: SchemaResource | undefined;
        // set when the pointer passed through a $ref that could not be resolved
        failedRef?: ResolvedRef;
        // isRemote of the last $ref the pointer passed through
        throughRefIsRemote?: boolean;
      };

      async function traverseSegments(
        startNode: unknown,
        startDoc: Document,
        startPointer: string,
        // set when the pointer is looked up in an $id resource rather than in a document
        inResource = false,
        // A pointer inside an $id resource is looked up in the resource's own keys (RFC 6901 does
        // not step through `$ref`). A resource at a document root keeps the behavior without $id.
        stayInStartNode = false
      ): Promise<Traversal> {
        let currentTarget = startNode;
        let currentDoc = startDoc;
        let currentPointer = startPointer;
        let currentResource: SchemaResource | undefined;
        let throughRefIsRemote: boolean | undefined;
        // whether the pointer is still on a schema; it leaves the schema tree at any key that is
        // not a subschema keyword (e.g. `example`, `x-*`), so $id inside data is never registered
        let position: SchemaPosition = isSchemaRef ? 'schema' : 'none';

        // A pointer can reach into a document part that has not been walked yet (e.g. a sub-pointer
        // into an external schema file), so the $id of the schemas on the way is registered here.
        const enterNode = () => {
          if (!isPlainObject(currentTarget)) return;
          currentResource =
            position === 'schema'
              ? registerSchemaResource(currentTarget, currentDoc, currentPointer, currentResource)
              : nodeResources.get(currentTarget) || currentResource;
        };
        enterNode();

        const step = (container: unknown, segment: string) => {
          currentTarget = Array.isArray(container)
            ? container[+segment]
            : (container as Record<string, unknown>)[segment];
          currentPointer = joinPointer(currentPointer, escapePointerFragment(segment));
          position = nextSchemaPosition(position, segment, currentTarget);
          enterNode();
        };

        for (const segment of pointer) {
          if (isPlainObject(currentTarget) && currentTarget[segment] !== undefined) {
            step(currentTarget, segment);
          } else if (Array.isArray(currentTarget) && currentTarget[+segment] !== undefined) {
            step(currentTarget, segment);
          } else if (
            isRef(currentTarget) &&
            // a resource whose own $ref leads back to it is not a path to step through
            !(inResource && hasRef(refStack, currentTarget)) &&
            !(stayInStartNode && currentTarget === startNode)
          ) {
            const inner = await followRef(
              currentDoc,
              currentTarget,
              pushRef(refStack, currentTarget),
              currentResource,
              position === 'schema'
            );
            if (!inner.resolvedRef.resolved) {
              return {
                target: undefined,
                doc: currentDoc,
                nodePointer: currentPointer,
                resource: currentResource,
                failedRef: inner.resolvedRef,
              };
            }
            currentDoc = inner.resolvedRef.document;
            currentPointer = inner.resolvedRef.nodePointer;
            currentResource = inner.targetResource;
            throughRefIsRemote = inner.resolvedRef.isRemote;

            const innerNode = inner.resolvedRef.node;
            if (isPlainObject(innerNode) || Array.isArray(innerNode)) {
              step(innerNode, segment);
            } else {
              currentTarget = undefined;
              break;
            }
          } else {
            currentTarget = undefined;
            break;
          }
        }

        return {
          target: currentTarget,
          doc: currentDoc,
          nodePointer: currentPointer,
          resource: currentResource,
          throughRefIsRemote,
        };
      }

      let traversal: Traversal;
      if (matchedIdResource) {
        traversal = await traverseSegments(
          matchedIdResource.node,
          matchedIdResource.document,
          matchedIdResource.nodePointer,
          true,
          matchedIdResource.nodePointer !== '#/'
        );
      } else if (uri === null && enclosingResource) {
        // A fragment pointer is looked up in the enclosing $id resource first. If it is not
        // found there, it falls back to the document root. The fallback is a Redocly convenience
        // for OpenAPI refs such as `#/components/schemas/X`; JSON Schema itself has no fallback.
        traversal = await traverseSegments(
          enclosingResource.node,
          enclosingResource.document,
          enclosingResource.nodePointer,
          true,
          enclosingResource.nodePointer !== '#/'
        );
        if (traversal.target === undefined && enclosingResource.nodePointer !== '#/') {
          const fromRoot = await traverseSegments(document.parsed, document, '#/');
          if (fromRoot.target !== undefined || !traversal.failedRef) {
            traversal = fromRoot;
          }
        }
      } else {
        traversal = await traverseSegments(targetDoc.parsed, targetDoc, '#/');
      }

      if (traversal.throughRefIsRemote !== undefined) {
        isRemote = traversal.throughRefIsRemote;
      }

      if (traversal.failedRef) {
        const resolvedRef = { ...traversal.failedRef, chain: undefined };
        recordResolvedRef(ref, resolvedRef, document, enclosingResource);
        return { resolvedRef };
      }

      let resolvedRef: ResolvedRef = {
        resolved: true,
        document: traversal.doc,
        isRemote,
        node: traversal.target,
        nodePointer: traversal.nodePointer,
      };
      let targetResource = traversal.resource;

      if (isRef(traversal.target)) {
        // a $ref with sibling keys is a composition, not an alias — record it as a chain hop
        if (isRefWithSiblings(traversal.target)) {
          chainHopResources.set(traversal.target, targetResource);
        }
        const chainHop: ResolvedRefChainHop | undefined = isRefWithSiblings(traversal.target)
          ? {
              node: traversal.target,
              document: traversal.doc,
              location: new Location(traversal.doc.source, traversal.nodePointer),
            }
          : undefined;
        const chained = await followRef(
          traversal.doc,
          traversal.target,
          pushRef(refStack, traversal.target),
          targetResource,
          isSchemaRef
        );
        resolvedRef = chained.resolvedRef;
        targetResource = chained.targetResource;
        if (chainHop && resolvedRef.resolved) {
          // rebuilt, not mutated: the chain array is shared with the inner recursion's map entry
          resolvedRef = { ...resolvedRef, chain: [chainHop, ...(resolvedRef.chain ?? [])] };
        }
      }

      recordResolvedRef(ref, resolvedRef, document, enclosingResource, !!matchedIdResource);
      return { resolvedRef: { ...resolvedRef }, targetResource };
    }
  }
}
