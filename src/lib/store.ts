import { useSyncExternalStore } from 'react';

/** A small shared value that React screens can watch. */
export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      const v = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      if (Object.is(v, value)) return;
      value = v;
      listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

/** Watches a store (or one part of it) from a component. */
export function useStore<T, S = T>(store: Store<T>, select?: (v: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => (select ? select(store.get()) : (store.get() as unknown as S)));
}
