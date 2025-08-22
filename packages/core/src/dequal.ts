/**
 * Checks if two objects are deeply equal.
 * Borrowed the source code from https://github.com/lukeed/dequal.
 */
export function dequal(foo: any, bar: any): boolean {
  let ctor, len;
  if (foo === bar) return true;

  if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
    if (ctor === Date) return foo.getTime() === bar.getTime();
    if (ctor === RegExp) return foo.toString() === bar.toString();

    if (ctor === Array) {
      if ((len = foo.length) === bar.length) {
        while (len-- && dequal(foo[len], bar[len]));
      }
      return len === -1;
    }

    if (!ctor || typeof foo === 'object') {
      len = 0;
      for (ctor in foo) {
        if (
          Object.prototype.hasOwnProperty.call(foo, ctor) &&
          ++len &&
          !Object.prototype.hasOwnProperty.call(bar, ctor)
        )
          return false;
        if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor])) return false;
      }
      return Object.keys(bar).length === len;
    }
  }

  return foo !== foo && bar !== bar;
}
