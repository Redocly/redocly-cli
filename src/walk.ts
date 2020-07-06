import { Referenced } from './typings/openapi';
import { Location, isRef } from './ref-utils';

import {
  VisitorLevelContext,
  NormalizedOasVisitors,
  VisitorSkippedLevelContext,
  VisitFunction,
} from './visitors';

import { ResolvedRefMap, Document, ResolveError, YamlParseError, Source } from './resolve';
import { pushStack, popStack } from './utils';
import { OasVersion } from './validate';
import { NormalizedNodeType, isNamedType } from './types';

type NonUndefined = string | number | boolean | symbol | bigint | object | Record<string, any>;

export type ResolveResult<T extends NonUndefined> =
  | { node: T; location: Location; error?: ResolveError | YamlParseError }
  | { node: undefined; location: undefined; error?: ResolveError | YamlParseError };

export type ResolveFn<T> = (
  node: Referenced<T>,
  from?: string,
) => { location: Location; node: T } | { location: undefined; node: undefined };

export type UserContext = {
  report(message: ReportMessage): void;
  location: Location;
  resolve<T>(
    node: Referenced<T>,
  ): { location: Location; node: T } | { location: undefined; node: undefined };
  parentLocations: Record<string, Location>;
  type: NormalizedNodeType;
  key: string | number;
  parent: any;
  oasVersion: OasVersion;
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

export type MessageSeverity = 'error' | 'warn';

export type ReportMessage = {
  message: string;
  suggest?: string[];
  location?: Partial<LocationObject> | Array<Partial<LocationObject>>;
  from?: LocationObject;
  forceSeverity?: MessageSeverity;
};

export type NormalizedReportMessage = {
  message: string;
  ruleId: string;
  severity: MessageSeverity;
  location: LocationObject[];
  from?: LocationObject;
  suggest: string[];
  ignored?: boolean;
};

export type WalkContext = {
  messages: NormalizedReportMessage[];
  oasVersion: OasVersion;
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
    key: string | number,
  ) {
    const { node: resolvedNode, location: newLocation, error } = resolve(node);

    const enteredContexts: Set<VisitorLevelContext> = new Set();

    if (isRef(node)) {
      const refEnterVisitors = normalizedVisitors.ref.enter;
      for (const { visit: visitor, ruleId, severity, context } of refEnterVisitors) {
        if (!seenRefs.has(node)) {
          enteredContexts.add(context);
          const report = reportFn.bind(undefined, ruleId, severity, location);
          visitor(
            node,
            {
              report,
              resolve,
              location,
              type,
              parent,
              key,
              parentLocations: {},
              oasVersion: ctx.oasVersion,
            },
            { node: resolvedNode, location: newLocation, error },
          );
        }
      }
    }

    if (resolvedNode !== undefined && newLocation && type.name !== 'scalar') {
      const isNodeSeen = seenNodesPerType[type.name]?.has?.(resolvedNode);
      let visitedBySome = false;

      const anyEnterVisitors = normalizedVisitors.any.enter;
      const currentEnterVisitors = anyEnterVisitors.concat(
        normalizedVisitors[type.name]?.enter || [],
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
              location: newLocation,
              nextLevelTypeActivated: null,
              withParentNode: context.parent?.activatedOn?.value.node,
              skipped:
                (context.parent?.activatedOn?.value.skipped || skip?.(resolvedNode, key)) ?? false,
            };

            context.activatedOn = pushStack<any>(context.activatedOn, activatedOn);

            let ctx: VisitorLevelContext | null = context.parent;
            while (ctx) {
              ctx.activatedOn!.value.nextLevelTypeActivated = pushStack(
                ctx.activatedOn!.value.nextLevelTypeActivated,
                type,
              );
              ctx = ctx.parent;
            }

            if (!activatedOn.skipped) {
              visitedBySome = true;
              enteredContexts.add(context);
              visitWithContext(visit, resolvedNode, context, newLocation, ruleId, severity);
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
              walkNode(resolvedNode[i], itemsType, newLocation.child([i]), resolvedNode, i);
            }
          }
        } else if (typeof resolvedNode === 'object' && resolvedNode !== null) {
          // visit in order from type-tree first
          const props = Object.keys(type.properties);
          if (type.additionalProperties) {
            props.push(...Object.keys(resolvedNode).filter(k => !props.includes(k)));
          }
          for (const propName of props) {
            let value = resolvedNode[propName];

            let propType = type.properties[propName];
            if (propType === undefined) propType = type.additionalProperties;
            if (typeof propType === 'function') propType = propType(value, propName);
            if (propType && propType.name === undefined && propType.referenceable) {
              propType = { name: 'scalar', properties: {} };
            }

            if (!isNamedType(propType) && propType?.directResolveAs) {
              propType = propType.directResolveAs;
              value = { $ref: value };
            }

            if (!isNamedType(propType)) {
              continue;
            }

            walkNode(value, propType, newLocation.child([propName]), resolvedNode, propName);
          }

        }
      }

      const anyLeaveVisitors = normalizedVisitors.any.leave;
      const currentLeaveVisitors = (normalizedVisitors[type.name]?.leave || []).concat(
        anyLeaveVisitors,
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
                ctx.activatedOn!.value.nextLevelTypeActivated,
              );
              ctx = ctx.parent;
            }
          }
        }
      }

      for (const { context, visit, ruleId, severity } of currentLeaveVisitors) {
        if (!context.isSkippedLevel && enteredContexts.has(context)) {
          visitWithContext(visit, resolvedNode, context, newLocation, ruleId, severity);
        }
      }
    }

    if (isRef(node)) {
      const refLeaveVisitors = normalizedVisitors.ref.leave;
      for (const { visit: visitor, ruleId, severity, context } of refLeaveVisitors) {
        if (enteredContexts.has(context)) {
          const report = reportFn.bind(undefined, ruleId, severity, location);
          visitor(
            node,
            {
              report,
              resolve,
              location,
              type,
              parent,
              key,
              parentLocations: {},
              oasVersion: ctx.oasVersion,
            },
            { node: resolvedNode, location: newLocation, error },
          );
        }
      }
    }

    function visitWithContext(
      visit: VisitFunction<any>,
      node: any,
      context: VisitorLevelContext,
      location: Location,
      ruleId: string,
      severity: MessageSeverity,
    ) {
      const report = reportFn.bind(undefined, ruleId, severity, location);
      visit(
        node,
        {
          report,
          resolve,
          location: location,
          type,
          parent,
          key,
          parentLocations: collectParentsLocations(context),
          oasVersion: ctx.oasVersion,
        },
        collectParents(context),
      );
    }

    function resolve<T>(
      ref: Referenced<T>,
      from: string = location.source.absoluteRef,
    ): ResolveResult<T> {
      if (!isRef(ref)) return { location, node: ref };
      const refId = from + '::' + ref.$ref;

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
    }

    function reportFn(ruleId: string, severity: MessageSeverity, location: Location, opts: ReportMessage) {
      const loc = opts.location
        ? Array.isArray(opts.location)
          ? opts.location
          : [opts.location]
        : [{ ...location, reportOnKey: false }];

      ctx.messages.push({
        ruleId,
        severity: opts.forceSeverity || severity,
        ...opts,
        suggest: opts.suggest || [],
        location: loc.map((loc: any) => {
          return { ...location, reportOnKey: false, ...loc };
        }),
      });
    }
  }
}
