import { rules as genericRules } from '../generic-rules';
import { UserContext, ProblemSeverity } from '../../walk';
import { Oas2Rule, Oas3Rule } from '../../visitors';

type Rule = {
  name: string,
  conditions: any,
  description: string,
  severity: ProblemSeverity
}

const formRule = (lastNodeName: string, propsToRules:  {[key: string]: Array<Rule>}) => {
  return {
    [lastNodeName]: function(node: any, { report, location }: UserContext) {
      for (let prop in propsToRules) {
        propsToRules[prop].forEach((rule: Rule) => {
          const value = prop === '__all' ? node : node[prop];
          const lintResult = (genericRules as {[key: string]: any})[rule.name](value, rule.conditions);
          if (!lintResult) {
            report({
              message: rule.description,
              location: prop === '__all' ? location.key() : location.child(prop).key(),
              forceSeverity: rule.severity
            });
          }
        });
      }
    }
  }
}

export const Enforcements:  Oas3Rule | Oas2Rule = (opts: any) => {
  let visitors = {};
  let rulesMap: {[key: string]: any} = {};

  for (let key in opts) {
    const enforcement = opts[key];

    if (enforcement.on) {
      const onProps: Array<string> = Array.isArray(enforcement.on) ? enforcement.on : [enforcement.on];
      const rulesToApply: Array<Rule> = Object.keys(genericRules).filter((rule: string) => enforcement[rule] !== undefined)
        .map((rule: string) => ({
          name: rule,
          conditions: enforcement[rule],
          description: enforcement.description,
          severity: enforcement.severity || 'error'
        }));
      const hasMutuallyRule = !!(enforcement.mutuallyExclusive || enforcement.mutuallyRequired);
       // form rule for each property:
      onProps.forEach((onProp: string) => {
        const parts = onProp.split('.');
        if (parts.length === 1 && !hasMutuallyRule) return; // property should have parent node

        const lastProp: string = hasMutuallyRule ? '__all' : parts.pop() as string; // property on which we will do the lint
        const key = parts.join('.');
        if (!rulesMap[key]) {
          rulesMap[key] = {};
        }
        rulesMap[key][lastProp] = rulesToApply;
      });
    }
  }

  for (let path in rulesMap) {
    let visitor = {};
    const pathParts = path.split('.');
    const lastNode = pathParts.pop() as string;
    if (pathParts.length) {
      visitor = pathParts.reverse().reduce((res, key, index) => {
        if (index === 0) {
          res = formRule(lastNode, rulesMap[path]);
        }
        return {[key]: res}
      }, {});
    } else {
      visitor = formRule(lastNode, rulesMap[path]);
    }

    visitors = {
      ...visitors,
      ...visitor
    }
  }
  return visitors;
};
