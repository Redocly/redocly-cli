// Emits an idiomatic TanStack Query v5 module over the generated client. The factories
// are built by `createQueryFactories(instance)` — bindable to any client instance (per-instance
// config, middleware, retry) — and the module-level exports bind the sdk's default
// `client`. Per query operation (GET/HEAD): `<op>QueryKey(vars?)` (the no-args form is
// the invalidation prefix) and `<op>Options(vars, init?)` whose `queryFn` forwards
// TanStack's abort `signal`. A paginated query op additionally gets
// `<op>InfiniteOptions(vars, init?)` with `initialPageParam`/`getNextPageParam` compiled
// from the pagination rule's JSON pointers. Per mutation: `<op>Mutation(init?)`. Calls go
// through the client instance's methods, which take one input object in either
// `--args-style`; only the infinite query's cursor override differs between them.
//
// The factory bodies are authored as source text — the emitted module verbatim
// and normalizes everything to the printer's canonical style. Every interpolated piece
// is generator-derived (sanitized operation names, JSON-pointer property chains built
// here) — never raw spec text.

import {
  hasInputs,
  isQuery,
  variablesName,
  wrappableOperations,
} from '../../contracts/typescript.js';
import { type ModelPagination, resolveSchemaPointer } from '../../emitters/pagination.js';
import type { ApiModel, OperationModel } from '../../intermediate-representation/model.js';
import { codeString, isSafeIdentifier, safeIdent } from '../../printers/typescript.js';
import type { PaginationSpec } from '../../runtime/types.js';

export type TanstackOptions = {
  /** Import specifier for the sdk entry the `client` instance and types live in. */
  sdkModule: string;
  /** TanStack adapter to import the option helpers from (`@tanstack/${framework}-query`). */
  framework: 'react' | 'vue' | 'svelte' | 'solid';
  /** The run's RESOLVED pagination — paginated query ops gain `<op>InfiniteOptions`. */
  pagination?: ModelPagination;
  /** Leading element for every query/mutation key — namespaces the cache when several
   * generated APIs share one QueryClient (operationIds may collide across APIs). */
  queryKeyPrefix?: string;
  /** The sdk's call shape — the infinite query overrides the cursor inside it. */
  argsStyle?: 'grouped' | 'flat';
};

/** Render the full TanStack Query module source. `''` when there are no wrappable operations. */
export function renderTanstackModule(model: ApiModel, opts: TanstackOptions): string {
  const ops = wrappableOperations(model, 'tanstack-query');
  if (ops.length === 0) return '';
  const pagination = opts.pagination ?? new Map();
  const source = [
    importHeader(ops, opts, pagination),
    ...ops.filter(isQuery).map((op) => queryKeySource(op, opts.queryKeyPrefix)),
    factoriesSource(model, ops, pagination, opts.queryKeyPrefix, opts.argsStyle),
    ...defaultBindings(ops, pagination),
  ].join('\n');
  return source;
}

/**
 * Whether the op gets an `<op>InfiniteOptions` factory: a paginated query operation.
 * `link`-style pagination is excluded — its next page lives in the `Link` response
 * HEADER, which a TanStack `queryFn` (body-only) cannot see; use the sdk's
 * `.pages()`/`.items()` iterators for those operations instead.
 */
function isInfinite(op: OperationModel, pagination: ModelPagination): boolean {
  if (!isQuery(op)) return false;
  const paginated = pagination.get(op.name);
  return paginated !== undefined && paginated.spec.style !== 'link';
}

/**
 * The import header: the option helpers from `@tanstack/${framework}-query` (only the
 * ones used), then the sdk's `client` instance plus the referenced types.
 */
function importHeader(
  ops: OperationModel[],
  opts: TanstackOptions,
  pagination: ModelPagination
): string {
  const helpers = [
    ...(ops.some((op) => isInfinite(op, pagination)) ? ['infiniteQueryOptions'] : []),
    ...(ops.some(isQuery) ? ['queryOptions'] : []),
  ];
  const types = [...ops.filter(hasInputs).map(variablesName), 'RequestOptions']
    .sort()
    .map((name) => `type ${name}`);
  const lines = [];
  if (helpers.length > 0) {
    lines.push(`import { ${helpers.join(', ')} } from "@tanstack/${opts.framework}-query";`);
  }
  lines.push(`import { client, ${types.join(', ')} } from "${opts.sdkModule}";`);
  return lines.join('\n');
}

/**
 * `<op>QueryKey(vars?)` — with `vars` the exact key `<op>Options` uses; without, the
 * one-element prefix matching every cached page/filter of the operation
 * (`queryClient.invalidateQueries({ queryKey: getOrderQueryKey() })`).
 */
function queryKeySource(op: OperationModel, prefix: string | undefined): string {
  const base = keyElements(op, prefix);
  if (!hasInputs(op)) {
    return `export const ${op.name}QueryKey = () => [${base}] as const;`;
  }
  return (
    `export const ${op.name}QueryKey = (vars?: ${variablesName(op)}) =>\n` +
    `    vars === undefined ? ([${base}] as const) : ([${base}, vars] as const);`
  );
}

