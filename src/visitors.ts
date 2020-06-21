import type {
  OAS3Definition,
  OAS3Info,
  OAS3Contact,
  OAS3Components,
  OAS3License,
  OAS3Schema,
  OAS3Header,
  OAS3Parameter,
  OAS3Operation,
  OAS3Path,
  OAS3Paths,
  OAS3ServerVariable,
  OAS3Server,
  OAS3Responses,
  OAS3MediaType,
  OAS3Response,
  OAS3Example,
  OAS3RequestBody,
  OAS3Tag,
  OASRef,
  OAS3SecurityScheme,
  OAS3SecurityRequirement,
} from './typings/openapi';

import { NormalizedNodeType } from "./types";
import { Stack } from './utils';
import { UserContext, ResolveResult, MessageSeverity } from './walk';
import { Location } from './ref';

export type VisitFunction<T> = (node: T, ctx: UserContext, parents?: any) => void;

type VisitRefFunction = (node: OASRef, ctx: UserContext, resolved: ResolveResult<any>) => void;

type SkipFunction<T> = (node: T, key: string | number) => boolean;

type VisitObject<T, P extends BaseVisitor> = {
  enter?: VisitFunction<T>;
  leave?: VisitFunction<T>;
  skip?: SkipFunction<T>;
} & NestedVisitor<P>;

type VisitFunctionOrObject<T, P> = VisitFunction<T> | VisitObject<T, P>;

type VisitorNode<T extends any> = {
  ruleId: string;
  severity: MessageSeverity;
  context: VisitorLevelContext | VisitorSkippedLevelContext;
  depth: number;
  visit: VisitFunction<T>;
  skip?: SkipFunction<T>;
};

type VisitorRefNode = {
  ruleId: string;
  severity: MessageSeverity;
  context: VisitorLevelContext | VisitorSkippedLevelContext;
  depth: number;
  visit: VisitRefFunction;
};

export type VisitorLevelContext = {
  isSkippedLevel: false;
  type: NormalizedNodeType;
  parent: VisitorLevelContext | null;

  activatedOn: Stack<{
    node?: any;
    withParentNode?: any;
    skipped: boolean;
    nextLevelTypeActivated: Stack<NormalizedNodeType>;
    location?: Location;
  }>;
};

export type VisitorSkippedLevelContext = {
  isSkippedLevel: true;
  parent: VisitorLevelContext;
  seen: Set<any>;
};

type NormalizeVisitor<Fn> = Fn extends VisitFunction<infer T> ? VisitorNode<T> : never;

export type BaseVisitor = {
  any?:
    | {
        enter?: VisitFunction<any>;
        leave?: VisitFunction<any>;
        skip?: SkipFunction<any>;
      }
    | VisitFunction<any>;

  ref?: VisitRefFunction;
  // todo RefVisitor
};

export type OAS3Visitor = BaseVisitor & {
  DefinitionRoot?: VisitFunctionOrObject<OAS3Definition, OAS3Visitor>;
  Info?: VisitFunctionOrObject<OAS3Info, OAS3Visitor>;
  Contact?: VisitFunctionOrObject<OAS3Contact, OAS3Visitor>;
  Components?: VisitFunctionOrObject<OAS3Components, OAS3Visitor>;
  Header?: VisitFunctionOrObject<OAS3Header, OAS3Visitor>;
  License?: VisitFunctionOrObject<OAS3License, OAS3Visitor>;
  Schema?: VisitFunctionOrObject<OAS3Schema, OAS3Visitor>;
  SchemaProperties?: VisitFunctionOrObject<{ [name: string]: OAS3Schema }, OAS3Visitor>;
  Parameter?: VisitFunctionOrObject<OAS3Parameter, OAS3Visitor>;
  Operation?: VisitFunctionOrObject<OAS3Operation, OAS3Visitor>;
  PathItem?: VisitFunctionOrObject<OAS3Path, OAS3Visitor>;
  PathMap?: VisitFunctionOrObject<OAS3Paths, OAS3Visitor>;
  ServerVariable?: VisitFunctionOrObject<OAS3ServerVariable, OAS3Visitor>;
  Server?: VisitFunctionOrObject<OAS3Server, OAS3Visitor>;
  MediaType?: VisitFunctionOrObject<OAS3MediaType, OAS3Visitor>;
  Response?: VisitFunctionOrObject<OAS3Response, OAS3Visitor>;
  ResponsesMap?: VisitFunctionOrObject<OAS3Responses, OAS3Visitor>;
  NamedSchemasMap?: VisitFunctionOrObject<{ [name: string]: OAS3Schema }, OAS3Visitor>;
  RequestBody?: VisitFunctionOrObject<OAS3RequestBody, OAS3Visitor>;
  Example?: VisitFunctionOrObject<OAS3Example, OAS3Visitor>;
  Tag?: VisitFunctionOrObject<OAS3Tag, OAS3Visitor>;
  SecurityScheme?: VisitFunctionOrObject<OAS3SecurityScheme, OAS3Visitor>;
  SecurityRequirement?: VisitFunctionOrObject<OAS3SecurityRequirement, OAS3Visitor>;
  // TODO
}

export type NestedVisitor<T> = Exclude<T, 'any' | 'ref' | 'DefinitionRoot'>;

export type NormalizedOASVisitors<T extends BaseVisitor> = {
  [V in keyof T]-?: {
    enter: Array<NormalizeVisitor<T[V]>>;
    leave: Array<NormalizeVisitor<T[V]>>;
  };
} & {
  ref: {
    enter: Array<VisitorRefNode>;
    leave: Array<VisitorRefNode>;
  };
  [k: string]: {
    // any internal types
    enter: Array<VisitorNode<any>>;
    leave: Array<VisitorNode<any>>;
  };
};

