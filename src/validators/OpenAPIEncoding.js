import { OpenAPIHeaderMap } from "./OpenAPIHeader";
import createError from "../error";

export const OpenAPIEncoding = {
    validators: {
        contentType () {
            return (node, ctx) => {
                if (node && node.contentType && typeof node.contentType !== 'string') {
                    return createError('The contentType field must be a string', node, ctx);
                }
            }
        },
        style() {
            return (node, ctx) => {
                if (node && node.style && typeof node.style !== 'string') {
                    return createError('The style field must be a string', node, ctx);
                }
            }
        },
        explode() {
            return (node, ctx) => {
                if (node && node.explode && typeof node.explode !== 'boolean') {
                    return createError('The explode field must be a boolean', node, ctx);
                }
            }
        },
        allowReserved() {
            return (node, ctx) => {
                if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') {
                    return createError('The allowReserved field must be a boolean', node, ctx);
                }
            }
        }
    },
    properties: {
        headers () {
            return OpenAPIHeaderMap;
        }
    }
};