/** The constant leading key elements: `"main", "getOrder"` with a prefix, else the id alone. */
function keyElements(op: OperationModel, prefix: string | undefined): string {
  // The prefix is config-supplied text — `codeString` is the code-context escaping.
  return prefix === undefined ? `"${op.name}"` : `${codeString(prefix)}, "${op.name}"`;
}

/** The `createQueryFactories(instance)` declaration wrapping every option/mutation factory. */
function factoriesSource(
  model: ApiModel,
  ops: OperationModel[],
  pagination: ModelPagination,
  prefix: string | undefined,
  argsStyle: TanstackOptions['argsStyle']
): string {
  const members = ops.flatMap((op) => {
    if (!isQuery(op)) return [mutationMember(op, prefix)];
    const paginated = pagination.get(op.name);
    return paginated !== undefined && paginated.spec.style !== 'link'
      ? [optionsMember(op), infiniteMember(model, op, paginated.spec, argsStyle)]
      : [optionsMember(op)];
  });
  return (
    '/**\n' +
    ' * Build the factories over a specific client instance — its config, middleware, and\n' +
    ' * retry apply to every call (`createQueryFactories(createClient(OPERATIONS, config))`).\n' +
    " * The module-level exports below are these factories bound to the generated module's default `client`.\n" +
    ' */\n' +
    'export const createQueryFactories = (instance: typeof client = client) => ({\n' +
    members.join(',\n') +
    '\n});'
  );
}

/** `<op>Options` — `queryFn` forwards TanStack's abort `signal` into the request `init`. */
function optionsMember(op: OperationModel): string {
  const { params, keyArg, callArgs } = varsPieces(op);
  return (
    `    ${op.name}Options: (${params}) => queryOptions({\n` +
    `        queryKey: ${op.name}QueryKey(${keyArg}),\n` +
    `        queryFn: ({ signal }) => instance.${op.name}(${callArgs}, { ...init, signal, envelope: undefined }),\n` +
    `    })`
  );
}

/** `<op>Mutation(init?)` — per-call options (headers, a retry override) reach the mutation. */
function mutationMember(op: OperationModel, prefix: string | undefined): string {
  const mutationFn = hasInputs(op)
    ? `(vars: ${variablesName(op)}) => instance.${op.name}(vars, { ...init, envelope: undefined })`
    : `() => instance.${op.name}({}, { ...init, envelope: undefined })`;
  return (
    `    ${op.name}Mutation: (${INIT_PARAM}) => ({\n` +
    `        mutationKey: [${keyElements(op, prefix)}] as const,\n` +
    `        mutationFn: ${mutationFn},\n` +
    `    })`
  );
}

/**
 * `<op>InfiniteOptions` — the pagination rule compiled into TanStack's contract: the
 * page param rides the rule's advance query parameter, `initialPageParam` resumes from
 * the caller's own value, and `getNextPageParam` mirrors the runtime iterators' stop
 * conditions (cursor: absent/`null`/`''`, plus the optional `hasMore === false`;
 * offset/page: an empty items page).
 */
function infiniteMember(
  model: ApiModel,
  op: OperationModel,
  spec: Exclude<PaginationSpec, { style: 'link' }>,
  argsStyle: TanstackOptions['argsStyle']
): string {
  const { params, keyArg } = varsPieces(op);
  // The cursor is a query parameter, so it lands in the sdk's own spelling for one:
  // inside the `query` layer, or at the top level of a merged call.
  const cursor = safeIdent(spec.param);
  const override =
    argsStyle === 'flat'
      ? `{ ...vars, ${cursor}: pageParam }`
      : `{ ...vars, query: { ...vars.query, ${cursor}: pageParam } }`;
  return (
    `    ${op.name}InfiniteOptions: (${params}) => infiniteQueryOptions({\n` +
    `        queryKey: [...${op.name}QueryKey(${keyArg}), "infinite"] as const,\n` +
    `        queryFn: ({ pageParam, signal }) => instance.${op.name}(${override}, { ...init, signal, envelope: undefined }),\n` +
    nextPageSource(model, op, spec, argsStyle) +
    `    })`
  );
}

