export type CollectFn = (value: unknown) => void;
export type Exact<T extends object> = T & { [key: string]: undefined };
