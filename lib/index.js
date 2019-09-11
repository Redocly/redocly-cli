import yaml from 'yaml';
import fs from 'fs';
import { JSONPath } from 'jsonpath-plus';

const OpenAPIRoot = {
    validators: {

    },
    properties: {
        info() {
            return OpenAPIInfo;
        },
        // paths() {
        //     return OpenAPIPaths(obj.paths);
        // }
    },
    validate() {
        const errors = [];
        Object.keys(this.properties).forEach(p => errors.push(...this.properties[p]()));
        console.log(errors);
    }
};

const OpenAPIInfo = {
    validators: {
        title() {
            return (title) => {
                if (!title) return {msg: 'Info section must include title'};
            }
        },
        description() {
            return (desc) => {
                if (!desc) return {msg: 'Info section must include description'};
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
    properties () {
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
    properties: {
        responses() {},
        parameters() {},
        operationId() {},
        description() {},
        summary() {}
    }
};

const OpenAPIResponses = {
    properties() {

    }
}

const OpenAPIParameters = {};

const traverse = (node, definition) => {
    _traverse(node, definition, null);
};

const resolve = (node, definition, ctx) => {
    if (node.$ref) {
        console.log('aaaaaaaaaaaaaaaa');
    }
};

const _traverse = (node, definition, ctx) => {
    console.log('==========')
    
    if (node && definition && definition.validators) {        
        Object.keys(definition.validators).forEach(v => {
            let validationResult;
            validationResult = definition.validators[v]()(node[v]);
            if (validationResult) console.log(validationResult);
        });
    }
    if (definition && definition.properties) {
        Object.keys(definition.properties).forEach(p => {
            _traverse(node[p], definition.properties[p](), ctx);
        });
    }
};

export const validate = (yamlData) => {
    const document = yaml.parse(yamlData);

    // const resolver = OpenAPIRoot(document);
    // resolver.validate()

    traverse(document, OpenAPIRoot);

    return null;
}

export const validateFromFile = (fName) => {
    const doc = fs.readFileSync(fName, 'utf-8');
    const validationResult = validate(doc);
    return validationResult;
};
