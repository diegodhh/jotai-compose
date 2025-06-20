import { atom } from "jotai";
import { AtomEnhancer, ComposableAtom } from "./types";
import { isAtom } from "./utils";

export const enhanceWith =
  <
    TLastState extends object,
    TParameterExtended extends object = never,
    TResult extends object = never,
  >({
    read = () => ({}) as TResult,
    write = () => Promise.resolve({ shouldAbortNextSetter: false }),
  }: AtomEnhancer<TLastState, TParameterExtended, TResult>) =>
  <TState extends TLastState, TParameter extends object = never>(
    lastAtom?: ComposableAtom<TState, TParameter>,
    fallbackAtom?: ComposableAtom<any, TParameter>,
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
      async (get, set, update: TParameterExtended | TParameter) => {
        const last = lastAtom ? get(lastAtom) : ({} as TLastState & TState);
        const { shouldAbortNextSetter } =
          (await write({
            stateHelper: {
              last,
              get,
              set,
            },
            update: update as TParameterExtended,
          })) || {};
        if (!shouldAbortNextSetter) {
          if (lastAtom) {
            return set(lastAtom, update as TParameter);
          }
        } else {
          if (fallbackAtom) {
            return set(fallbackAtom, update as TParameter);
          }
        }
        return { shouldAbortNextSetter };
      },
    );
    return newAtom;
  };

export type Enhancer<
  TLastState extends object = object,
  TParameterExtended extends object = object,
  TResult extends object = object,
> = ReturnType<typeof enhanceWith<TLastState, TParameterExtended, TResult>>;
