/** @format */

import { Atom, atom } from "jotai";
import {
  ComposableAtom,
  DispatcherAction,
  ExtendStateAndDeriveDecorator,
} from "./types";

export function isAtom<T>(value: unknown): value is Atom<T> {
  return typeof value === "object" && value !== null && "read" in value;
}

export type { ComposableAtom, DispatcherAction, ExtendStateAndDeriveDecorator };

export const extendStateAndDeriveFromDecorator =
  <
    TLastState extends object,
    TParameterExtended extends object,
    TResult extends object,
  >({
    getter = () => ({}) as TResult,
    setter = () => ({ shouldAbortNextSetter: false }),
  }: ExtendStateAndDeriveDecorator<TLastState, TParameterExtended, TResult>) =>
  <TState extends TLastState, TParameter extends object>(
    lastAtom: ComposableAtom<TState, TParameter>,
  ) => {
    const newAtom = atom(
      (get) => {
        const possibleAtom = getter({
          last: get(lastAtom),
        });
        let notAtom;
        if (isAtom(possibleAtom)) {
          notAtom = get(possibleAtom);
        } else {
          notAtom = possibleAtom;
        }
        return {
          ...(get(lastAtom) as TState),
          ...notAtom,
        };
      },
      (get, set, update: TParameterExtended | TParameter) => {
        const { shouldAbortNextSetter } =
          setter({
            stateHelper: {
              last: get(lastAtom),
              get,
              set,
            },
            update: update as TParameterExtended,
          }) || {};
        if (!shouldAbortNextSetter) {
          set(lastAtom, update as TParameter);
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
