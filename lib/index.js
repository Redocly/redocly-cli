import yaml from 'yaml';
import fs from 'fs';

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
            return (title) => {
                if (!title) return {msg: 'Info section must include title'};
            }
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
            return (name) => {
                if (!name) return {msg: 'Name is required for the license object'};
            }
        },
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
            return (operation) => operation ? null : {msg: 'Operation must include responses section'}
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
            return (desc) => !desc ? {msg: 'Description is required part of a Response definition.'} : null;
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
            return (oSchema) => {
                return !oSchema ? {msg: 'MediaType Object must include schema'} : null
            }; 
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
            return (type) => !type ? {msg: 'Type is required for a schema object'} : null;
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
    const ctx = { document: node, path: [] };
    // console.log(node.components.schemas.user);
    _traverse(node, definition, ctx);
};


const _traverse = (node, definition, ctx) => {
    console.log(`Current path: ${ctx.path.join('/')}`);
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
            validationResult = definition.validators[v]()(node[v]);
            if (validationResult) console.log(validationResult);
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
