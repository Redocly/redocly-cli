import type { Config, RuleSeverity } from './config/index.js';
import { YamlParseError } from './errors/yaml-parse-error.js';
import type { SpecVersion } from './oas-types.js';
import { Location, isRef } from './ref-utils.js';
import type {
  ResolveError,
  Source,
  ResolvedRefMap,
  ResolvedRefChainHop,
  Document,
} from './resolve.js';
import { isNamedType, SpecExtension, type NormalizedNodeType } from './types/index.js';
import type { Referenced } from './typings/openapi.js';
import { getOwn } from './utils/get-own.js';
import { isPlainObject } from './utils/is-plain-object.js';
import { makeRefId } from './utils/make-ref-id.js';
import { pushStack, popStack } from './utils/stack.js';
import type {
  VisitorLevelContext,
  NormalizedOasVisitors,
  VisitorSkippedLevelContext,
  VisitFunction,
  BaseVisitor,
  VisitorNode,
} from './visitors.js';

type ExtendedSpecVersion = SpecVersion | 'config' | 'entity';

export type NonUndefined =
  | string
  | number
  | boolean
  | symbol
  | bigint
  | object
  | Record<string, any>;

// A composed $ref (with sibling keys) the resolution chased through on the way to `node`.
export type ResolvedChainHop = ResolvedRefChainHop;

export type ResolveResult<T extends NonUndefined> =
  | {
      node: T;
      location: Location;
      error?: ResolveError | YamlParseError;
      chain?: ResolvedChainHop[];
    }
  | {
      node: undefined;
      location: undefined;
      error?: ResolveError | YamlParseError;
      chain?: ResolvedChainHop[];
    };

export type ResolveFn = <T extends NonUndefined>(
  node: Referenced<T>,
  from?: string
) => ResolveResult<T>;

export type UserContext = {
  report(problem: Problem): void;
  location: Location;
  rawNode: any;
  rawLocation: Location;
  resolve: ResolveFn;
  parentLocations: Record<string, Location>;
  type: NormalizedNodeType;
  key: string | number;
  parent: any;
  specVersion: ExtendedSpecVersion;
  config?: Config;
  getVisitorData: () => Record<string, unknown>;
};

export type Loc = {
  line: number;
  col: number;
};

export type PointerLocationObject = {
  source: Source;
  reportOnKey?: boolean;
  pointer: string;
};

export type LineColLocationObject = Omit<PointerLocationObject, 'pointer'> & {
  pointer: undefined;
  start: Loc;
  end?: Loc;
};

export type LocationObject = LineColLocationObject | PointerLocationObject;

export type ProblemSeverity = 'error' | 'warn';

export type Problem = {
  message: string;
  suggest?: string[];
  location?: Partial<LocationObject> | Array<Partial<LocationObject>>;
  from?: LocationObject;
  forceSeverity?: RuleSeverity;
  ruleId?: string;
  reference?: string;
};

export type NormalizedProblem = {
  message: string;
  ruleId: string;
  severity: ProblemSeverity;
  location: LocationObject[];
  from?: LocationObject;
  suggest: string[];
  ignored?: boolean;
  reference?: string;
};

export type WalkContext = {
  problems: NormalizedProblem[];
  specVersion: ExtendedSpecVersion;
  config?: Config;
  visitorsData: Record<string, Record<string, unknown>>; // custom data store that visitors can use for various purposes
  refTypes?: Map<string, NormalizedNodeType>;
};

function collectParents(ctx: VisitorLevelContext) {
  const parents: Record<string, unknown> = {};
  while (ctx.parent) {
    parents[ctx.parent.type.name] = ctx.parent.activatedOn?.value.node;
    ctx = ctx.parent;
  }
  return parents;
}

function collectParentsLocations(ctx: VisitorLevelContext) {
  const locations: Record<string, Location> = {};
  while (ctx.parent) {
    if (ctx.parent.activatedOn?.value.location) {
      locations[ctx.parent.type.name] = ctx.parent.activatedOn?.value.location;
    }
    ctx = ctx.parent;
  }
  return locations;
}

