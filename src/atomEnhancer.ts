import { atom } from "jotai";
import { enhanceWith } from "./enhanceWith";
import { AtomEnhancer, AtomEnhancerRead, AtomEnhancerWrite } from "./types";

export const atomEnhancer = <
  TLastState extends object,
  TParameter extends object,
  TResult extends object = object,
>(
  read: AtomEnhancerRead<TLastState, TResult>,
  write?: AtomEnhancerWrite<TLastState, TParameter>,
) => {
  const enhancer: AtomEnhancer<TLastState, TParameter, TResult> = {
    read: ({ last }) => {
      return atom((get) => read(get, { last }));
    },
    write: write
      ? ({ stateHelper: { set, get, last }, update }) =>
          write(get, set, update, { last })
      : undefined,
  };
  return enhanceWith(enhancer);
};
