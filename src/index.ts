/** @format */

import { Atom, atom } from "jotai";
import {
  AtomEnhancer,
  ComposableAtom,
  DispatcherAction,
  InferParameter,
  InferState,
} from "./types";

export function isAtom<T>(value: unknown): value is Atom<T> {
  return typeof value === "object" && value !== null && "read" in value;
}

export type {
  AtomEnhancer,
  ComposableAtom,
  DispatcherAction,
  InferParameter,
  InferState,
};

export const enhanceWith =
  <
    TLastState extends object,
    TParameterExtended extends object = never,
    TResult extends object = never,
  >({
    read = () => ({}) as TResult,
    write = () => ({ shouldAbortNextSetter: false }),
  }: AtomEnhancer<TLastState, TParameterExtended, TResult>) =>
  <TState extends TLastState, TParameter extends object = never>(
    lastAtom?: ComposableAtom<TState, TParameter>,
  ) => {
    const newAtom = atom(
      (get) => {
        const last = lastAtom ? get(lastAtom) : ({} as TLastState & TState);

        const possibleAtom = read({
          last,
        });
        let notAtom;
        if (isAtom(possibleAtom)) {
          notAtom = get(possibleAtom);
        } else {
          notAtom = possibleAtom;
        }
        return {
          ...last,
          ...notAtom,
        };
      },
      (get, set, update: TParameterExtended | TParameter) => {
        const last = lastAtom ? get(lastAtom) : ({} as TLastState & TState);
        const { shouldAbortNextSetter } =
          write({
            stateHelper: {
              last,
              get,
              set,
            },
            update: update as TParameterExtended,
          }) || {};
        if (!shouldAbortNextSetter) {
          if (lastAtom) {
            set(lastAtom, update as TParameter);
          }
        }
      },
    );
    return newAtom;
  };

export const ignoreSetterAtom = <T extends object>(a: Atom<T>) =>
  atom(
    (get) => get(a),
    () => {},
  );

export const composedToEnhancer = <
  const TKey extends string | undefined = undefined,
  TComposed extends ComposableAtom = ComposableAtom,
  TParameterComposed extends object = InferParameter<TComposed>,
  TStateComposed extends object = InferState<TComposed>,
>({
  composed,
  keyString,
}: {
  composed: ComposableAtom<TStateComposed, TParameterComposed>;
  keyString?: TKey | undefined;
}) => {
  const enhancer: AtomEnhancer<
    Partial<object>,
    TParameterComposed,
    TKey extends string ? Record<TKey, TStateComposed> : TStateComposed
  > = {
    read: ({ last }) => {
      type Enhanced = TKey extends string
        ? Record<TKey, TStateComposed>
        : TStateComposed;
      if (keyString) {
        return atom((get) => ({
          ...last,
          [keyString as string]: get(composed),
        })) as Atom<Enhanced>;
      } else {
        return atom((get) => ({
          ...last,
          ...get(composed),
        })) as Atom<Enhanced>;
      }
    },
    write: ({ stateHelper: { set }, update }) => {
      set(composed, update);
      return { shouldAbortNextSetter: false };
    },
  };
  return enhancer;
};
