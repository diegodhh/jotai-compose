/** @format */

import { Atom, Getter, Setter, WritableAtom } from "jotai";

export type DispatcherAction<T extends string = string, TPayload = unknown> = {
  type: T;
  payload?: TPayload;
};

export type ComposableAtom<
  TState extends object = object,
  TParamter extends object = object,
> = WritableAtom<TState, [update: TParamter], void>;

export type InferParameterFromComposable<T extends ComposableAtom<any, any>> =
  T extends ComposableAtom<any, infer TParameter> ? TParameter : never;

// Utility to infer the TState type from a BaseAtom (WritableAtom)
export type InferState<TAtom> =
  TAtom extends WritableAtom<infer TState, any, any> ? TState : never;
export type InferParameter<TAtom> =
  TAtom extends WritableAtom<any, [update: infer TParamter], any>
    ? TParamter
    : never;

export type ComposableAtomGetter<
  TState extends object,
  TResult extends object = object,
> = (state: TState) => TResult | Atom<TResult>;

type StateTracking<TLastState> = {
  last: TLastState;
};

export type ComposableAtomReaderWithLastState<
  TLastState extends object,
  TResult extends object = object,
> = (state: StateTracking<TLastState>) => TResult | Atom<TResult>;

type AtomHelpers = {
  get: Getter;
  set: Setter;
};

export type ComposableAtomWriterWithLastState<
  TLastState extends object,
  TParameter extends object,
> = (param: {
  stateHelper: StateTracking<TLastState> & AtomHelpers;
  update: TParameter;
}) => { shouldAbortNextSetter?: boolean };

export type AtomEnhancer<
  TLastState extends object,
  TParameter extends object,
  TResult extends object,
> = {
  read?: ComposableAtomReaderWithLastState<TLastState, TResult>;
  write?: ComposableAtomWriterWithLastState<TLastState, TParameter>;
};
