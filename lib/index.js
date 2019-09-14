import yaml from 'yaml';
import fs from 'fs';

import createError from './error';

const OpenAPIRoot = {
    validators: {
    },
    properties: {
        info() {
            return OpenAPIInfo;
        },
        paths() {
            return OpenAPIPaths;
        },
        servers() {},
        components() {},
        security() {},
        tags() {},
        externalDocs() {},
    },
};

const OpenAPIInfo = {
    validators: {
        title() {
            return (title, ctx) => !title ? createError('Info section must include title', title, ctx) : null;
        },
    },
    properties: {
        license () {
            return OpenAPILicense;
        }
    }
};

const OpenAPILicense = {
    validators: {
        name() {
            return (name, ctx) => !name ? createError('Name is required for the license object', name, ctx) : null;
        }
    },
};

const OpenAPIPaths = {
    properties (node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIPath);
        return props;
    }
}

const OpenAPIPath = {
    properties: {
        summary() {},
        description() {},
        get() {
            return OpenAPIOperation;
        },
        post() {
            return OpenAPIOperation;
        },
        put() {
            return OpenAPIOperation;
        },
        delete() {
            return OpenAPIOperation;
        },
        parameters() {
            return OpenAPIOperation;
        }
    }
}

const OpenAPIOperation = {
    validators: {
        responses() {
            return (operation, ctx) => !operation ? createError('Operation must include responses section', operation, ctx) : null;
        }
    },
    properties: {
        responses() {
            return OpenAPIResponses;
        },
        parameters() {},
        operationId() {},
        description() {},
        summary() {}
    }
};

const OpenAPIResponses = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIResponse);
        return props;
    }
}

const OpenAPIResponse = {
    validators: {
        description() {
            return (desc, ctx) => !desc ? createError('Description is required part of a Response definition.', desc, ctx) : null;
        }
    },
    properties: {
        content() {
            return OpenAPIMediaTypeObject;
        }
    }
};

const OpenAPIMediaTypeObject = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIMediaObject);
        return props;
    }
};

const OpenAPIMediaObject = {
    validators: {
        schema() {
            return (oSchema) =>  !oSchema ? createError('MediaType Object must include schema', oSchema, ctx) : null;
        }
    },
    properties: {
        schema() {
            return OpenAPISchemaObject;
        }
    }
};

const OpenAPISchemaObject = {
    validators: {
        type() {
            return (type) => !type ? createError('Schema Object must include type', type, ctx) : null;
        }
    },
    properties: {
        allOf() {
            return OpenAPISchemaObject;
        }
    }
};

const OpenAPIParameters = {

};

const OpenAPIComponents = {
    properties: {
        schemas() {},
        responses() {},
        parameters() {},
        examples() {},
        requestBodies() {},
        headers() {},
        securitySchemes() {},
        links() {},
        callbacks() {},
    }
};

const resolveNode = (node, ctx) => {
    if (!node || typeof node !== 'object') return { node, nextPath: null };
    let nextPath;
    Object.keys(node).forEach(p => {
        if (p === '$ref') { 
            nextPath = node.$ref;
            node = resolve(node, node[p], ctx);
        }
    });
    return {node, nextPath: nextPath};
};

const resolve = (node, link, ctx) => {
    const steps = link.replace('#/', '').split('/');
    let target = ctx.document;
    for(const step in steps) {
        target = target[steps[step]];
    }
    return target;
};

const traverse = (node, definition) => {
    const ctx = { document: node, path: [], visited: [], result: [] };
    _traverse(node, definition, ctx);
    console.log(ctx.result);
};


const _traverse = (node, definition, ctx) => {
    const currentPath = ctx.path.join('/');

    if (ctx.visited.includes(currentPath)) return;
    ctx.visited.push(currentPath);

    console.log(`Current path: ${currentPath}`);
    
    let nextPath, prevPath;
    ({node, nextPath: nextPath} = resolveNode(node, ctx));
    if (nextPath) {
        prevPath = ctx.path;
        ctx.path = nextPath.replace('#/', '').split('/');
    }

    if (node && Array.isArray(node)) {
        node.forEach((nodeChild, i) => 
        {
            ctx.path.push(i);
            _traverse(nodeChild, definition, ctx);
            ctx.path.pop();
        });
        if (nextPath) ctx.path = prevPath;
        return;
    }

    if (node && definition && definition.validators) {   
        Object.keys(definition.validators).forEach(v => {
            let validationResult;
            validationResult = definition.validators[v]()(node[v], ctx);
            if (validationResult) ctx.result.push(validationResult);
        });
    }

    if (node && definition && definition.properties) {
        switch (typeof definition.properties) {
            case 'function':
                const nodePossibleChildren = definition.properties(node);
                Object.keys(nodePossibleChildren).forEach(child => {
                    if (Object.keys(node).includes(child)) {
                        ctx.path.push(child);
                        if (node[child]) _traverse(node[child], nodePossibleChildren[child], ctx);
                        ctx.path.pop();
                    }
                });
                break;
            case 'object':
                Object.keys(definition.properties).forEach(p => {
                    ctx.path.push(p);
                    if (node[p]) _traverse(node[p], definition.properties[p](), ctx);
                    ctx.path.pop();
                });
                break;
        }
    }
    if (nextPath) ctx.path = prevPath;
};

export const validate = (yamlData) => {
    const document = yaml.parse(yamlData);
    traverse(document, OpenAPIRoot);
    return null;
}

export const validateFromFile = (fName) => {
    const doc = fs.readFileSync(fName, 'utf-8');
    const validationResult = validate(doc);
    return validationResult;
};
