import type {
  OAS3Definition,
  OAS3ExternalDocs,
  OAS3Info,
  OAS3Contact,
  OAS3Components,
  OAS3License,
  OAS3Schema,
  OAS3Header,
  OAS3Parameter,
  OAS3Operation,
  OAS3PathItem,
  OAS3ServerVariable,
  OAS3Server,
  OAS3MediaType,
  OAS3Response,
  OAS3Example,
  OAS3RequestBody,
  OAS3Tag,
  OASRef,
  OAS3SecurityScheme,
  OAS3SecurityRequirement,
  OAS3Encoding,
  OAS3Link,
  OAS3Xml,
  OAS3Discriminator,
  OAS3Callback,
} from './typings/openapi';

import { NormalizedNodeType } from './types';
import { Stack } from './utils';
import { UserContext, ResolveResult, MessageSeverity } from './walk';
import { Location } from './ref';

export type VisitFunction<T> = (node: T, ctx: UserContext, parents?: any) => void;

type VisitRefFunction = (node: OASRef, ctx: UserContext, resolved: ResolveResult<any>) => void;

type SkipFunction<T> = (node: T, key: string | number) => boolean;

type VisitObject<T> = {
  enter?: VisitFunction<T>;
  leave?: VisitFunction<T>;
  skip?: SkipFunction<T>;
};

type NestedVisitObject<T, P> = VisitObject<T> & NestedVisitor<P>;

type VisitFunctionOrObject<T> = VisitFunction<T> | VisitObject<T>;

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
};

type OAS3FlatVisitor = {
  DefinitionRoot?: VisitFunctionOrObject<OAS3Definition>;
  Tag?: VisitFunctionOrObject<OAS3Tag>;
  ExternalDocs?: VisitFunctionOrObject<OAS3ExternalDocs>;
  Server?: VisitFunctionOrObject<OAS3Server>;
  ServerVariable?: VisitFunctionOrObject<OAS3ServerVariable>;
  SecurityRequirement?: VisitFunctionOrObject<OAS3SecurityRequirement>;
  Info?: VisitFunctionOrObject<OAS3Info>;
  Contact?: VisitFunctionOrObject<OAS3Contact>;
  License?: VisitFunctionOrObject<OAS3License>;
  PathMap?: VisitFunctionOrObject<Record<string, OAS3PathItem>>;
  PathItem?: VisitFunctionOrObject<OAS3PathItem>;
  Parameter?: VisitFunctionOrObject<OAS3Parameter>;
  Operation?: VisitFunctionOrObject<OAS3Operation>;
  RequestBody?: VisitFunctionOrObject<OAS3RequestBody>;
  MediaTypeMap?: VisitFunctionOrObject<Record<string, OAS3MediaType>>;
  MediaType?: VisitFunctionOrObject<OAS3MediaType>;
  Example?: VisitFunctionOrObject<OAS3Example>;
  Encoding?: VisitFunctionOrObject<OAS3Encoding>;
  Header?: VisitFunctionOrObject<OAS3Header>;
  ResponsesMap?: VisitFunctionOrObject<Record<string, OAS3Response>>;
  Response?: VisitFunctionOrObject<OAS3Response>;
  Link?: VisitFunctionOrObject<OAS3Link>;
  Schema?: VisitFunctionOrObject<OAS3Schema>;
  Xml?: VisitFunctionOrObject<OAS3Xml>;
  SchemaProperties?: VisitFunctionOrObject<Record<string, OAS3Schema>>;
  Discriminator?: VisitFunctionOrObject<OAS3Discriminator>;
  Components?: VisitFunctionOrObject<OAS3Components>;
  NamedSchemas?: VisitFunctionOrObject<Record<string, OAS3Schema>>;
  NamedResponses?: VisitFunctionOrObject<Record<string, OAS3Response>>;
  NamedParameters?: VisitFunctionOrObject<Record<string, OAS3Parameter>>;
  NamedExamples?: VisitFunctionOrObject<Record<string, OAS3Example>>;
  NamedRequestBodies?: VisitFunctionOrObject<Record<string, OAS3RequestBody>>;
  NamedHeaders?: VisitFunctionOrObject<Record<string, OAS3Header>>;
  NamedSecuritySchemes?: VisitFunctionOrObject<Record<string, OAS3SecurityScheme>>;
  NamedLinks?: VisitFunctionOrObject<Record<string, OAS3Link>>;
  NamedCallbacks?: VisitFunctionOrObject<Record<string, OAS3Callback>>;
  ImplicitFlow?: VisitFunctionOrObject<OAS3SecurityScheme['flows']['implicit']>;
  PasswordFlow?: VisitFunctionOrObject<OAS3SecurityScheme['flows']['password']>;
  ClientCredentials?: VisitFunctionOrObject<OAS3SecurityScheme['flows']['clientCredentials']>;
  AuthorizationCode?: VisitFunctionOrObject<OAS3SecurityScheme['flows']['authorizationCode']>;
  SecuritySchemeFlows?: VisitFunctionOrObject<OAS3SecurityScheme['flows']>;
  SecurityScheme?: VisitFunctionOrObject<OAS3SecurityScheme>;
};

type OAS3NestedVisitor = {
  [T in keyof OAS3FlatVisitor]: OAS3FlatVisitor[T] extends Function
    ? OAS3FlatVisitor[T]
    : OAS3FlatVisitor[T] & NestedVisitor<OAS3NestedVisitor>;
};

export type OAS3Visitor = BaseVisitor &
  OAS3NestedVisitor &
  Record<string, VisitFunction<any> | NestedVisitObject<any, OAS3NestedVisitor>>;

export type OAS3TransformVisitor = BaseVisitor &
  OAS3FlatVisitor &
  Record<string, VisitFunction<any> | VisitObject<any>>;

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
export type OAS3Transformer = (options?: Record<string, any>) => OAS3TransformVisitor;

// alias for the latest version supported
// every time we update it - consider semver
export type OASRule = OAS3Rule;

export type RuleInstanceConfig = {
  ruleId: string;
  severity: MessageSeverity;
};

export function normalizeVisitors<T extends BaseVisitor>(
  visitorsConfig: (RuleInstanceConfig & { visitor: NestedVisitObject<any, T> })[],
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
    visitor: NestedVisitObject<any, T>,
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
      const typeVisitor = (visitor[typeName] as any) as NestedVisitObject<any, T>;
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
