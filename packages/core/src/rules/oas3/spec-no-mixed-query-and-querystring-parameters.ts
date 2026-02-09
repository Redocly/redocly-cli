import type { Oas3Rule } from '../../visitors.js';
import type { Location } from '../../ref-utils.js';
import type { Oas3Parameter } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const SpecNoMixedQueryAndQuerystringParameters: Oas3Rule = () => {
  let isOas3_2 = false;
  let pathQueryLocation: Location | undefined;
  let pathQueryStringLocation: Location | undefined;

  let operationQueryLocation: Location | undefined;
  let operationQueryStringLocation: Location | undefined;

  function checkParameter(parameter: Oas3Parameter, parameterLocation: Location, ctx: UserContext) {
    if (!isOas3_2) return;

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

  return {
    PathItem: {
      enter(_pathItem, ctx: UserContext) {
        isOas3_2 = ctx.specVersion === 'oas3_2';
        pathQueryLocation = undefined;
        pathQueryStringLocation = undefined;
        operationQueryLocation = undefined;
        operationQueryStringLocation = undefined;
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
        enter() {
          operationQueryLocation = pathQueryLocation;
          operationQueryStringLocation = pathQueryStringLocation;
        },
        Parameter(parameter: Oas3Parameter, ctx: UserContext) {
          const parameterLocation = ctx.parentLocations.Operation.child(['parameters', ctx.key]);
          checkParameter(parameter, parameterLocation, ctx);
        },
      },
    },
  };
};
