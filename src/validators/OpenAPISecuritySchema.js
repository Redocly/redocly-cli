import createError from './../error';

export const OpenAPISecuritySchema = {
    validators: {
        type() {
            return (node, ctx) => {
                if (!node.type) return createError('The type field is required for the OpenAPI Security Scheme object', node, ctx);
                if (typeof node.type !== 'string') return createError('The type field must be a string for the OpenAPI Security Scheme object', node, ctx);
                if (!["apiKey", "http", "oauth2", "openIdConnect"].includes(node.type)) return createError('The type value can only be one of the following "apiKey", "http", "oauth2", "openIdConnect" is required for the OpenAPI Security Scheme object', node, ctx);
            }
        },
        description() {
            return (node, ctx) => {
                if (node.description && typeof node.description !== 'string') return createError('The description field must be a string for the OpenAPI Security Scheme object', node, ctx);
            }
        },
        name() {
            return (node, ctx) => {
                if (node.type !== 'apiKey') return;
                if (typeof node.name !== 'string') return createError('The name field must be a string for the OpenAPI Security Scheme object', node, ctx);
            }
        },
        in() {
            return (node, ctx) => {
                if (node.type !== 'apiKey') return;
                if (!node.in) return createError('The in field is required for the OpenAPI Security Scheme object', node, ctx);
                if (typeof node.in !== 'string') return createError('The in field must be a string for the OpenAPI Security Scheme object', node, ctx);
                if (!["query", "header", "cookie"].includes(node.in)) return createError('The in value can only be one of the following "query", "header" or "cookie" for the OpenAPI Security Scheme object', node, ctx);
            }
        },
        scheme() {
            return (node, ctx) => {
                if (node.type !== 'http') return;
                if (!node.scheme) return createError('The scheme field is required for the OpenAPI Security Scheme object', node, ctx);
                if (typeof node.scheme !== 'string') return createError('The scheme field must be a string for the OpenAPI Security Scheme object', node, ctx);
            }
        },
        bearerFormat() {
            return (node, ctx) => {
                if (node.type !== 'http') return;
                if (!node.bearerFormat) return createError('The bearerFormat field is required for the OpenAPI Security Scheme object', node, ctx);
                if (typeof node.scheme !== 'string') return createError('The bearerFormat field must be a string for the OpenAPI Security Scheme object', node, ctx);
            };
        },
        flows() {
            return (node, ctx) => {
                if (node.type !== 'oauth2') return;
                if (!node.flows) return createError('The flows field is required for the Open API Security Scheme object', node, ctx);
            };
        },
        openIdConnectUrl() {
            return (node, ctx) => {
                if (node.type !== 'openIdConnect') return;
                if (!node.openIdConnectUrl) return createError('The openIdConnectUrl field is required for the OpenAPI Security Scheme object', node, ctx);
                if (typeof node.openIdConnectUrl !== 'string') return createError('The openIdConnectUrl field must be a string for the OpenAPI Security Scheme object', node, ctx);
            };
        }
    },
    properties: {
        flows() {
            return OpenAPIFlows;
        }
    }
};

const OpenAPIFlows = {
    properties: {
        implicit() {
            return ImplicitOpenAPIFlow;
        },
        password() {
            return PasswordOpenAPIFlow;
        },
        clientCredentials() {
            return ClientCredentialsOpenAPIFlow;
        },
        authorizationCode() {
            return AuthorizationCodeOpenAPIFlow;
        }
    }
};

const ImplicitOpenAPIFlow = {
    validators: {
        authorizationUrl() {
            return (node, ctx) => {
                if (!node.authorizationUrl) return createError('The authorizationUrl is required in the Open API Flow Object', node, ctx);
                if (typeof node.authorizationUrl !== 'string') return createError('The authorizationUrl must be a string in the Open API Flow Object', node, ctx);
            }
        },
        refreshUrl() {
            return (node, ctx) => {
                if (node.refreshUrl && typeof node.refreshUrl !== 'string') return createError('The refreshUrl must be a string in the Open API Flow Object', node, ctx);
            };
        },
        scopes() {
            return (node, ctx) => {
                if (!node.scopes) return createError('The scopes field is required for the OpenAPI Flow Object', node, ctx);
                const wrongFormatMap = Object.keys(node.scopes)
                    .filter(scope => typeof scope !== 'string' || typeof node[scopes] !== 'string')
                    .length > 0;
                if (wrongFormatMap) return createError('The scopes field must be a Map[string, string] in the Open API Flow Object', node, ctx);
            }
        }
    }
};

const PasswordOpenAPIFlow = {
    validators: {
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

const ClientCredentialsOpenAPIFlow = {
    validators: {
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

const AuthorizationCodeOpenAPIFlow = {
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

export const OpenAPISecuritySchemaMap = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPISecuritySchema);
        return props;
    }
};