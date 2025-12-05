import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2Parameter } from '../../typings/swagger.js';
import type { Oas3Parameter } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

const pathRegex = /\{([a-zA-Z0-9_.-]+)\}+/g;
const MAX_DEPTH = 4;

type PathContext = {
  path: string;
  templateParams: Set<string>;
  definedParams: Set<string>;
};

type OperationHandlers = {
  enter: () => void;
  leave: (op: unknown, ctx: UserContext) => void;
  Parameter: (parameter: Oas2Parameter | Oas3Parameter, ctx: UserContext) => void;
  Callback: {
    PathItem: {
      enter: (node: object, ctx: UserContext) => void;
      leave: () => void;
      Parameter: (parameter: Oas2Parameter | Oas3Parameter, ctx: UserContext) => void;
      Operation: OperationHandlers;
    };
  };
};

export const PathParamsDefined: Oas3Rule | Oas2Rule = () => {
  const pathContext = { current: null as PathContext | null };
  const operationParams = { current: null as Set<string> | null };

  return {
    PathItem: {
      enter(_: object, { key }: UserContext) {
        pathItemEnter(pathContext, key as string);
      },
      leave() {
        pathItemLeave(pathContext);
      },
      Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
        createPathItemParameterHandler(parameter, pathContext, report, location);
      },
      Operation: createOperationHandlers(pathContext, operationParams),
    },
  };
};

const pathItemEnter = (pathContext: { current: PathContext | null }, key: string) => {
  pathContext.current = {
    path: key,
    templateParams: extractTemplateParams(key),
    definedParams: new Set(),
  };
};

const pathItemLeave = (pathContext: { current: PathContext | null }) => {
  pathContext.current = null;
};

const createPathItemParameterHandler = (
  parameter: Oas2Parameter | Oas3Parameter,
  pathContext: { current: PathContext | null },
  report: UserContext['report'],
  location: UserContext['location']
) => {
  if (parameter.in === 'path' && parameter.name && pathContext.current) {
    pathContext.current.definedParams.add(parameter.name);
    validatePathParameter(
      parameter.name,
      pathContext.current.templateParams,
      pathContext.current.path,
      report,
      location
    );
  }
};

const createEmptyOperationHandlers = (maxDepth: number): OperationHandlers => {
  let warningReported = false;

  const reportMaxDepthWarning = (
    report: UserContext['report'],
    location: UserContext['location']
  ) => {
    if (!warningReported) {
      warningReported = true;
      report({
        message: `Maximum callback nesting depth (${maxDepth}) reached. Path parameter validation is limited beyond this depth to prevent infinite recursion.`,
        location: location,
      });
    }
  };

  // Return empty no-op handlers that report a warning on first use
  return {
    enter: () => {},
    leave(_op: unknown, { report, location }: UserContext) {
      reportMaxDepthWarning(report, location);
    },
    Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
      reportMaxDepthWarning(report, location);
    },
    Callback: {
      PathItem: {
        enter(_: object, { report, location }: UserContext) {
          reportMaxDepthWarning(report, location);
        },
        leave: () => {},
        Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
          reportMaxDepthWarning(report, location);
        },
        Operation: {
          enter: () => {},
          leave(_op: unknown, { report, location }: UserContext) {
            reportMaxDepthWarning(report, location);
          },
          Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
            reportMaxDepthWarning(report, location);
          },
          Callback: {},
        },
      },
    },
  } as unknown as OperationHandlers;
};

const createOperationHandlers = (
  pathContext: { current: PathContext | null },
  operationParams: { current: Set<string> | null },
  depth = 0
): OperationHandlers => {
  if (depth >= MAX_DEPTH) {
    return createEmptyOperationHandlers(MAX_DEPTH);
  }

  const createCallbackPathItem = () => ({
    enter(_: object, { key }: UserContext) {
      pathItemEnter(pathContext, key as string);
    },
    leave() {
      pathItemLeave(pathContext);
    },
    Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
      createPathItemParameterHandler(parameter, pathContext, report, location);
    },
    get Operation() {
      return createOperationHandlers(pathContext, operationParams, depth + 1);
    },
  });

  return {
    enter() {
      operationParams.current = new Set();
    },
    leave(_op: unknown, { report, location }: UserContext) {
      if (!pathContext.current || !operationParams.current) return;

      collectPathParamsFromOperation(_op, operationParams.current);

      validateRequiredPathParams(
        pathContext.current.templateParams,
        operationParams.current,
        pathContext.current.definedParams,
        pathContext.current.path,
        report,
        location
      );
    },
    Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
      if (
        parameter.in === 'path' &&
        parameter.name &&
        pathContext.current &&
        operationParams.current
      ) {
        operationParams.current.add(parameter.name);
        validatePathParameter(
          parameter.name,
          pathContext.current.templateParams,
          pathContext.current.path,
          report,
          location
        );
      }
    },
    Callback: {
      get PathItem() {
        return createCallbackPathItem();
      },
    },
  };
};

const extractTemplateParams = (path: string): Set<string> => {
  return new Set(Array.from(path.matchAll(pathRegex)).map((m) => m[1]));
};

const collectPathParamsFromOperation = (operation: unknown, targetSet: Set<string>): void => {
  const op = operation as { parameters?: Array<{ in?: string; name?: string }> };
  op?.parameters?.forEach((param) => {
    if (param?.in === 'path' && param?.name) {
      targetSet.add(param.name);
    }
  });
};

const validatePathParameter = (
  paramName: string,
  templateParams: Set<string>,
  path: string,
  report: UserContext['report'],
  location: UserContext['location']
): void => {
  if (!templateParams.has(paramName)) {
    report({
      message: `Path parameter \`${paramName}\` is not used in the path \`${path}\`.`,
      location: location.child(['name']),
    });
  }
};

const validateRequiredPathParams = (
  templateParams: Set<string>,
  definedOperationParams: Set<string>,
  definedPathParams: Set<string>,
  path: string,
  report: UserContext['report'],
  location: UserContext['location']
): void => {
  const allDefinedParams = new Set([...definedOperationParams, ...definedPathParams]);

  for (const templateParam of templateParams) {
    if (!allDefinedParams.has(templateParam)) {
      report({
        message: `The operation does not define the path parameter \`{${templateParam}}\` expected by path \`${path}\`.`,
        location: location.child(['parameters']).key(),
      });
    }
  }
};
