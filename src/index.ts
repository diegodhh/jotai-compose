/** @format */

import { Atom, atom } from "jotai";
import {
  ComposableAtom,
  DispatcherAction,
  ExtendStateAndDeriveDecorator,
  InferParameter,
  InferState,
} from "./types";

export function isAtom<T>(value: unknown): value is Atom<T> {
  return typeof value === "object" && value !== null && "read" in value;
}

export type {
  ComposableAtom,
  DispatcherAction,
  ExtendStateAndDeriveDecorator,
  InferParameter,
  InferState,
};

export const extendStateAndDeriveFromDecorator =
  <
    TLastState extends object,
    TParameterExtended extends object = never,
    TResult extends object = never,
  >({
    getter = () => ({}) as TResult,
    setter = () => ({ shouldAbortNextSetter: false }),
  }: ExtendStateAndDeriveDecorator<TLastState, TParameterExtended, TResult>) =>
  <TState extends TLastState, TParameter extends object = never>(
    lastAtom?: ComposableAtom<TState, TParameter>,
  ) => {
    const newAtom = atom(
      (get) => {
        const last = lastAtom ? get(lastAtom) : ({} as TLastState & TState);

        const possibleAtom = getter({
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
          setter({
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

export const composedToDecorator = <
  TComposed extends ComposableAtom = ComposableAtom,
  TKey extends string = string,
  TParameterComposed extends object = InferParameter<TComposed>,
  TStateComposed extends object = InferState<TComposed>,
>({
  composed,
  keyString,
}: {
  composed: ComposableAtom<TStateComposed, TParameterComposed>;
  keyString: TKey;
}) => {
  const decorator: ExtendStateAndDeriveDecorator<
    Partial<object>,
    TParameterComposed,
    Record<TKey, TStateComposed>
  > = {
    getter: ({ last }) => {
      return atom((get) => ({
        ...last,
        [keyString as TKey]: get(composed),
      })) as Atom<Record<TKey, TStateComposed>>;
    },
    setter: ({ stateHelper: { set }, update }) => {
      set(composed, update);
      return { shouldAbortNextSetter: false };
    },
  };
  return decorator;
};
