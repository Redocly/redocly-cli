import type { Oas3Components, Oas3_1Components, Oas3_2Components } from '../typings/openapi';

export function hasComponent<
  C extends Oas3Components | Oas3_1Components | Oas3_2Components,
  K extends PropertyKey
>(components: C, key: K): key is K & keyof C {
  return key in components;
}
