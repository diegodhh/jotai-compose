import { composedToEnhancer } from "./composedToEnhancer";
import { enhanceWith } from "./enhanceWith";
import { ComposableAtom, InferParameter, InferState } from "./types";

export const toEnhancer = <
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
  return enhanceWith(composedToEnhancer({ composed, keyString }));
};
