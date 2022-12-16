import { Referenced } from './typings/openapi';
import { Location, isRef } from './ref-utils';
import {
  VisitorLevelContext,
  NormalizedOasVisitors,
  VisitorSkippedLevelContext,
  VisitFunction,
} from './visitors';

import {
  ResolvedRefMap,
  Document,
  ResolveError,
  YamlParseError,
  Source,
  makeRefId,
} from './resolve';
import { pushStack, popStack } from './utils';
import { OasVersion } from './oas-types';
import { NormalizedNodeType, isNamedType, SpecExtension } from './types';
import type { RuleSeverity } from './config';

type NonUndefined = string | number | boolean | symbol | bigint | object | Record<string, any>;

export type ResolveResult<T extends NonUndefined> =
  | { node: T; location: Location; error?: ResolveError | YamlParseError }
  | { node: undefined; location: undefined; error?: ResolveError | YamlParseError };

export type ResolveFn = <T>(node: Referenced<T>, from?: string) => ResolveResult<T>;

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
  oasVersion: OasVersion;
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
};

export type NormalizedProblem = {
  message: string;
  ruleId: string;
  severity: ProblemSeverity;
  location: LocationObject[];
  from?: LocationObject;
  suggest: string[];
  ignored?: boolean;
};

export type WalkContext = {
  problems: NormalizedProblem[];
  oasVersion: OasVersion;
  visitorsData: Record<string, Record<string, unknown>>; // custom data store that visitors can use for various purposes
  refTypes?: Map<string, NormalizedNodeType>;
};

