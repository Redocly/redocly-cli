import createError from './../../error';

export const AuthorizationCodeOpenAPIFlow = {
    validators: {
        authorizationUrl() {
            return (node, ctx) => {
                if (!node.authorizationUrl) return createError('The authorizationUrl is required in the Open API Flow Object', node, ctx);
                if (typeof node.authorizationUrl !== 'string') return createError('The authorizationUrl must be a string in the Open API Flow Object', node, ctx);
            }
        },
        tokenUrl() {
            return (node, ctx) => {
                if (!node.tokenUrl) return createError('The tokenUrl is required in the Open API Flow Object', node, ctx);
                if (typeof node.tokenUrl !== 'string') return createError('The tokenUrl must be a string in the Open API Flow Object', node, ctx);
            }
        },
        refreshUrl() {
            return (node, ctx) => {
                if (node.refreshUrl && typeof node.refreshUrl !== 'string') return createError('The refreshUrl must be a string in the Open API Flow Object', node, ctx);
            };
        },
        scopes() {
            return (node, ctx) => {
                const wrongFormatMap = Object.keys(node.scopes)
                    .filter(scope => typeof scope !== 'string' || typeof node[scopes] !== 'string')
                    .length > 0;
                if (wrongFormatMap) return createError('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx);
            }
        }
    }
};