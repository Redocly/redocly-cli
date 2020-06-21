import type {
  Oas3Definition,
  Oas3ExternalDocs,
  Oas3Info,
  Oas3Contact,
  Oas3Components,
  Oas3License,
  Oas3Schema,
  Oas3Header,
  Oas3Parameter,
  Oas3Operation,
  Oas3PathItem,
  Oas3ServerVariable,
  Oas3Server,
  Oas3MediaType,
  Oas3Response,
  Oas3Example,
  Oas3RequestBody,
  Oas3Tag,
  OasRef,
  Oas3SecurityScheme,
  Oas3SecurityRequirement,
  Oas3Encoding,
  Oas3Link,
  Oas3Xml,
  Oas3Discriminator,
  Oas3Callback,
} from './typings/openapi';

import { NormalizedNodeType } from './types';
import { Stack } from './utils';
import { UserContext, ResolveResult, MessageSeverity } from './walk';
import { Location } from './ref-utils';

export type VisitFunction<T> = (node: T, ctx: UserContext, parents?: any) => void;

type VisitRefFunction = (node: OasRef, ctx: UserContext, resolved: ResolveResult<any>) => void;

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

type Oas3FlatVisitor = {
  DefinitionRoot?: VisitFunctionOrObject<Oas3Definition>;
  Tag?: VisitFunctionOrObject<Oas3Tag>;
  ExternalDocs?: VisitFunctionOrObject<Oas3ExternalDocs>;
  Server?: VisitFunctionOrObject<Oas3Server>;
  ServerVariable?: VisitFunctionOrObject<Oas3ServerVariable>;
  SecurityRequirement?: VisitFunctionOrObject<Oas3SecurityRequirement>;
  Info?: VisitFunctionOrObject<Oas3Info>;
  Contact?: VisitFunctionOrObject<Oas3Contact>;
  License?: VisitFunctionOrObject<Oas3License>;
  PathMap?: VisitFunctionOrObject<Record<string, Oas3PathItem>>;
  PathItem?: VisitFunctionOrObject<Oas3PathItem>;
  Parameter?: VisitFunctionOrObject<Oas3Parameter>;
  Operation?: VisitFunctionOrObject<Oas3Operation>;
  RequestBody?: VisitFunctionOrObject<Oas3RequestBody>;
  MediaTypeMap?: VisitFunctionOrObject<Record<string, Oas3MediaType>>;
  MediaType?: VisitFunctionOrObject<Oas3MediaType>;
  Example?: VisitFunctionOrObject<Oas3Example>;
  Encoding?: VisitFunctionOrObject<Oas3Encoding>;
  Header?: VisitFunctionOrObject<Oas3Header>;
  ResponsesMap?: VisitFunctionOrObject<Record<string, Oas3Response>>;
  Response?: VisitFunctionOrObject<Oas3Response>;
  Link?: VisitFunctionOrObject<Oas3Link>;
  Schema?: VisitFunctionOrObject<Oas3Schema>;
  Xml?: VisitFunctionOrObject<Oas3Xml>;
  SchemaProperties?: VisitFunctionOrObject<Record<string, Oas3Schema>>;
  Discriminator?: VisitFunctionOrObject<Oas3Discriminator>;
  Components?: VisitFunctionOrObject<Oas3Components>;
  NamedSchemas?: VisitFunctionOrObject<Record<string, Oas3Schema>>;
  NamedResponses?: VisitFunctionOrObject<Record<string, Oas3Response>>;
  NamedParameters?: VisitFunctionOrObject<Record<string, Oas3Parameter>>;
  NamedExamples?: VisitFunctionOrObject<Record<string, Oas3Example>>;
  NamedRequestBodies?: VisitFunctionOrObject<Record<string, Oas3RequestBody>>;
  NamedHeaders?: VisitFunctionOrObject<Record<string, Oas3Header>>;
  NamedSecuritySchemes?: VisitFunctionOrObject<Record<string, Oas3SecurityScheme>>;
  NamedLinks?: VisitFunctionOrObject<Record<string, Oas3Link>>;
  NamedCallbacks?: VisitFunctionOrObject<Record<string, Oas3Callback>>;
  ImplicitFlow?: VisitFunctionOrObject<Oas3SecurityScheme['flows']['implicit']>;
  PasswordFlow?: VisitFunctionOrObject<Oas3SecurityScheme['flows']['password']>;
  ClientCredentials?: VisitFunctionOrObject<Oas3SecurityScheme['flows']['clientCredentials']>;
  AuthorizationCode?: VisitFunctionOrObject<Oas3SecurityScheme['flows']['authorizationCode']>;
  SecuritySchemeFlows?: VisitFunctionOrObject<Oas3SecurityScheme['flows']>;
  SecurityScheme?: VisitFunctionOrObject<Oas3SecurityScheme>;
};

type Oas3NestedVisitor = {
  [T in keyof Oas3FlatVisitor]: Oas3FlatVisitor[T] extends Function
    ? Oas3FlatVisitor[T]
    : Oas3FlatVisitor[T] & NestedVisitor<Oas3NestedVisitor>;
};

export type Oas3Visitor = BaseVisitor &
  Oas3NestedVisitor &
  Record<string, VisitFunction<any> | NestedVisitObject<any, Oas3NestedVisitor>>;

export type Oas3TransformVisitor = BaseVisitor &
  Oas3FlatVisitor &
  Record<string, VisitFunction<any> | VisitObject<any>>;

export type NestedVisitor<T> = Exclude<T, 'any' | 'ref' | 'DefinitionRoot'>;

export type NormalizedOasVisitors<T extends BaseVisitor> = {
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

export type Oas3Rule = (options?: Record<string, any>) => Oas3Visitor;
export type Oas3Transformer = (options?: Record<string, any>) => Oas3TransformVisitor;

// alias for the latest version supported
// every time we update it - consider semver
export type OasRule = Oas3Rule;

export type RuleInstanceConfig = {
  ruleId: string;
  severity: MessageSeverity;
};

export function normalizeVisitors<T extends BaseVisitor>(
  visitorsConfig: (RuleInstanceConfig & { visitor: NestedVisitObject<any, T> })[],
  types: Record<keyof T, NormalizedNodeType>,
): NormalizedOasVisitors<T> {
  const normalizedVisitors: NormalizedOasVisitors<T> = {} as any;

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