export type OAS3Rule = (options?: Record<string, any>) => OAS3Visitor;

export type RuleInstanceConfig = {
  ruleId: string;
  severity: MessageSeverity;
};

// alias for the latest version supported
// every time we update it - consider semver
export type OASRule = OAS3Rule;

export function normalizeVisitors<T extends BaseVisitor>(
  visitorsConfig: (RuleInstanceConfig & { visitor: VisitObject<any, T> })[],
  types: Record<keyof T, NormalizedNodeType>,
): NormalizedOASVisitors<T> {
  const normalizedVisitors: NormalizedOASVisitors<T> = {} as any;

  for (const typeName of Object.keys(types) as Array<keyof T>) {
    normalizedVisitors[typeName] = {
      enter: [],
      leave: [],
    } as any;
  }

  normalizedVisitors.any = {
    enter: [],
    leave: [],
  };

  normalizedVisitors.ref = {
    enter: [],
    leave: [],
  };

  for (const { ruleId, severity, visitor } of visitorsConfig) {
    normalizeVisitorLevel({ ruleId, severity }, visitor, null);
  }

  for (const v of Object.keys(normalizedVisitors)) {
    normalizedVisitors[v].enter.sort((a, b) => b.depth - a.depth);
    normalizedVisitors[v].leave.sort((a, b) => a.depth - b.depth);
  }

  return normalizedVisitors;

  function addWeakNodes(
    ruleConf: RuleInstanceConfig,
    from: NormalizedNodeType,
    to: NormalizedNodeType,
    parentContext: VisitorLevelContext,
    stack: NormalizedNodeType[] = [],
  ) {
    if (stack.includes(from)) return;

    stack = [...stack, from];

    const possibleChildren = new Set<NormalizedNodeType>();

    for (let type of Object.values(from.properties)) {
      if (type === to) {
        addWeakFromStack(ruleConf, stack);
        continue;
      }
      if (typeof type === 'object' && type !== null && type.name) {
        possibleChildren.add(type);
      }
    }
    if (from.items) {
      if (from.items === to) {
        addWeakFromStack(ruleConf, stack);
      } else {
        possibleChildren.add(from.items);
      }
    }

    for (let fromType of Array.from(possibleChildren.values())) {
      addWeakNodes(ruleConf, fromType, to, parentContext, stack);
    }

    function addWeakFromStack(ruleConf: RuleInstanceConfig, stack: NormalizedNodeType[]) {
      for (const interType of stack.slice(1)) {
        (normalizedVisitors as any)[interType.name] =
          normalizedVisitors[interType.name] ||
          ({
            enter: [],
            leave: [],
          } as any);
        normalizedVisitors[interType.name].enter.push({
          ...ruleConf,
          visit: () => undefined,
          depth: 0,
          context: {
            isSkippedLevel: true as true,
            seen: new Set(),
            parent: parentContext,
          },
        });
      }
    }
  }

  function normalizeVisitorLevel(
    ruleConf: RuleInstanceConfig,
    visitor: VisitObject<any, T>,
    parentContext: VisitorLevelContext | null,
    depth = 0,
  ) {
    const visitorKeys = Object.keys(types) as Array<keyof T | 'any'>;

    if (depth === 0) {
      visitorKeys.push('any');
      visitorKeys.push('ref');
    } else {
      if (visitor.any) {
        throw new Error('any() is allowed only on top level');
      }
      if (visitor.ref) {
        throw new Error('ref() is allowed only on top level');
      }
    }

    for (const typeName of visitorKeys as Array<keyof T>) {
      const typeVisitor = (visitor[typeName] as any) as VisitObject<any, T>;
      const normalizedTypeVisitor = normalizedVisitors[typeName]!;

      if (!typeVisitor) continue;

      let visitorEnter: VisitFunction<any> | undefined;
      let visitorLeave: VisitFunction<any> | undefined;
      let visitorSkip: SkipFunction<any> | undefined;

      const isObjectVisitor = typeof typeVisitor === 'object';

      if (typeName === 'ref' && isObjectVisitor) {
        throw new Error('ref() visitor must be a function');
      }

      if (typeof typeVisitor === 'function') {
        visitorEnter = typeVisitor as any;
      } else if (isObjectVisitor) {
        visitorEnter = typeVisitor.enter;
        visitorLeave = typeVisitor.leave;
        visitorSkip = typeVisitor.skip;
      }

      const context: VisitorLevelContext = {
        activatedOn: null,
        type: types[typeName],
        parent: parentContext,
        isSkippedLevel: false as false,
      };

      if (typeof typeVisitor === 'object') {
        normalizeVisitorLevel(ruleConf, typeVisitor as any, context, depth + 1);
      }

      if (parentContext) {
        addWeakNodes(ruleConf, parentContext.type, types[typeName], parentContext);
      }

      if (visitorEnter || isObjectVisitor) {
        if (visitorEnter && typeof visitorEnter !== 'function') {
          throw new Error('DEV: should be function');
        }

        normalizedTypeVisitor.enter.push({
          ...ruleConf,
          visit: visitorEnter || (() => undefined),
          skip: visitorSkip,
          depth,
          context,
        });
      }

      if (visitorLeave) {
        if (typeof visitorLeave !== 'function') {
          throw new Error('DEV: should be function');
        }
        normalizedTypeVisitor.leave.push({
          ...ruleConf,
          visit: visitorLeave,
          depth,
          context,
        });
      }
    }
  }
}
