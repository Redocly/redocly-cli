import { OpenAPIPathItem } from "./OpenAPIPaths";

export const OpenAPICallbackMap = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPICallback);
        return props;
    }
};

export const OpenAPICallback = {
    properties(node) {
        const props = {};
        Object.keys(node).forEach(k => props[k] = OpenAPIPathItem);
        return props;
    }
}