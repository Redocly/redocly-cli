import fs from 'fs';

const RULES_PATH = './rules/';

export const loadRules = () => {
    const rules = [];
    const files = fs.readdirSync(RULES_PATH);
    files
        .filter(file => file !== 'generic.js')
        .forEach(file => {
            const fData = fs.readFileSync(RULES_PATH + file, 'utf-8');
            const Rule = eval(fData);
            const ruleInstance = new Rule();
            rules.push(ruleInstance);
        });
    return rules;
};

export const runRules = (node, context, rules) => {
    const nodeErrors = [];
    console.log(context.currentPath);
    rules
        .filter(rule => context.currentPath.match(new RegExp(rule.getPathPattern())))
        .forEach(rule => {
            const errors = rule.validate(node, context);
            if (errors) nodeErrors.push(...errors);
        });
    return nodeErrors;
};