import type { Operation } from "fast-json-patch";

export type InstanceState<T> = {
  getData(instance: object): T;
  setData(instance: object, data: T): void;
  getOperations(instance: object): Operation[];
  initOperations(instance: object): void;
};

export function createInstanceState<T>(): InstanceState<T> {
  const instanceData = new WeakMap<object, T>();
  const instanceOperations = new WeakMap<object, Operation[]>();

  return {
    getData(instance: object): T {
      return instanceData.get(instance) as T;
    },

    setData(instance: object, data: T): void {
      instanceData.set(instance, data);
    },

    getOperations(instance: object): Operation[] {
      let operations = instanceOperations.get(instance);
      if (!operations) {
        operations = [];
        instanceOperations.set(instance, operations);
      }
      return operations;
    },

    initOperations(instance: object): void {
      instanceOperations.set(instance, []);
    },
  };
}
