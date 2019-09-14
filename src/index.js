import yaml from 'yaml';
import fs from 'fs';

import OpenAPIRoot from './validators';

const resolveNode = (node, ctx) => {
    if (!node || typeof node !== 'object') return { node, nextPath: null };
    let nextPath;
    Object.keys(node).forEach(p => {
        if (p === '$ref') { 
            nextPath = node.$ref;
            node = resolve(node[p], ctx);
        }
    });
    return {node, nextPath: nextPath};
};

const resolve = (link, ctx) => {
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

    // TO-DO: refactor ctx.visited into dictionary for O(1) check time
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
