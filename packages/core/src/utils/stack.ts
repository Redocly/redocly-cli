export type StackFrame<T> = {
  prev: StackFrame<T> | null;
  value: T;
};
export type Stack<T> = StackFrame<T> | null;
export type StackNonEmpty<T> = StackFrame<T>;

export function pushStack<T, P extends Stack<T> = Stack<T>>(head: P, value: T) {
  return { prev: head, value };
}

export function popStack<T, P extends Stack<T>>(head: P) {
  return head?.prev ?? null;
}
