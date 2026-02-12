import type { Oas3Rule } from '../../visitors.js';
import type { Location } from '../../ref-utils.js';
import type { Oas3Parameter, Referenced } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

type QueryState = {
  queryLocation?: Location;
  querystringLocation?: Location;
};

function countQuerystring(parameters: ReadonlyArray<Referenced<Oas3Parameter>>): number {
  return parameters.filter((p) => !('$ref' in p) && p.in === 'querystring').length;
}

const QUERYSTRING_ONCE_MESSAGE =
  'Parameters with `in: querystring` should be defined only once per path/operation parameter set (OpenAPI 3.2).';

function reportIfMultipleQuerystring(querystringCount: number, ctx: UserContext) {
  const parametersLocation = ctx.location.child('parameters');
  if (querystringCount > 1) {
    ctx.report({ message: QUERYSTRING_ONCE_MESSAGE, location: parametersLocation });
  }
}

function checkMixedUsage(
  parameter: Oas3Parameter,
  parameterLocation: Location,
  state: QueryState,
  ctx: UserContext
) {
  if (parameter.in === 'query') {
    if (state.querystringLocation) {
      ctx.report({
        message:
          'Parameters with `in: query` cannot be used together with `in: querystring` in the same operation/path parameter set (OpenAPI 3.2).',
        location: parameterLocation,
      });
    }
    state.queryLocation ??= parameterLocation;
    return;
  }

  if (parameter.in === 'querystring') {
    if (state.queryLocation) {
      ctx.report({
        message:
          'Parameters with `in: querystring` cannot be used together with `in: query` in the same operation/path parameter set (OpenAPI 3.2).',
        location: parameterLocation,
      });
    }
    state.querystringLocation ??= parameterLocation;
  }
}

export const SpecQuerystringParameters: Oas3Rule = () => {
  let pathState: QueryState = {};
  let operationState: QueryState = {};
  let pathQuerystringCount = 0;

  return {
    PathItem: {
      enter(pathItem, ctx: UserContext) {
        pathState = {};
        operationState = {};
        pathQuerystringCount = 0;

        reportIfMultipleQuerystring(countQuerystring(pathItem.parameters || []), ctx);
      },

      Parameter(parameter: Oas3Parameter, ctx: UserContext) {
        const location = ctx.parentLocations.PathItem.child(['parameters', ctx.key]);
        checkMixedUsage(parameter, location, pathState, ctx);
        if (parameter.in === 'querystring') {
          pathQuerystringCount += 1;
        }
      },

      Operation: {
        enter(operation, ctx: UserContext) {
          operationState = { ...pathState };

          const totalQuerystring =
            pathQuerystringCount + countQuerystring(operation.parameters || []);
          reportIfMultipleQuerystring(totalQuerystring, ctx);
        },

        Parameter(parameter: Oas3Parameter, ctx: UserContext) {
          const parameterLocation = ctx.parentLocations.Operation.child(['parameters', ctx.key]);
          checkMixedUsage(parameter, parameterLocation, operationState, ctx);
        },
      },
    },
  };
};
