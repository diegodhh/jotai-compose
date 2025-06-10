import { atom, Atom } from "jotai";
import {
  AtomEnhancer,
  ComposableAtom,
  InferParameter,
  InferState,
} from "./types";

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
    write: async ({ stateHelper: { set }, update }) => {
      await set(composed, update);
      return { shouldAbortNextSetter: false };
    },
  };
  return enhancer;
};