export function walkDocument<T extends BaseVisitor>(opts: {
  document: Document;
  rootType: NormalizedNodeType;
  normalizedVisitors: NormalizedOasVisitors<T>;
  resolvedRefMap: ResolvedRefMap;
  ctx: WalkContext;
}) {
  const { document, rootType, normalizedVisitors, resolvedRefMap, ctx } = opts;
  const seenNodesPerType: Record<string, Set<unknown>> = {};
  const walkedComposedRefs = new Set<string>();
  const composedRefWalkId = (type: NormalizedNodeType, location: Location) =>
    `${type.name}::${location.absolutePointer}`;
  const ignoredNodes = new Set<string>();

  // Pre-compute combined enter/leave arrays per type to avoid per-node array allocations
  const anyEnter = normalizedVisitors.any.enter as VisitorNode<any>[];
  const anyLeave = normalizedVisitors.any.leave as VisitorNode<any>[];
  const combinedEnter: Record<string, Array<VisitorNode<any>>> = {};
  const combinedLeave: Record<string, Array<VisitorNode<any>>> = {};
  for (const typeName of Object.keys(normalizedVisitors)) {
    if (typeName === 'any' || typeName === 'ref') continue;
    combinedEnter[typeName] = anyEnter.concat(normalizedVisitors[typeName]?.enter || []);
    combinedLeave[typeName] = (normalizedVisitors[typeName]?.leave || []).concat(anyLeave);
  }

  walkNode(document.parsed, rootType, new Location(document.source, '#/'), undefined, '');

  function walkNode(
    node: any,
    type: NormalizedNodeType,
    location: Location,
    parent: any,
    key: string | number
  ) {
    const resolve: ResolveFn = (ref, from = currentLocation.source.absoluteRef) => {
      if (!isRef(ref)) return { location, node: ref };
      const refId = makeRefId(from, ref.$ref);
      const resolvedRef = resolvedRefMap.get(refId);
      if (!resolvedRef) {
        return {
          location: undefined,
          node: undefined,
        };
      }

      const { resolved, node, document, nodePointer, error, chain } = resolvedRef;
      const newLocation = resolved
        ? new Location(document!.source, nodePointer!)
        : error instanceof YamlParseError
          ? new Location(error.source, '')
          : undefined;

      return { location: newLocation, node, error, chain };
    };

    const rawLocation = location;
    let currentLocation = location;
    const nodeIsRef = isRef(node);
    const {
      node: resolvedNode,
      location: resolvedLocation,
      error,
      chain: resolvedChain,
    } = resolve(node);
    const enteredContexts: Set<VisitorLevelContext> = new Set();

    if (nodeIsRef && Object.keys(node).length > 1) {
      // composed $refs can also be reached as chain hops — record this walk to avoid a repeat
      walkedComposedRefs.add(composedRefWalkId(type, location));
    }

    if (nodeIsRef) {
      const refEnterVisitors = normalizedVisitors.ref.enter;
      for (const { visit: visitor, ruleId, severity, message, context } of refEnterVisitors) {
        enteredContexts.add(context);
        const report = (opts: Problem) => reportFn(ruleId, severity, message, opts);
        visitor(
          node,
          {
            report,
            resolve,
            rawNode: node,
            rawLocation,
            location,
            type,
            parent,
            key,
            parentLocations: {},
            specVersion: ctx.specVersion,
            config: ctx.config,
            getVisitorData: () => getVisitorDataFn(ruleId),
          },
          { node: resolvedNode, location: resolvedLocation, error, chain: resolvedChain }
        );
        if (resolvedLocation?.source.absoluteRef && ctx.refTypes) {
          ctx.refTypes.set(resolvedLocation?.source.absoluteRef, type);
        }
      }
    }

    if (resolvedNode !== undefined && resolvedLocation && type.name !== 'scalar') {
      currentLocation = resolvedLocation;
      const isNodeSeen = seenNodesPerType[type.name]?.has?.(resolvedNode);
      let visitedBySome = false;

      const currentEnterVisitors =
        combinedEnter[type.name] || anyEnter.concat(normalizedVisitors[type.name]?.enter || []);

      const activatedContexts: Array<VisitorSkippedLevelContext | VisitorLevelContext> = [];
      const ignoreKey = `${currentLocation.absolutePointer}${currentLocation.pointer}`;

      for (const { context, visit, skip, ruleId, severity, message } of currentEnterVisitors) {
        if (ignoredNodes.has(ignoreKey)) break;

        if (context.isSkippedLevel) {
          if (
            context.parent.activatedOn &&
            !context.parent.activatedOn.value.nextLevelTypeActivated &&
            !context.seen.has(node)
          ) {
            // TODO: test for walk through duplicated $ref-ed node
            context.seen.add(node);
            visitedBySome = true;
            activatedContexts.push(context);
          }
        } else {
          if (
            (context.parent && // if nested
              context.parent.activatedOn &&
              context.activatedOn?.value.withParentNode !== context.parent.activatedOn.value.node &&
              // do not enter if visited by parent children (it works thanks because deeper visitors are sorted before)
              context.parent.activatedOn.value.nextLevelTypeActivated?.value !== type) ||
            (!context.parent && !isNodeSeen) // if top-level visit each node just once
          ) {
            activatedContexts.push(context);

            const activatedOn = {
              node: resolvedNode,
              location: resolvedLocation,
              nextLevelTypeActivated: null,
              withParentNode: context.parent?.activatedOn?.value.node,
              skipped:
                (context.parent?.activatedOn?.value.skipped ||
                  skip?.(resolvedNode, key, {
                    location,
                    rawLocation,
                    resolve,
                    rawNode: node,
                  })) ??
                false,
            };

            context.activatedOn = pushStack<any>(context.activatedOn, activatedOn);

            let ctx: VisitorLevelContext | null = context.parent;
            while (ctx) {
              ctx.activatedOn!.value.nextLevelTypeActivated = pushStack(
                ctx.activatedOn!.value.nextLevelTypeActivated,
                type
              );
              ctx = ctx.parent;
            }

            if (!activatedOn.skipped) {
              visitedBySome = true;
              enteredContexts.add(context);
              visitWithContext(visit, resolvedNode, node, context, ruleId, severity, message);
            }
          }
        }
      }

      const shouldWalkChildren = visitedBySome || !isNodeSeen;
      const refSiblingProps = nodeIsRef ? Object.keys(node).filter((k) => k !== '$ref') : [];

      if (shouldWalkChildren || refSiblingProps.length > 0) {
        if (shouldWalkChildren) {
          seenNodesPerType[type.name] = seenNodesPerType[type.name] || new Set();
          seenNodesPerType[type.name].add(resolvedNode);
        }

        if (Array.isArray(resolvedNode)) {
          const itemsType = shouldWalkChildren ? type.items : undefined;
          if (itemsType !== undefined) {
            const isTypeAFunction = typeof itemsType === 'function';
            for (let i = 0; i < resolvedNode.length; i++) {
              const itemLocation = resolvedLocation.child([i]);
              let itemType = isTypeAFunction
                ? itemsType(resolvedNode[i], itemLocation.absolutePointer)
                : itemsType;
              let itemValue = resolvedNode[i];

              if (itemType?.directResolveAs) {
                itemType = itemType.directResolveAs;
                itemValue = { $ref: itemValue };
              }

              if (isNamedType(itemType)) {
                walkNode(itemValue, itemType, itemLocation, resolvedNode, i);
              }
            }
          }
        } else if (isPlainObject(resolvedNode)) {
          let props: string[];
          if (shouldWalkChildren) {
            // visit in order from type-tree first
            props = Object.keys(type.properties);
            if (type.additionalProperties) {
              props.push(...Object.keys(resolvedNode).filter((k) => !props.includes(k)));
            } else if (type.extensionsPrefix) {
              props.push(
                ...Object.keys(resolvedNode).filter((k) =>
                  k.startsWith(type.extensionsPrefix as string)
                )
              );
            }
            // properties on the same level as $ref
            props.push(...refSiblingProps.filter((k) => !props.includes(k)));
          } else {
            // the resolved node was already visited, but this ref's sibling keys still need walking
            props = refSiblingProps;
          }

          const walkProp = (
            propName: string,
            value: unknown,
            loc: Location,
            valueParent: unknown
          ) => {
            let propType = getOwn(type.properties, propName);
            if (propType === undefined) propType = type.additionalProperties;
            if (typeof propType === 'function') propType = propType(value, propName);

            if (
              propType === undefined &&
              type.extensionsPrefix &&
              propName.startsWith(type.extensionsPrefix)
            ) {
              propType = SpecExtension;
            }

            if (!isNamedType(propType) && propType?.directResolveAs) {
              propType = propType.directResolveAs;
              value = { $ref: value };
            }

            if (propType && propType.name === undefined && propType.resolvable !== false) {
              propType = { name: 'scalar', properties: {} };
            }

            if (!isNamedType(propType) || (propType.name === 'scalar' && !isRef(value))) {
              return;
            }

            walkNode(value, propType, loc.child([propName]), valueParent, propName);
          };

          // the isRef check narrows `node` to OasRef, but sibling keys are read from it too
          const rawNode = node as Record<string, unknown>;

          for (const propName of props) {
            const resolvedValue = resolvedNode[propName];
            // a property on the same level as $ref composes with the resolved node even
            // when both define it, and resolves against the original location, not target
            const siblingValue =
              nodeIsRef && rawNode[propName] !== resolvedValue ? rawNode[propName] : undefined;

            if (shouldWalkChildren && resolvedValue !== undefined) {
              walkProp(propName, resolvedValue, resolvedLocation, resolvedNode);
            }
            if (siblingValue !== undefined) {
              walkProp(propName, siblingValue, location, node);
            }
          }
        }
      }

      if (nodeIsRef && resolvedChain?.length) {
        // walk the composed $ref hop from its own location so its siblings and inner $ref
        // are processed; the hop's own resolution carries the rest of the chain
        const chainHop = resolvedChain[0];
        if (!walkedComposedRefs.has(composedRefWalkId(type, chainHop.location))) {
          walkNode(chainHop.node, type, chainHop.location, parent, key);
        }
      }

      const currentLeaveVisitors =
        combinedLeave[type.name] || (normalizedVisitors[type.name]?.leave || []).concat(anyLeave);

      for (const context of activatedContexts.reverse()) {
        if (context.isSkippedLevel) {
          context.seen.delete(resolvedNode);
        } else {
          context.activatedOn = popStack(context.activatedOn);
          if (context.parent) {
            let ctx: VisitorLevelContext | null = context.parent;
            while (ctx) {
              ctx.activatedOn!.value.nextLevelTypeActivated = popStack(
                ctx.activatedOn!.value.nextLevelTypeActivated
              );
              ctx = ctx.parent;
            }
          }
        }
      }

      for (const { context, visit, ruleId, severity, message } of currentLeaveVisitors) {
        if (!context.isSkippedLevel && enteredContexts.has(context)) {
          visitWithContext(visit, resolvedNode, node, context, ruleId, severity, message);
        }
      }
    }

    currentLocation = location;

    if (nodeIsRef) {
      const refLeaveVisitors = normalizedVisitors.ref.leave;
      for (const { visit: visitor, ruleId, severity, context, message } of refLeaveVisitors) {
        if (enteredContexts.has(context)) {
          const report = (opts: Problem) => reportFn(ruleId, severity, message, opts);
          visitor(
            node,
            {
              report,
              resolve,
              rawNode: node,
              rawLocation,
              location,
              type,
              parent,
              key,
              parentLocations: {},
              specVersion: ctx.specVersion,
              config: ctx.config,
              getVisitorData: () => getVisitorDataFn(ruleId),
            },
            { node: resolvedNode, location: resolvedLocation, error, chain: resolvedChain }
          );
        }
      }
    }

    // returns true ignores all the next visitors on the specific node
    function visitWithContext(
      visit: VisitFunction<unknown>,
      resolvedNode: unknown,
      node: unknown,
      context: VisitorLevelContext,
      ruleId: string,
      severity: ProblemSeverity,
      customMessage: string | undefined
    ) {
      const report = (opts: Problem) => reportFn(ruleId, severity, customMessage, opts);
      visit(
        resolvedNode,
        {
          report,
          resolve,
          rawNode: node,
          location: currentLocation,
          rawLocation,
          type,
          parent,
          key,
          parentLocations: collectParentsLocations(context),
          specVersion: ctx.specVersion,
          config: ctx.config,
          ignoreNextVisitorsOnNode: () => {
            ignoredNodes.add(`${currentLocation.absolutePointer}${currentLocation.pointer}`);
          },
          getVisitorData: () => getVisitorDataFn(ruleId),
        },
        collectParents(context),
        context
      );
    }

    function reportFn(
      ruleId: string,
      severity: ProblemSeverity,
      customMessage: string | undefined,
      opts: Problem
    ) {
      const normalizedLocation = opts.location
        ? Array.isArray(opts.location)
          ? opts.location
          : [opts.location]
        : [{ ...currentLocation, reportOnKey: false }];
      const location = normalizedLocation.map((l) => ({
        ...currentLocation,
        reportOnKey: false,
        ...l,
      }));
      const ruleSeverity = opts.forceSeverity || severity;
      if (ruleSeverity !== 'off') {
        ctx.problems.push({
          ruleId: opts.ruleId || ruleId,
          severity: ruleSeverity,
          ...opts,
          message: customMessage
            ? customMessage.replace('{{message}}', opts.message)
            : opts.message,
          suggest: opts.suggest || [],
          location,
        });
      }
    }
    function getVisitorDataFn(ruleId: string) {
      ctx.visitorsData[ruleId] = ctx.visitorsData[ruleId] || {};
      return ctx.visitorsData[ruleId];
    }
  }
}
