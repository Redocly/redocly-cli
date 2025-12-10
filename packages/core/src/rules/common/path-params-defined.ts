import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2Parameter } from '../../typings/swagger.js';
import type { Oas3Parameter } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

const pathRegex = /\{([a-zA-Z0-9_.-]+)\}+/g;
const MAX_DEPTH = 2; // Only first callback level is supported

type PathContext = {
  path: string;
  templateParams: Set<string>;
  definedParams: Set<string>;
};

export const PathParamsDefined: Oas3Rule | Oas2Rule = () => {
  const pathContext = { current: null as PathContext | null };
  const currentOperationParams = new Set<string>();

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
      Operation: createOperationHandlers(pathContext, currentOperationParams),
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

const createOperationHandlers = (
  pathContext: { current: PathContext | null },
  currentOperationParams: Set<string>,
  depth = 0
) => {
  const reportMaxDepthWarning = (
    report: UserContext['report'],
    location: UserContext['location'],
    depth: number
  ) => {
    report({
      message: `Maximum callback nesting depth (${depth}) reached. Path parameter validation is limited beyond this depth to prevent infinite recursion.`,
      location: location,
    });
  };
  if (depth >= MAX_DEPTH) {
    return {
      enter: () => {},
      leave: (_op: unknown, { report, location }: UserContext) => {
        reportMaxDepthWarning(report, location, depth);
      },
      Parameter: () => {},
      Callback: undefined,
    };
  }

  const createCallbackPathItem = () => {
    let parentPathContext: PathContext | null = null;

    return {
      enter(_: object, { key }: UserContext) {
        parentPathContext = pathContext.current;
        pathItemEnter(pathContext, key as string);
      },
      leave() {
        pathContext.current = parentPathContext;
      },
      Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
        createPathItemParameterHandler(parameter, pathContext, report, location);
      },
      get Operation() {
        return createOperationHandlers(pathContext, currentOperationParams, depth + 1);
      },
    };
  };

  return {
    enter() {
      currentOperationParams = new Set();
    },
    leave(_op: unknown, { report, location }: UserContext) {
      if (!pathContext.current || !currentOperationParams) return;

      collectPathParamsFromOperation(_op, currentOperationParams);

      validateRequiredPathParams(
        pathContext.current.templateParams,
        currentOperationParams,
        pathContext.current.definedParams,
        pathContext.current.path,
        report,
        location
      );
    },
    Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
      if (parameter.in === 'path' && parameter.name && pathContext.current) {
        currentOperationParams.add(parameter.name);
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
  const op = operation as { parameters?: unknown };
  const params = op?.parameters;

  if (Array.isArray(params)) {
    for (const param of params) {
      if (param && typeof param === 'object' && 'in' in param && 'name' in param) {
        const p = param as { in?: string; name?: string };
        if (p.in === 'path' && p.name) {
          targetSet.add(p.name);
        }
      }
    }
  }
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
