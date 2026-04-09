import {
  ASYNCAPI2_SPLITTABLE_COMPONENT_NAMES,
  ASYNCAPI3_SPLITTABLE_COMPONENT_NAMES,
} from './constants.js';

export function findAsyncApiComponentTypes(
  components: Record<string, unknown>,
  specVersion: 'async2' | 'async3'
) {
  const componentNames =
    specVersion === 'async2'
      ? ASYNCAPI2_SPLITTABLE_COMPONENT_NAMES
      : ASYNCAPI3_SPLITTABLE_COMPONENT_NAMES;

  return componentNames.filter((item) => item in components);
}
