import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2Parameter } from '../../typings/swagger.js';
import type { Oas3Parameter } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

const pathRegex = /\{([a-zA-Z0-9_.-]+)\}+/g;

export const PathParamsDefined: Oas3Rule | Oas2Rule = () => {
  let rootPathContext: {
    path: string;
    templateParams: Set<string>;
    definedParams: Set<string>;
  } | null = null;

  let callbackPathContext: {
    path: string;
    templateParams: Set<string>;
    definedParams: Set<string>;
  } | null = null;

  let currentOperationParams: Set<string> | null = null;

  return {
    Paths: {
      PathItem: {
        enter(_: object, { key }: UserContext) {
          const pathKey = key as string;
          const templateParams = extractTemplateParams(pathKey);

          rootPathContext = {
            path: pathKey,
            templateParams,
            definedParams: new Set(),
          };
        },
        leave() {
          rootPathContext = null;
        },
        Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
          if (parameter.in === 'path' && parameter.name && rootPathContext) {
            rootPathContext.definedParams.add(parameter.name);
            validatePathParameter(
              parameter.name,
              rootPathContext.templateParams,
              rootPathContext.path,
              report,
              location
            );
          }
        },
        Operation: {
          enter() {
            currentOperationParams = new Set();
          },
          leave(_op: unknown, { report, location }: UserContext) {
            if (location.pointer.includes('/callbacks/')) {
              return;
            }

            if (!rootPathContext || !currentOperationParams) return;

            collectPathParamsFromOperation(_op, currentOperationParams);

            validateRequiredPathParams(
              rootPathContext.templateParams,
              currentOperationParams,
              rootPathContext.definedParams,
              rootPathContext.path,
              report,
              location
            );
          },
          Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
            if (parameter.in === 'path' && parameter.name) {
              if (location.pointer.includes('/callbacks/')) {
                return;
              }
              if (rootPathContext && currentOperationParams) {
                currentOperationParams.add(parameter.name);
                validatePathParameter(
                  parameter.name,
                  rootPathContext.templateParams,
                  rootPathContext.path,
                  report,
                  location
                );
              }
            }
          },
        },
      },
    },
    Callback: {
      PathItem: {
        enter(_: object, { key }: UserContext) {
          const pathKey = key as string;
          const templateParams = extractTemplateParams(pathKey);

          callbackPathContext = {
            path: pathKey,
            templateParams,
            definedParams: new Set(),
          };
        },
        leave() {
          callbackPathContext = null;
        },
        Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
          if (parameter.in === 'path' && parameter.name && callbackPathContext) {
            callbackPathContext.definedParams.add(parameter.name);
            validatePathParameter(
              parameter.name,
              callbackPathContext.templateParams,
              callbackPathContext.path,
              report,
              location
            );
          }
        },
        Operation: {
          enter() {
            currentOperationParams = new Set();
          },
          leave(_op: unknown, { report, location }: UserContext) {
            if (!callbackPathContext || !currentOperationParams) return;

            collectPathParamsFromOperation(_op, currentOperationParams);

            validateRequiredPathParams(
              callbackPathContext.templateParams,
              currentOperationParams,
              callbackPathContext.definedParams,
              callbackPathContext.path,
              report,
              location
            );
          },
          Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
            if (
              parameter.in === 'path' &&
              parameter.name &&
              callbackPathContext &&
              currentOperationParams
            ) {
              currentOperationParams.add(parameter.name);
              validatePathParameter(
                parameter.name,
                callbackPathContext.templateParams,
                callbackPathContext.path,
                report,
                location
              );
            }
          },
        },
      },
    },
  };
};

const extractTemplateParams = (path: string): Set<string> => {
  return new Set(Array.from(path.toString().matchAll(pathRegex)).map((m) => m[1]));
};

const collectPathParamsFromOperation = (operation: unknown, targetSet: Set<string>): void => {
  const op = operation as { parameters?: Array<{ in?: string; name?: string }> };
  if (op?.parameters) {
    for (const param of op.parameters) {
      if (param?.in === 'path' && param?.name) {
        targetSet.add(param.name);
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
