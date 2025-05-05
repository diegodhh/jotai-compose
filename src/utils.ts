import { Atom, atom } from "jotai";

export const ignoreSetterAtom = <T extends object>(a: Atom<T>) =>
  atom(
    (get) => get(a),
    () => {},
  );

export function isAtom<T>(value: unknown): value is Atom<T> {
  return typeof value === "object" && value !== null && "read" in value;
}
