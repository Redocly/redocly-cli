import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2Parameter } from '../../typings/swagger.js';
import type { Oas3Parameter } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

const pathRegex = /\{([a-zA-Z0-9_.-]+)\}+/g;

export const PathParamsDefined: Oas3Rule | Oas2Rule = () => {
  let apiPathContext: {
    path: string;
    templateParams: Set<string>;
    definedParams: Set<string>;
  } | null = null;

  let currentPath: string;
  let pathTemplateParams: Set<string>;
  let definedPathParams: Set<string>;
  let definedOperationParams: Set<string>;

  return {
    Paths: {
      PathItem: {
        enter(_: object, { key }: UserContext) {
          const pathKey = key as string;
          definedPathParams = new Set();
          currentPath = pathKey;
          pathTemplateParams = extractTemplateParams(pathKey);

          apiPathContext = {
            path: pathKey,
            templateParams: new Set(pathTemplateParams),
            definedParams: new Set(definedPathParams),
          };
        },
        leave() {
          apiPathContext = null;
        },
        Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
          if (parameter.in === 'path' && parameter.name) {
            definedPathParams.add(parameter.name);

            if (apiPathContext) {
              apiPathContext.definedParams = new Set(definedPathParams);
            }
            validatePathParameter(
              parameter.name,
              pathTemplateParams,
              currentPath,
              report,
              location
            );
          }
        },
        Operation: {
          enter() {
            definedOperationParams = new Set();
          },
          leave(_op: unknown, { report, location }: UserContext) {
            if (location.pointer.includes('/callbacks/')) {
              return;
            }

            if (!apiPathContext) return;

            collectPathParamsFromOperation(_op, definedOperationParams);

            validateRequiredPathParams(
              apiPathContext.templateParams,
              definedOperationParams,
              definedPathParams,
              apiPathContext.path,
              report,
              location
            );
          },
          Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
            if (parameter.in === 'path' && parameter.name) {
              if (location.pointer.includes('/callbacks/')) {
                return;
              }
              definedOperationParams.add(parameter.name);
              const context = apiPathContext!;
              validatePathParameter(
                parameter.name,
                context.templateParams,
                context.path,
                report,
                location
              );
            }
          },
        },
      },
    },
    Callback: {
      PathItem: {
        enter(_: object, { key }: UserContext) {
          const pathKey = key as string;
          definedPathParams = new Set();
          currentPath = pathKey;
          pathTemplateParams = extractTemplateParams(pathKey);
        },
        Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
          if (parameter.in === 'path' && parameter.name) {
            definedPathParams.add(parameter.name);
            validatePathParameter(
              parameter.name,
              pathTemplateParams,
              currentPath,
              report,
              location
            );
          }
        },
        Operation: {
          enter() {
            definedOperationParams = new Set();
          },
          leave(_op: unknown, { report, location }: UserContext) {
            collectPathParamsFromOperation(_op, definedOperationParams);

            validateRequiredPathParams(
              pathTemplateParams,
              definedOperationParams,
              definedPathParams,
              currentPath,
              report,
              location
            );
          },
          Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
            if (parameter.in === 'path' && parameter.name) {
              definedOperationParams.add(parameter.name);
              validatePathParameter(
                parameter.name,
                pathTemplateParams,
                currentPath,
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
