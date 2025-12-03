import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2Operation, Oas2Parameter } from '../../typings/swagger.js';
import type { Oas3Operation, Oas3Parameter } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

const pathRegex = /\{([a-zA-Z0-9_.-]+)\}+/g;

type PathContext = {
  path: string;
  templateParams: Set<string>;
  definedParams: Set<string>;
};

type StackEntry = {
  path: string;
  templateParams: Set<string>;
  definedParams: Set<string>;
  isCallback: boolean;
  nonCallbackPathContext: PathContext | null;
};

export const PathParamsDefined: Oas3Rule | Oas2Rule = () => {
  let currentPath: string;
  let pathTemplateParams: Set<string>;
  let definedPathParams: Set<string>;

  let nonCallbackPathContext: PathContext | null = null;

  let operationContext: {
    path: string;
    templateParams: Set<string>;
    definedParams: Set<string>;
    definedOperationParams: Set<string>;
  } | null = null;

  const pathStack: StackEntry[] = [];

  const createOperationContext = (
    location: UserContext['location']
  ): NonNullable<typeof operationContext> => {
    const isCallback = location.pointer.includes('/callbacks/');

    if (isCallback) {
      return {
        path: currentPath,
        templateParams: new Set(pathTemplateParams),
        definedParams: new Set(definedPathParams),
        definedOperationParams: new Set(),
      };
    }

    const contextToUse = nonCallbackPathContext || {
      path: currentPath,
      templateParams: pathTemplateParams,
      definedParams: definedPathParams,
    };

    return {
      path: contextToUse.path,
      templateParams: new Set(contextToUse.templateParams),
      definedParams: new Set(definedPathParams),
      definedOperationParams: new Set(),
    };
  };

  return {
    PathItem: {
      enter(_: object, { key, location }: UserContext) {
        const pathKey = key as string;
        const isCallback = location.pointer.includes('/callbacks/');

        if (currentPath !== undefined) {
          pathStack.push({
            path: currentPath,
            templateParams: pathTemplateParams,
            definedParams: definedPathParams,
            isCallback,
            nonCallbackPathContext,
          });
        }

        definedPathParams = new Set();
        currentPath = pathKey;
        pathTemplateParams = new Set(
          Array.from(pathKey.toString().matchAll(pathRegex)).map((m) => m[1])
        );

        if (!isCallback) {
          nonCallbackPathContext = {
            path: pathKey,
            templateParams: new Set(pathTemplateParams),
            definedParams: new Set(definedPathParams),
          };
        }
      },
      leave(_: object, { location }: UserContext) {
        const isCallback = location.pointer.includes('/callbacks/');

        if (pathStack.length > 0) {
          const previous = pathStack.pop()!;

          // Restore previous path state
          currentPath = previous.path;
          pathTemplateParams = previous.templateParams;
          definedPathParams = previous.definedParams;

          if (!isCallback) {
            nonCallbackPathContext = previous.nonCallbackPathContext
              ? {
                  path: previous.nonCallbackPathContext.path,
                  templateParams: new Set(previous.nonCallbackPathContext.templateParams),
                  definedParams: new Set(definedPathParams),
                }
              : null;
          }
        } else if (!isCallback) {
          nonCallbackPathContext = null;
        }
      },
      Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
        if (parameter.in === 'path' && parameter.name) {
          definedPathParams.add(parameter.name);
          if (!pathTemplateParams.has(parameter.name)) {
            report({
              message: `Path parameter \`${parameter.name}\` is not used in the path \`${currentPath}\`.`,
              location: location.child(['name']),
            });
          }
        }
      },
      Operation: {
        enter(_operation: Oas3Operation | Oas2Operation, { location }: UserContext) {
          operationContext = createOperationContext(location);
        },
        leave(operation: Oas3Operation | Oas2Operation, { report, location }: UserContext) {
          const context = operationContext || createOperationContext(location);

          if (operation?.parameters) {
            for (const param of operation.parameters) {
              if (param && typeof param === 'object' && 'in' in param && 'name' in param) {
                const pathParam = param as { in?: string; name?: string };
                if (pathParam.in === 'path' && pathParam.name) {
                  context.definedOperationParams.add(pathParam.name);
                }
              }
            }
          }

          const allDefinedParams = new Set([
            ...context.definedOperationParams,
            ...context.definedParams,
            ...definedPathParams,
          ]);

          for (const templateParam of context.templateParams) {
            if (!allDefinedParams.has(templateParam)) {
              report({
                message: `The operation does not define the path parameter \`{${templateParam}}\` expected by path \`${context.path}\`.`,
                location: location.child(['parameters']).key(),
              });
            }
          }
          operationContext = null;
        },
        Parameter(parameter: Oas2Parameter | Oas3Parameter, { report, location }: UserContext) {
          if (parameter.in === 'path' && parameter.name) {
            const context = operationContext || createOperationContext(location);
            context.definedOperationParams.add(parameter.name);

            if (!context.templateParams.has(parameter.name)) {
              report({
                message: `Path parameter \`${parameter.name}\` is not used in the path \`${context.path}\`.`,
                location: location.child(['name']),
              });
            }
          }
        },
      },
    },
  };
};
