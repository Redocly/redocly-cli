import type { Oas3Rule } from '../../visitors.js';
import type { Location } from '../../ref-utils.js';
import type { Oas3Parameter, Referenced } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const SpecQuerystringParameters: Oas3Rule = () => {
  let pathQueryLocation: Location | undefined;
  let pathQueryStringLocation: Location | undefined;

  let operationQueryLocation: Location | undefined;
  let operationQueryStringLocation: Location | undefined;

  function checkParameter(parameter: Oas3Parameter, parameterLocation: Location, ctx: UserContext) {
    if (parameter.in === 'query') {
      if (operationQueryStringLocation) {
        ctx.report({
          message:
            'Parameters with `in: query` cannot be used together with `in: querystring` in the same operation/path parameter set (OpenAPI 3.2).',
          location: parameterLocation,
        });
      }
      operationQueryLocation ??= parameterLocation;
      return;
    }

    if (parameter.in === 'querystring') {
      if (operationQueryLocation) {
        ctx.report({
          message:
            'Parameters with `in: querystring` cannot be used together with `in: query` in the same operation/path parameter set (OpenAPI 3.2).',
          location: parameterLocation,
        });
      }
      operationQueryStringLocation ??= parameterLocation;
    }
  }

  function checkQuerystringParameters(
    parameters: ReadonlyArray<Referenced<Oas3Parameter>>,
    ctx: UserContext
  ) {
    const parametersLocation = ctx.location.child('parameters');
    const querystringParameters = parameters.filter(
      (p) => !('$ref' in p) && p.in === 'querystring'
    );
    if (querystringParameters.length > 1) {
      ctx.report({
        message: `Parameters with \`in: querystring\` should be defined only once per path/operation parameter set (OpenAPI 3.2).`,
        location: parametersLocation,
      });
    }
  }

  return {
    PathItem: {
      enter(pathItem, ctx: UserContext) {
        pathQueryLocation = undefined;
        pathQueryStringLocation = undefined;
        operationQueryLocation = undefined;
        operationQueryStringLocation = undefined;

        checkQuerystringParameters(pathItem.parameters || [], ctx);
      },
      Parameter(parameter: Oas3Parameter, ctx: UserContext) {
        operationQueryLocation = pathQueryLocation;
        operationQueryStringLocation = pathQueryStringLocation;

        const parameterLocation = ctx.parentLocations.PathItem.child(['parameters', ctx.key]);

        checkParameter(parameter, parameterLocation, ctx);

        pathQueryLocation = operationQueryLocation;
        pathQueryStringLocation = operationQueryStringLocation;
      },
      Operation: {
        enter(operation, ctx: UserContext) {
          operationQueryLocation = pathQueryLocation;
          operationQueryStringLocation = pathQueryStringLocation;

          checkQuerystringParameters(operation.parameters || [], ctx);
        },
        Parameter(parameter: Oas3Parameter, ctx: UserContext) {
          const parameterLocation = ctx.parentLocations.Operation.child(['parameters', ctx.key]);
          checkParameter(parameter, parameterLocation, ctx);
        },
      },
    },
  };
};
