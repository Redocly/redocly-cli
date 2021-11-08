import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';

const DEFAUTL_HIDDEN_TAG = 'x-internal';

export const HideInternals: Oas3Rule | Oas2Rule = (opts) => {
  const { hiddenTag } = opts || { hiddenTag: DEFAUTL_HIDDEN_TAG }
  return {
    PathItem: {
      leave(pathItem: any, ctx: UserContext) {
        // delete if the path itself is marked with x-internal
        if (pathItem[hiddenTag]) {
          delete ctx.parent[ctx.key];
        }

        // delete any operations inside of a path marked with x-internal
        const operations = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
        for (const operation of operations) {
          if (pathItem[operation] && pathItem[operation][hiddenTag]) {
            delete pathItem[operation];
          }
        }

        // delete the path if there are no operations remaining in it
        if (Object.keys(pathItem).length === 0) {
          delete ctx.parent[ctx.key];
        }
      }
    },
    SchemaProperties: {
      leave(properties: Record<string, any>, ctx: UserContext) {
        for (const propertyName of Object.keys(properties)) {
          if (properties[propertyName][hiddenTag]) {
            delete properties[propertyName];
          }
        }

        // TODO: Check this code
        if (Object.keys(properties).length === 0) {
          delete ctx.parent[ctx.key];
        }
      }
    },
    Parameter: {
      leave(parameter: any, ctx: UserContext) {
        if (parameter[hiddenTag]) {
          ctx.parent.splice(ctx.key, 1)
        }
      }
      // Do not delete operation if there are no parameters
    },
    Response: {
      leave(response: any, ctx: UserContext) {
        if(response[hiddenTag]) {
          delete ctx.parent[ctx.key]
        }
      }
    },
    Examples: {
      leave(example: any, ctx: UserContext) {
        if (example[hiddenTag]) {
          delete ctx.parent[ctx.key]
        }
      }
    },
    MediaType: {
      leave(mediaType: any, ctx: UserContext) {
        if (mediaType[hiddenTag]) {
          delete ctx.parent[ctx.key]
        }
      }
    },
    Server: {
      leave(server: any, ctx: UserContext) {
        if (server[hiddenTag]) {
          ctx.parent.splice(ctx.key, 1)
        }
      }
    },
    Link: {
      leave(link: any, ctx: UserContext) {
        if (link[hiddenTag]) {
          delete ctx.parent[ctx.key]
        }
      }
    },
    Callback: {
      leave(callback: any, ctx: UserContext) {
        if (callback[hiddenTag]) {
          delete ctx.parent[ctx.key]
        }
      }
    }
  }
};
