import { Problem, UserContext } from '../../walk';
import { Oas2Rule, Oas3Rule, Oas3Visitor } from '../../visitors';
import {
  Oas3Definition,
  Oas3Parameter,
  Oas3RequestBody,
  Oas3Response,
  Oas3Schema,
  OasRef,
} from '../../typings/openapi';
import { Oas2Definition } from '../../typings/swagger';

const TYPE_NAME_SCHEMA = 'Schema';
const TYPE_NAME_PARAMETER = 'Parameter';
const TYPE_NAME_RESPONSE = 'Response';
const TYPE_NAME_REQUEST_BODY = 'RequestBody';

const TYPE_NAME_TO_OPTION_NAME: { [key: string]: string } = {
  [TYPE_NAME_SCHEMA]: 'schema',
  [TYPE_NAME_PARAMETER]: 'parameter',
  [TYPE_NAME_RESPONSE]: 'response',
  [TYPE_NAME_REQUEST_BODY]: 'requestBody',
};

export const ComponentNameUnique: Oas3Rule | Oas2Rule = (options) => {
  const components = new Map<string, Set<string>>();

  const typeNames: string[] = [];
  if (options.schema !== 'off') {
    typeNames.push(TYPE_NAME_SCHEMA);
  }
  if (options.parameter !== 'off') {
    typeNames.push(TYPE_NAME_PARAMETER);
  }
  if (options.response !== 'off') {
    typeNames.push(TYPE_NAME_RESPONSE);
  }
  if (options.requestBody !== 'off') {
    typeNames.push(TYPE_NAME_REQUEST_BODY);
  }

  function getOptionNameForTypeName(typeName: string): string | null {
    return TYPE_NAME_TO_OPTION_NAME[typeName] ?? null;
  }

  function getComponentNameFromAbsoluteLocation(absoluteLocation: string): string {
    const componentName = absoluteLocation.split('/').slice(-1)[0];
    if (
      componentName.endsWith('.yml') ||
      componentName.endsWith('.yaml') ||
      componentName.endsWith('.json')
    ) {
      return componentName.slice(0, componentName.lastIndexOf('.'));
    }
    return componentName;
  }

  function addFoundComponent(
    typeName: string,
    componentName: string,
    absoluteLocation: string
  ): void {
    const key = getKeyForComponent(typeName, componentName);
    const locations = components.get(key) ?? new Set();
    locations.add(absoluteLocation);
    components.set(key, locations);
  }

  function getKeyForComponent(typeName: string, componentName: string): string {
    return `${typeName}/${componentName}`;
  }
  function getComponentFromKey(key: string): { typeName: string; componentName: string } {
    const [typeName, componentName] = key.split('/');
    return { typeName, componentName };
  }

  function addComponentFromAbsoluteLocation(typeName: string, absoluteLocation: string): void {
    const componentName = getComponentNameFromAbsoluteLocation(absoluteLocation);
    addFoundComponent(typeName, componentName, absoluteLocation);
  }

  const rule: Oas3Visitor = {
    ref: {
      leave(ref: OasRef, { type, resolve }: UserContext) {
        const typeName = type.name;
        if (typeNames.includes(typeName)) {
          const resolvedRef = resolve(ref);
          if (!resolvedRef.location) return;

          addComponentFromAbsoluteLocation(
            typeName,
            resolvedRef.location.absolutePointer.toString()
          );
        }
      },
    },
    Root: {
      leave(root: Oas3Definition | Oas2Definition, ctx: UserContext) {
        components.forEach((value, key, _) => {
          if (value.size > 1) {
            const component = getComponentFromKey(key);
            const definitions = Array.from(value)
              .map((v) => `- ${v}`)
              .join('\n');

            const problem: Problem = {
              message: `${component.typeName} '${component.componentName}' is not unique. It is defined at:\n${definitions}`,
            };

            const openName = getOptionNameForTypeName(component.typeName);
            const componentSeverity = openName ? options[openName] : null;
            if (componentSeverity) {
              problem.forceSeverity = componentSeverity;
            }
            ctx.report(problem);
          }
        });
      },
    },
  };

  function isTypeEnabled(typeName: string): boolean {
    const optionName = getOptionNameForTypeName(typeName);
    if (!optionName) {
      return false;
    }

    return options[optionName] ? options[optionName] !== 'off' : options.severity !== 'off';
  }

  if (isTypeEnabled(TYPE_NAME_SCHEMA)) {
    rule.NamedSchemas = {
      Schema(_: Oas3Schema, { location }: UserContext) {
        addComponentFromAbsoluteLocation(TYPE_NAME_SCHEMA, location.absolutePointer.toString());
      },
    };
  }

  if (isTypeEnabled(TYPE_NAME_RESPONSE)) {
    rule.NamedResponses = {
      Response(_: Oas3Response, { location }: UserContext) {
        addComponentFromAbsoluteLocation(TYPE_NAME_RESPONSE, location.absolutePointer.toString());
      },
    };
  }

  if (isTypeEnabled(TYPE_NAME_PARAMETER)) {
    rule.NamedParameters = {
      Parameter(_: Oas3Parameter, { location }: UserContext) {
        addComponentFromAbsoluteLocation(TYPE_NAME_PARAMETER, location.absolutePointer.toString());
      },
    };
  }

  if (isTypeEnabled(TYPE_NAME_REQUEST_BODY)) {
    rule.NamedRequestBodies = {
      RequestBody(_: Oas3RequestBody, { location }: UserContext) {
        addComponentFromAbsoluteLocation(
          TYPE_NAME_REQUEST_BODY,
          location.absolutePointer.toString()
        );
      },
    };
  }

  return rule;
};
