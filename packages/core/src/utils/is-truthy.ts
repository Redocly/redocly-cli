export type Falsy = undefined | null | false | '' | 0;

export function isTruthy<Truthy>(value: Truthy | Falsy): value is Truthy {
  return !!value;
}