function collectParents(ctx: VisitorLevelContext) {
  const parents: Record<string, any> = {};
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

export function walkDocument<T>(opts: {
  document: Document;
  rootType: NormalizedNodeType;
  normalizedVisitors: NormalizedOasVisitors<T>;
  resolvedRefMap: ResolvedRefMap;
  ctx: WalkContext;
}) {
  const { document, rootType, normalizedVisitors, resolvedRefMap, ctx } = opts;
  const seenNodesPerType: Record<string, Set<any>> = {};
  const seenRefs = new Set<any>();

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

      const { resolved, node, document, nodePointer, error } = resolvedRef;
      const newLocation = resolved
        ? new Location(document!.source, nodePointer!)
        : error instanceof YamlParseError
        ? new Location(error.source, '')
        : undefined;

      return { location: newLocation, node, error };
    };

    const rawLocation = location;
    let currentLocation = location;
    const { node: resolvedNode, location: resolvedLocation, error } = resolve(node);
    const enteredContexts: Set<VisitorLevelContext> = new Set();

    if (isRef(node)) {
      const refEnterVisitors = normalizedVisitors.ref.enter;
      for (const { visit: visitor, ruleId, severity, context } of refEnterVisitors) {
        if (!seenRefs.has(node)) {
          enteredContexts.add(context);
          const report = reportFn.bind(undefined, ruleId, severity);
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
              oasVersion: ctx.oasVersion,
              getVisitorData: getVisitorDataFn.bind(undefined, ruleId),
            },
            { node: resolvedNode, location: resolvedLocation, error }
          );
          if (resolvedLocation?.source.absoluteRef && ctx.refTypes) {
            ctx.refTypes.set(resolvedLocation?.source.absoluteRef, type);
          }
        }
      }
    }

    if (resolvedNode !== undefined && resolvedLocation && type.name !== 'scalar') {
      currentLocation = resolvedLocation;
      const isNodeSeen = seenNodesPerType[type.name]?.has?.(resolvedNode);
      let visitedBySome = false;

      const anyEnterVisitors = normalizedVisitors.any.enter;
      const currentEnterVisitors = anyEnterVisitors.concat(
        normalizedVisitors[type.name]?.enter || []
      );

      const activatedContexts: Array<VisitorSkippedLevelContext | VisitorLevelContext> = [];

      for (const { context, visit, skip, ruleId, severity } of currentEnterVisitors) {
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
              const { ignoreNextVisitorsOnNode } = visitWithContext(
                visit,
                resolvedNode,
                node,
                context,
                ruleId,
                severity
              );
              if (ignoreNextVisitorsOnNode) break;
            }
          }
        }
      }

      if (visitedBySome || !isNodeSeen) {
        seenNodesPerType[type.name] = seenNodesPerType[type.name] || new Set();
        seenNodesPerType[type.name].add(resolvedNode);

        if (Array.isArray(resolvedNode)) {
          const itemsType = type.items;
          if (itemsType !== undefined) {
            for (let i = 0; i < resolvedNode.length; i++) {
              walkNode(resolvedNode[i], itemsType, resolvedLocation.child([i]), resolvedNode, i);
            }
          }
        } else if (typeof resolvedNode === 'object' && resolvedNode !== null) {
          // visit in order from type-tree first
          const props = Object.keys(type.properties);
          if (type.additionalProperties) {
            props.push(...Object.keys(resolvedNode).filter((k) => !props.includes(k)));
          } else if (type.extensionsPrefix) {
            props.push(
              ...Object.keys(resolvedNode).filter((k) =>
                k.startsWith(type.extensionsPrefix as string)
              )
            );
          }

          if (isRef(node)) {
            props.push(...Object.keys(node).filter((k) => k !== '$ref' && !props.includes(k))); // properties on the same level as $ref
          }

          for (const propName of props) {
            let value = resolvedNode[propName];

            let loc = resolvedLocation;

            if (value === undefined) {
              value = node[propName];
              loc = location; // properties on the same level as $ref should resolve against original location, not target
            }

            let propType = type.properties[propName];
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
              continue;
            }

            walkNode(value, propType, loc.child([propName]), resolvedNode, propName);
          }
        }
      }

      const anyLeaveVisitors = normalizedVisitors.any.leave;
      const currentLeaveVisitors = (normalizedVisitors[type.name]?.leave || []).concat(
        anyLeaveVisitors
      );

      for (const context of activatedContexts.reverse()) {
        if (context.isSkippedLevel) {
          context.seen.delete(resolvedNode);
        } else {
          context.activatedOn = popStack(context.activatedOn) as any;
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

      for (const { context, visit, ruleId, severity } of currentLeaveVisitors) {
        if (!context.isSkippedLevel && enteredContexts.has(context)) {
          visitWithContext(visit, resolvedNode, node, context, ruleId, severity);
        }
      }
    }

    currentLocation = location;

    if (isRef(node)) {
      const refLeaveVisitors = normalizedVisitors.ref.leave;
      for (const { visit: visitor, ruleId, severity, context } of refLeaveVisitors) {
        if (enteredContexts.has(context)) {
          const report = reportFn.bind(undefined, ruleId, severity);
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
              oasVersion: ctx.oasVersion,
              getVisitorData: getVisitorDataFn.bind(undefined, ruleId),
            },
            { node: resolvedNode, location: resolvedLocation, error }
          );
        }
      }
    }

    // returns true ignores all the next visitors on the specific node
    function visitWithContext(
      visit: VisitFunction<any>,
      resolvedNode: any,
      node: any,
      context: VisitorLevelContext,
      ruleId: string,
      severity: ProblemSeverity
    ) {
      const report = reportFn.bind(undefined, ruleId, severity);
      let ignoreNextVisitorsOnNode = false;

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
          oasVersion: ctx.oasVersion,
          ignoreNextVisitorsOnNode: () => {
            ignoreNextVisitorsOnNode = true;
          },
          getVisitorData: getVisitorDataFn.bind(undefined, ruleId),
        },
        collectParents(context),
        context
      );
      return { ignoreNextVisitorsOnNode };
    }

    function reportFn(ruleId: string, severity: ProblemSeverity, opts: Problem) {
      const loc = opts.location
        ? Array.isArray(opts.location)
          ? opts.location
          : [opts.location]
        : [{ ...currentLocation, reportOnKey: false }];

      const ruleSeverity = opts.forceSeverity || severity;
      if (ruleSeverity !== 'off') {
        ctx.problems.push({
          ruleId: opts.ruleId || ruleId,
          severity: ruleSeverity,
          ...opts,
          suggest: opts.suggest || [],
          location: loc.map((loc: any) => {
            return { ...currentLocation, reportOnKey: false, ...loc };
          }),
        });
      }
    }
    function getVisitorDataFn(ruleId: string) {
      ctx.visitorsData[ruleId] = ctx.visitorsData[ruleId] || {};
      return ctx.visitorsData[ruleId];
    }
  }
}
