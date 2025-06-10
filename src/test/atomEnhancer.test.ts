import { atom } from "jotai";
import { createStore } from "jotai/vanilla";
import { describe, expect, it } from "vitest";
import { atomEnhancer } from "../atomEnhancer";
import { DispatcherAction } from "../types";

describe("atomEnhancer", () => {
  it("should enhance atom with read and write functions", async () => {
    const store = createStore();
    const countAtom = atom(0);
    type Actions = "increment" | "decrement";
    // Create a count enhancer that doubles the value
    const countEnhancerIncrement = atomEnhancer<
      object,
      DispatcherAction<Actions, number>,
      object
    >(
      // Read function - doubles the value
      (get) => ({}),
      // Write function - halves the value before setting
      (get, set, update) => {
        if (update.type === "increment") {
          set(countAtom, get(countAtom) + (update.payload ?? 0));
          return { shouldAbortNextSetter: false };
        }
        return { shouldAbortNextSetter: false };
      },
    );
    const countEnhancerDecrement = atomEnhancer<
      object,
      DispatcherAction<Actions, number>,
      object
    >(
      // Read function - doubles the value
      (get) => ({}),
      // Write function - halves the value before setting
      (get, set, update) => {
        if (update.type === "decrement") {
          set(countAtom, get(countAtom) - (update.payload ?? 0));
          return { shouldAbortNextSetter: false };
        }
        return { shouldAbortNextSetter: false };
      },
    );
    const countEnhancerDerivation = atomEnhancer<
      object,
      DispatcherAction<Actions, number>,
      { count: number }
    >((get) => ({ count: get(countAtom) }));
    const descriptionDerivationEnhancer = atomEnhancer<
      { count: number },
      DispatcherAction<Actions, number>,
      { description: string }
    >((get) => {
      const count = get(countAtom);
      return { description: `Count is ${count}` };
    });
    const enhancedCountAtom = countEnhancerIncrement(
      countEnhancerDecrement(
        countEnhancerDerivation(
          countEnhancerDerivation(descriptionDerivationEnhancer(undefined)),
        ),
      ),
    );
    expect(store.get(enhancedCountAtom)).toEqual({
      count: 0,
      description: "Count is 0",
    });
    await store.set(enhancedCountAtom, { type: "increment", payload: 1 });
    expect(store.get(enhancedCountAtom)).toEqual({
      count: 1,
      description: "Count is 1",
    });
    await store.set(enhancedCountAtom, { type: "decrement", payload: 1 });
    expect(store.get(enhancedCountAtom)).toEqual({
      count: 0,
      description: "Count is 0",
    });
  });
});
