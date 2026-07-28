import type { Document } from '../resolve.js';

export type CollectFn = (document: Partial<Document>) => void;

export type Exact<T extends object> = T & { [key: string]: undefined };
