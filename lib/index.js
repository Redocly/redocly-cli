import yaml from 'yaml';
import fs from 'fs';

import { loadRules, runRules } from './rules';

const defaultContext = (doc) => ({ fullDocument: doc, currentPath: '#', resolvedPaths: {}, errors: [] })

const traverseNode = (node, context, rules) => {
    const currentPath = context.currentPath;
    
    const errors = runRules(node, context, rules);

    if (errors) context.errors.push(...errors);

    const nodeChildren = typeof node === 'object' ? Object.keys(node) : []; 
    for(const fieldId in nodeChildren) {
        context.currentPath =  `${currentPath}/${nodeChildren[fieldId]}`
        traverseNode(node[nodeChildren[fieldId]], context, rules);
    }
};

export const validate = (yamlData) => {
    const rules = loadRules();

    try {
        const doc = yaml.parse(yamlData);
        const context = defaultContext(doc);

        if (doc.errors) {
            console.log(doc.errors);
            return -1;
        }

        const result = traverseNode(doc, context, rules);
        console.log(context.errors);
    } catch (err) {
        console.log(err);
    }
    return null;
}

export const validateFromFile = (fName) => {
    const doc = fs.readFileSync(fName, 'utf-8');
    const validationResult = validate(doc);
    return validationResult;
};
