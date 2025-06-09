import { atom } from "jotai";
import { Enhancer, enhanceWith } from "./enhanceWith";
import { AtomEnhancer, AtomEnhancerRead, AtomEnhancerWrite } from "./types";

export function atomEnhancer<
  TLastState extends object,
  TParameter extends object,
  TResult extends object = object,
>(
  read: AtomEnhancerRead<TLastState, TResult>,
  write?: AtomEnhancerWrite<TLastState, TParameter>,
  fallbackEnhancer?: ReturnType<Enhancer<TLastState, TParameter, TResult>>,
) {
  type TLastEnhancer = Parameters<Enhancer<TLastState, TParameter, TResult>>[0];
  const enhancer: AtomEnhancer<TLastState, TParameter, TResult> = {
    read: ({ last }) => {
      return atom((get) => read(get, { last }));
    },
    write: write
      ? ({ stateHelper: { set, get, last }, update }) =>
          write(get, set, update, { last })
      : undefined,
  };
  return (last: TLastEnhancer) => enhanceWith(enhancer)(last, fallbackEnhancer);
}