/** The `initialPageParam` + `getNextPageParam` pair for one pagination style. */
function nextPageSource(
  model: ApiModel,
  op: OperationModel,
  spec: Exclude<PaginationSpec, { style: 'link' }>,
  argsStyle: TanstackOptions['argsStyle']
): string {
  const advance = paramsAccess(spec.param);
  // Where the caller's own starting value lives, in the sdk's spelling for a query param.
  const given = argsStyle === 'flat' ? memberAccess('vars', spec.param) : `vars.query?.${advance}`;
  if (spec.style === 'cursor') {
    const stopEarly =
      spec.hasMore === undefined
        ? ''
        : `            if (lastPage${pointerChain(spec.hasMore)} === false) return undefined;\n`;
    // Only the stop checks the cursor's static type admits are emitted — a `=== null`
    // against a non-nullable string is a TS2367 in the consumer's build. TanStack v5
    // itself stops on a returned `null`/`undefined`, so an omitted check stays safe
    // even when the server sends a value the description says it cannot.
    const checks = cursorStopChecks(model, op, spec.nextCursor);
    const body =
      checks.length === 0
        ? `            return lastPage${pointerChain(spec.nextCursor)};\n`
        : `            const next = lastPage${pointerChain(spec.nextCursor)};\n` +
          `            return ${checks.join(' || ')} ? undefined : next;\n`;
    return (
      `        initialPageParam: ${given},\n` +
      `        getNextPageParam: (lastPage) => {\n` +
      stopEarly +
      body +
      `        },\n`
    );
  }
  const step = spec.style === 'offset' ? 'lastPageParam + count' : 'lastPageParam + 1';
  const start = spec.style === 'offset' ? '0' : '1';
  return (
    `        initialPageParam: ${given} ?? ${start},\n` +
    `        getNextPageParam: (lastPage, _allPages, lastPageParam) => {\n` +
    `            const count = ${itemsLength(spec.items)};\n` +
    `            return count === 0 ? undefined : ${step};\n` +
    `        },\n`
  );
}

/**
 * The `next === …` stop conditions whose comparison the cursor's static type allows:
 * `undefined` when any step of the chain can miss, `null` when the cursor is nullable,
 * `""` when it is a plain string.
 */
function cursorStopChecks(model: ApiModel, op: OperationModel, pointer: string): string[] {
  const page = op.successResponses.find((response) =>
    response.contentType.toLowerCase().includes('json')
  );
  // Both resolve — `resolveModelPagination` already verified the rule fits the operation.
  const root = resolveSchemaPointer(page!.schema, '', model);
  const target = resolveSchemaPointer(page!.schema, pointer, model);
  const keys = pointer.slice(1).split('/');
  let canBeUndefined = keys.length > 1;
  if (!canBeUndefined && root?.kind === 'object') {
    const property = root.properties.find((candidate) => candidate.name === keys[0]);
    canBeUndefined = property === undefined || !property.required;
  }
  const members = target?.kind === 'union' ? target.members : target ? [target] : [];
  const nullable = members.some((member) => member.kind === 'null');
  const plainString = members.some(
    (member) => member.kind === 'scalar' && member.scalar === 'string'
  );
  return [
    ...(canBeUndefined ? ['next === undefined'] : []),
    ...(nullable ? ['next === null'] : []),
    ...(plainString ? ['next === ""'] : []),
  ];
}

/**
 * The `init` parameter every factory takes. The throw-only `envelope` option is
 * excluded from the type and stripped in the forwarding calls — cached query data
 * must stay the plain body.
 */
const INIT_PARAM = 'init?: Omit<RequestOptions, "envelope">';

/** The shared `(vars, init?)` parameter list plus how `vars` reaches the key and the call. */
function varsPieces(op: OperationModel): { params: string; keyArg: string; callArgs: string } {
  if (!hasInputs(op)) {
    return { params: INIT_PARAM, keyArg: '', callArgs: '{}' };
  }
  return {
    params: `vars: ${variablesName(op)}, ${INIT_PARAM}`,
    keyArg: 'vars',
    callArgs: 'vars',
  };
}

/** One query-param access step: `.name`, or `["a b"]` when not a bare identifier. */
function paramsAccess(name: string): string {
  return isSafeIdentifier(name) ? name : `[${safeIdent(name)}]`;
}

/**
 * `<base>.name`, or `<base>["wire-name"]` when the name is not an identifier — the dot form
 * would be a syntax error there. (After `?.` either form appends directly.)
 */
function memberAccess(base: string, name: string): string {
  return isSafeIdentifier(name) ? `${base}.${name}` : `${base}[${safeIdent(name)}]`;
}

/** An RFC 6901 pointer as an optional property chain: `/page/endCursor` → `.page?.endCursor`. */
function pointerChain(pointer: string): string {
  const keys = pointer
    .slice(1)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
  return keys
    .map((key, index) => {
      const bare = isSafeIdentifier(key);
      if (index === 0) return bare ? `.${key}` : `[${safeIdent(key)}]`;
      return bare ? `?.${key}` : `?.[${safeIdent(key)}]`;
    })
    .join('');
}

/** The page's item count per the `items` pointer (`''` means the page IS the array). */
function itemsLength(items: string): string {
  if (items === '') return 'lastPage?.length ?? 0';
  return `lastPage${pointerChain(items)}?.length ?? 0`;
}

/** `export const <name> = defaultFactories.<name>;` per factory, bound to the default client. */
function defaultBindings(ops: OperationModel[], pagination: ModelPagination): string[] {
  const names = ops.flatMap((op) => {
    if (!isQuery(op)) return [`${op.name}Mutation`];
    return isInfinite(op, pagination)
      ? [`${op.name}Options`, `${op.name}InfiniteOptions`]
      : [`${op.name}Options`];
  });
  return [
    'const defaultFactories = createQueryFactories();',
    ...names.map((name) => `export const ${name} = defaultFactories.${name};`),
  ];
}
