export interface InfoObject {
  title: string;
  version: string;
  description?: string;
}

export interface ActionObject {
  target: string;
  description?: string;
  update?: unknown;
  copy?: string;
  remove?: boolean;
}

export interface ReusableActionObject {
  description?: string;
  fields?: Omit<ActionObject, 'target'>;
}

export interface ReusableActionReferenceObject {
  $ref: string;
  target: string;
  description?: string;
}

export interface Overlay1Definition {
  overlay: '1.0.0' | '1.1.0' | '1.2.0';
  $self?: string;
  info: InfoObject;
  extends?: string;
  actions: (ActionObject | ReusableActionReferenceObject)[];
  components?: { actions?: Record<string, ReusableActionObject> };
}

export const VERSION_PATTERN = /^1\.[012]\.\d+(-.+)?$/;
