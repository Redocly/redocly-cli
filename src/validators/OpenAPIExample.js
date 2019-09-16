import createError from './../error';

export const OpenAPIExample = {
    validators: {
        value() {
            return (node, ctx) => {
                if (node.value && node.externalValue) {
                    return createError('The value field and externalValue field are mutually exclusive.')
                }
            }
        },
        externalValue() {
            return (node, ctx) => {
                if (node.externalValue && typeof node.externalValue !== 'string') {
                    return createError('The externalValue field must be a string');
                }
                if (node.value && node.externalValue) {
                    return createError('The value field and externalValue field are mutually exclusive.')
                }
            }
        },
        description() {
            return (node, ctx) => {
                if (node.description && typeof node.description !== 'string') {
                    return createError('The description field must be a string');
                }
            }
        },
        summary() {
            return (node, ctx) => {
                if (node.summary && typeof node.summary !== 'string') {
                    return createError('The summary field must be a string');
                }
            }
        }
    }
};

export const OpenAPIExampleMap = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIExample);
        return props;
    }
}